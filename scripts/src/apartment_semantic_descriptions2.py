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
import numpy as np


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
        driver.get(photo_url)
        png_bytes = driver.get_screenshot_as_png()

        # Compress the image
        compressed_bytes = compress_image(png_bytes)
        base64_image = base64.b64encode(compressed_bytes).decode("utf-8")

        return {"url": photo_url, "base64": base64_image, "index": idx, "error": None}
    except Exception as e:
        return {"url": photo_url, "base64": None, "index": idx, "error": str(e)}


def get_ollama_description(base64_image: str, prompt: str) -> str:
    """Get description from Ollama for a single image"""
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "llava",
        "prompt": prompt,
        "stream": False,
        "images": [base64_image],
    }

    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()["response"]
    else:
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
with open("scripts/apartments.json", "r") as file:
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
    # Process each apartment's photos
    for apartment_idx, apartment in enumerate(apartments_data, 1):
        apartment_id = apartment["id"]
        print(
            f"\nProcessing apartment {apartment_id} ({apartment_idx}/{len(apartments_data)}):"
        )

        # Preload and compress images in parallel
        print("Preloading images...")
        preloaded_images = preload_images(driver, apartment["photos"])

        apartment_result = {"id": apartment_id, "photos": []}

        # Process preloaded images with Ollama
        for img_data in preloaded_images:
            if img_data["error"] is None:
                print(f"Getting description for photo {img_data['index'] + 1}...")
                description = get_ollama_description(img_data["base64"], prompt)
                apartment_result["photos"].append(
                    {"url": img_data["url"], "description": description}
                )
            else:
                print(f"Error with photo {img_data['index'] + 1}: {img_data['error']}")
                apartment_result["photos"].append(
                    {
                        "url": img_data["url"],
                        "description": f"Error: {img_data['error']}",
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
