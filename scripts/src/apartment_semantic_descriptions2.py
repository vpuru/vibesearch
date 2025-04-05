import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import base64
import requests
import time
from pathlib import Path
import random
from PIL import Image
import io
from concurrent.futures import ThreadPoolExecutor
from typing import List, Tuple, Dict
import cohere
import hashlib

co = cohere.ClientV2("8RFd1N6B0ldcVehSI46BcMjoxeAT4ybTExxaSjgy")


def compress_image(image_bytes: bytes, max_size: int = 800) -> bytes:
    """Compress image while maintaining aspect ratio and converting to JPEG"""
    image = Image.open(io.BytesIO(image_bytes))

    # Convert to RGB if necessary (in case of PNG with transparency)
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    # Calculate new dimensions maintaining aspect ratio
    ratio = min(max_size / image.width, max_size / image.height)
    if ratio < 1:  # Only resize if image is larger than max_size
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.Resampling.LANCZOS)

    # Save as JPEG with optimized quality
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()


def get_image_as_base64(driver: webdriver.Chrome, photo_data: Tuple[str, int]) -> Dict:
    """Get compressed base64 image data for a single photo"""
    photo_url, idx = photo_data
    try:
        print(f"Fetching image from URL: {photo_url}")
        driver.get(photo_url)
        png_bytes = driver.get_screenshot_as_png()
        print(f"Screenshot size: {len(png_bytes)} bytes")

        # Compress the image
        compressed_bytes = compress_image(png_bytes)
        print(f"Compressed size: {len(compressed_bytes)} bytes")
        base64_image = base64.b64encode(compressed_bytes).decode("utf-8")
        
        # Save a hash of the base64 string to compare later
        image_hash = hashlib.md5(base64_image.encode()).hexdigest()
        print(f"Image {idx} hash: {image_hash}")

        return {"url": photo_url, "base64": base64_image, "index": idx, "error": None, "hash": image_hash}
    except Exception as e:
        return {"url": photo_url, "base64": None, "index": idx, "error": str(e), "hash": None}


def get_ollama_description(base64_image: str, prompt: str) -> str:
    """Get description from Ollama for a single image"""
    # Generate hash to track uniqueness
    image_hash = hashlib.md5(base64_image.encode()).hexdigest()
    print(f"Sending image with hash: {image_hash}")
    print(f"Prompt used: '{prompt}'")
    
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "llava",
        "prompt": prompt,
        "stream": False,
        "images": [base64_image],
    }

    # Log the full payload structure (but not the full base64)
    debug_payload = payload.copy()
    if len(base64_image) > 100:
        debug_payload["images"] = [f"{base64_image[:50]}...{base64_image[-50:]} (length: {len(base64_image)})"]
    print(f"Payload structure: {debug_payload}")

    response = requests.post(url, json=payload)
    if response.status_code == 200:
        response_data = response.json()
        print(f"Response received - length: {len(response_data['response'])}")
        return response_data["response"]
    else:
        print(f"Error response: {response.text}")
        return f"Error: {response.status_code}"


def write_apartment_data(output_file: str, apartment_data: Dict) -> None:
    """Write a single apartment's data to the file"""
    with open(output_file, "a") as f:
        json.dump(apartment_data, f)
        f.write("\n")


def preload_images(
    driver: webdriver.Chrome, photos: List[str], max_photos: int = 15
) -> List[Dict]:
    """Preload and compress a sample of images in parallel"""
    if len(photos) > max_photos:
        # Randomly sample max_photos from the array
        sampled_indices = random.sample(range(len(photos)), max_photos)
        sampled_photos = [(photos[i], i) for i in sorted(sampled_indices)]
    else:
        sampled_photos = [(photo, i) for i, photo in enumerate(photos)]

    # Process images in parallel
    with ThreadPoolExecutor(max_workers=4) as executor:
        return list(
            executor.map(lambda x: get_image_as_base64(driver, x), sampled_photos)
        )


# Read the prompt
with open("scripts/prompt.txt", "r") as f:
    prompt = f.read().strip()

# Read the JSON file
with open("scripts/apartments_sample.json", "r") as file:
    apartments_data = json.load(file)

# Setup Chrome options
options = Options()
options.headless = True
driver = webdriver.Chrome(options=options)

# Setup output file
output_path = "scripts/apartment_descriptions.jsonl"
# Clear the file if it exists
open(output_path, "w").close()

