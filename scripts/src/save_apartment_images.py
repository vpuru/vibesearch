import json
import os
import base64
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from pathlib import Path
from PIL import Image
import io
from concurrent.futures import ThreadPoolExecutor
from typing import List, Tuple, Dict
import hashlib
import cohere

# Initialize Cohere client
co = cohere.ClientV2("8RFd1N6B0ldcVehSI46BcMjoxeAT4ybTExxaSjgy")  # Replace with your actual API key if needed
model = "c4ai-aya-vision-32b"


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


def generate_text(image_path, message):
    """
    Generate text responses from Aya Vision model based on an image and text prompt.

    Args:
        image_path (str): Path to the image file
        message (str): Text prompt to send with the image

    Returns:
        str: The model's response
    """
    print(f"Generating caption for {image_path}...")

    # Define an image in Base64-encoded format
    with open(image_path, "rb") as img_file:
        base64_image_url = f"data:image/jpeg;base64,{base64.b64encode(img_file.read()).decode('utf-8')}"

    try:
        # Make an API call to the Cohere Chat endpoint, passing the user message and image
        response = co.chat(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": message},
                        {"type": "image_url", "image_url": {"url": base64_image_url}},
                    ],
                }
            ],
        )

        # Return the response text
        result = response.message.content[0].text
        print(f"Caption generated successfully")
        return result
    except Exception as e:
        print(f"Error generating caption: {str(e)}")
        return f"Error: {str(e)}"


def save_image(driver: webdriver.Chrome, photo_data: Tuple[str, int, str], output_dir: str) -> Dict:
    """Get image from URL and save it to the images directory"""
    photo_url, idx, apartment_id = photo_data
    try:
        print(f"Fetching image {idx+1} for apartment {apartment_id} from URL: {photo_url}")
        
        # Navigate to the image URL directly
        driver.get(photo_url)
        
        # Wait for the image to load
        try:
            # Set a reasonable timeout
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "img"))
            )
            # Additional wait for image to render
            time.sleep(2)
        except Exception as e:
            print(f"Warning: Timed out waiting for image to load: {str(e)}")
        
        # Take the screenshot
        png_bytes = driver.get_screenshot_as_png()
        print(f"Screenshot size: {len(png_bytes)} bytes")

        # Compress the image
        compressed_bytes = compress_image(png_bytes)
        print(f"Compressed size: {len(compressed_bytes)} bytes")
        
        # Create filename for the image
        image_hash = hashlib.md5(compressed_bytes).hexdigest()[:8]  # Use first 8 chars of hash
        filename = f"{apartment_id}_{idx+1}_{image_hash}.jpg"
        filepath = os.path.join(output_dir, filename)
        
        # Save the image to file
        with open(filepath, "wb") as f:
            f.write(compressed_bytes)
        
        print(f"Saved image to {filepath}")
        return {"url": photo_url, "filepath": filepath, "index": idx, "error": None, "apartment_id": apartment_id}
    except Exception as e:
        print(f"Error with photo {idx+1} for apartment {apartment_id}: {str(e)}")
        return {"url": photo_url, "filepath": None, "index": idx, "error": str(e), "apartment_id": apartment_id}


def download_apartment_images(apartments_data: List[Dict], output_dir: str):
    """Download images for all apartments in parallel"""
    # Setup Chrome options
    options = Options()
    options.headless = True
    options.add_argument("--window-size=1200,1200")  # Set larger window size
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    
    driver = webdriver.Chrome(options=options)
    
    try:
        # Process each photo sequentially to prevent same-image issues
        results = []
        for apartment in apartments_data:
            apartment_id = apartment["id"]
            for idx, photo_url in enumerate(apartment["photos"]):
                result = save_image(driver, (photo_url, idx, apartment_id), output_dir)
                results.append(result)
        
        # Count successes and failures
        successes = sum(1 for r in results if r["error"] is None)
        failures = sum(1 for r in results if r["error"] is not None)
        
        print(f"\nDownload complete: {successes} images saved, {failures} failures")
        return results
    finally:
        driver.quit()


def generate_captions_for_images(image_results: List[Dict], prompt: str, output_file: str):
    """Generate captions for all images and save to JSON file"""
    print(f"\nGenerating captions for images...")
    
    # Filter out any failed images
    successful_images = [img for img in image_results if img["error"] is None]
    
    if not successful_images:
        print("No successfully downloaded images found.")
        return
    
    print(f"Processing {len(successful_images)} images.")
    
    # Group images by apartment ID
    apartments = {}
    
    # Process each image
    for image_result in successful_images:
        image_path = image_result["filepath"]
        apartment_id = image_result["apartment_id"]
        image_url = image_result["url"]
        
        print(f"\n--- Caption for {os.path.basename(image_path)} ---")
        caption = generate_text(image_path, prompt)
        print(caption)
        print("-----------------------------------")
        
        # Initialize apartment entry if it doesn't exist
        if apartment_id not in apartments:
            apartments[apartment_id] = {
                "id": apartment_id,
                "images": []
            }
        
        # Add image and caption to apartment
        apartments[apartment_id]["images"].append({
            "url": image_url,
            "description": caption
        })
    
    # Convert to array format
    apartments_array = list(apartments.values())
    
    # Save to JSON file
    with open(output_file, 'w') as f:
        json.dump(apartments_array, f, indent=2)
    
    print(f"\nSaved image descriptions to {output_file}")


def main():
    # Define directories
    img_output_dir = "scripts/images"
    json_output_dir = "scripts/output"
    
    # Make sure directories exist
    os.makedirs(img_output_dir, exist_ok=True)
    os.makedirs(json_output_dir, exist_ok=True)
    
    # Clear existing images
    for file in os.listdir(img_output_dir):
        if file.endswith('.jpg'):
            os.remove(os.path.join(img_output_dir, file))
    
    # Read the JSON file
    with open("scripts/apartments_sample.json", "r") as file:
        apartment_data = json.load(file)
    
    # Check if the data is an array or a single object
    if isinstance(apartment_data, dict):
        # Handle case where it's a single apartment object
        apartments_data = [apartment_data]
    else:
        # Handle case where it's an array of apartments
        apartments_data = apartment_data
    
    print(f"Found {len(apartments_data)} apartments with a total of {sum(len(apt.get('photos', [])) for apt in apartments_data)} photos")
    
    # Download the images
    image_results = download_apartment_images(apartments_data, img_output_dir)
    
    # Set output JSON file
    json_output_file = os.path.join(json_output_dir, "apartment_image_descriptions.json")
    
    # Generate captions and save to JSON
    caption_prompt = "Describe this apartment image in detail, including the room type, furniture, lighting, colors, and overall ambiance."
    generate_captions_for_images(image_results, caption_prompt, json_output_file)


if __name__ == "__main__":
    main() 