try:
    # Run a determinism test at the start with a sample image
    if len(apartments_data) > 0 and len(apartments_data[0]["photos"]) > 0:
        print("\nRunning initial determinism test...")
        # Get a sample image
        sample_photo_url = apartments_data[0]["photos"][0]
        driver.get(sample_photo_url)
        png_bytes = driver.get_screenshot_as_png()
        compressed_bytes = compress_image(png_bytes)
        sample_base64 = base64.b64encode(compressed_bytes).decode("utf-8")
        
        # Run the test
        test_ollama_determinism(sample_base64, prompt)
        
        # Also test with the exact same base64 string used twice in sequence
        print("\nTesting if sequential calls with identical base64 produce different results...")
        first_response = get_ollama_description(sample_base64, prompt)
        print("First call completed. Calling again with identical input...")
        second_response = get_ollama_description(sample_base64, prompt)
        
        print("\nComparing sequential responses to identical base64 input:")
        if first_response == second_response:
            print("RESULT: Identical responses for identical inputs in sequence")
        else:
            print("RESULT: Different responses despite identical inputs!")
            print(f"First: {first_response[:150]}...")
            print(f"Second: {second_response[:150]}...")
    
    # Track all image hashes to detect duplicates
    all_image_hashes = {}
    
    # Process each apartment's photos
    for apartment_idx, apartment in enumerate(apartments_data, 1):
        apartment_id = apartment["id"]
        print(f"\nProcessing apartment {apartment_id} ({apartment_idx}/{len(apartments_data)}):")

        # Preload and compress images in parallel
        print("Preloading images...")
        preloaded_images = preload_images(driver, apartment["photos"])

        apartment_result = {"id": apartment_id, "photos": []}

        # Track hashes within this apartment
        this_apartment_hashes = {}

        # Process preloaded images with Ollama
        for img_data in preloaded_images:
            if img_data["error"] is None:
                img_hash = img_data["hash"]
                
                # Check if this hash has been seen before
                if img_hash in all_image_hashes:
                    print(f"WARNING: Duplicate image hash detected!")
                    print(f"Current: Photo {img_data['index'] + 1} from apartment {apartment_id}")
                    print(f"Previous: {all_image_hashes[img_hash]}")
                
                # Record this hash
                all_image_hashes[img_hash] = f"Photo {img_data['index'] + 1} from apartment {apartment_id}"
                
                # Check if this hash was already seen in this apartment
                if img_hash in this_apartment_hashes:
                    print(f"WARNING: Duplicate image hash within apartment {apartment_id}!")
                    print(f"Current: Photo {img_data['index'] + 1}, Previous: {this_apartment_hashes[img_hash]}")
                
                this_apartment_hashes[img_hash] = f"Photo {img_data['index'] + 1}"
                
                print(f"Getting description for photo {img_data['index'] + 1}...")
                description = get_ollama_description(img_data["base64"], prompt)
                apartment_result["photos"].append(
                    {"url": img_data["url"], "description": description, "hash": img_hash}
                )
            else:
                print(f"Error with photo {img_data['index'] + 1}: {img_data['error']}")
                apartment_result["photos"].append(
                    {
                        "url": img_data["url"],
                        "description": f"Error: {img_data['error']}",
                        "hash": None
                    }
                )

        # Write this apartment's data to disk immediately
        write_apartment_data(output_path, apartment_result)
        print(f"Saved data for apartment {apartment_id}")

finally:
    driver.quit()

print(f"\nAll results saved to {output_path}")


# Helper function to read the JSONL file (for verification or future use)
def read_jsonl(file_path: str) -> List[Dict]:
    data = []
    with open(file_path, "r") as f:
        for line in f:
            data.append(json.loads(line))
    return data


# Add debug function to test Ollama determinism
def test_ollama_determinism(base64_image: str, prompt: str, num_tests: int = 3):
    """Test if Ollama gives different responses for identical inputs"""
    print(f"\n--- TESTING OLLAMA DETERMINISM WITH IDENTICAL INPUTS ---")
    print(f"Using prompt: '{prompt}'")
    print(f"Image hash: {hashlib.md5(base64_image.encode()).hexdigest()}")
    
    responses = []
    for i in range(num_tests):
        print(f"Test {i+1}/{num_tests}...")
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "llava",
            "prompt": prompt,
            "stream": False,
            "images": [base64_image],
        }
        
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            response_text = response.json()["response"]
            responses.append(response_text)
            print(f"Response {i+1}: {response_text[:100]}...")
        else:
            print(f"Error: {response.status_code}")
            responses.append(f"Error: {response.status_code}")
    
    # Check if all responses are identical
    all_identical = all(r == responses[0] for r in responses)
    print(f"All responses identical: {all_identical}")
    
    if not all_identical:
        print("\nDIFFERENCES DETECTED - Ollama is non-deterministic!")
        for i, response in enumerate(responses):
            print(f"Response {i+1} (length {len(response)}): {response[:150]}...")
    else:
        print("\nNo differences detected - Ollama appears deterministic with identical inputs.")
    
    print("--- END DETERMINISM TEST ---\n")
    return responses
