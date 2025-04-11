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
from typing import List, Tuple, Dict, Callable
import hashlib
import cohere
import random

# Initialize Cohere client
co = cohere.ClientV2("UPIh3acjKBRqwu6kn30Ypim4VfqqeO4sXTfnTIvC")
model = "c4ai-aya-vision-32b"

# Configuration
MAX_BROWSER_INSTANCES = 4  # Number of browser instances to run in parallel
MAX_API_CONCURRENCY = 30  # Number of concurrent API calls to Cohere
API_RATE_LIMIT_DELAY = 1  # Delay in seconds to respect API rate limits
MAX_IMAGES_PER_APARTMENT = 50  # Maximum number of images to process per apartment (increased from 30 to 50)


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


def create_browser_instance():
    """Create and configure a new browser instance"""
    options = Options()
    options.headless = True
    options.add_argument("--window-size=1200,1200")  # Set larger window size
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    
    return webdriver.Chrome(options=options)


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
        # Add a small random delay to help avoid rate limit issues
        time.sleep(random.uniform(0.5, 1.5))
        
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
        print(f"Caption generated successfully for {os.path.basename(image_path)}")
        return result
    except Exception as e:
        print(f"Error generating caption: {str(e)}")
        return f"Error: {str(e)}"


def save_image(browser_id: int, driver: webdriver.Chrome, photo_data: Tuple[str, int, str], output_dir: str) -> Dict:
    """Get image from URL and save it to the images directory"""
    photo_url, idx, apartment_id = photo_data
    try:
        print(f"Browser {browser_id}: Fetching image {idx+1} for apartment {apartment_id}")
        
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
            print(f"Browser {browser_id}: Warning: Timed out waiting for image to load: {str(e)}")
        
        # Take the screenshot
        png_bytes = driver.get_screenshot_as_png()
        print(f"Browser {browser_id}: Screenshot size: {len(png_bytes)} bytes")

        # Compress the image
        compressed_bytes = compress_image(png_bytes)
        print(f"Browser {browser_id}: Compressed size: {len(compressed_bytes)} bytes")
        
        # Create filename for the image
        image_hash = hashlib.md5(compressed_bytes).hexdigest()[:8]  # Use first 8 chars of hash
        filename = f"{apartment_id}_{idx+1}_{image_hash}.jpg"
        filepath = os.path.join(output_dir, filename)
        
        # Save the image to file
        with open(filepath, "wb") as f:
            f.write(compressed_bytes)
        
        print(f"Browser {browser_id}: Saved image to {filepath}")
        return {"url": photo_url, "filepath": filepath, "index": idx, "error": None, "apartment_id": apartment_id}
    except Exception as e:
        print(f"Browser {browser_id}: Error with photo {idx+1} for apartment {apartment_id}: {str(e)}")
        return {"url": photo_url, "filepath": None, "index": idx, "error": str(e), "apartment_id": apartment_id}


def browser_worker(browser_id: int, tasks: List[Tuple], output_dir: str) -> List[Dict]:
    """Worker function for each browser instance"""
    results = []
    driver = create_browser_instance()
    
    try:
        for task in tasks:
            result = save_image(browser_id, driver, task, output_dir)
            results.append(result)
    finally:
        driver.quit()
    
    return results


def download_apartment_images_parallel(apartment: Dict, output_dir: str):
    """Download images for a single apartment using multiple browser instances in parallel"""
    # Create a list of all photo tasks for this apartment
    apartment_id = apartment["id"]
    
    # Limit the number of photos to process
    photos = apartment.get("photos", [])
    if len(photos) > MAX_IMAGES_PER_APARTMENT:
        print(f"Limiting apartment {apartment_id} to {MAX_IMAGES_PER_APARTMENT} images (out of {len(photos)}) using random sampling")
        # Randomly sample images instead of taking the first N
        photos = random.sample(photos, MAX_IMAGES_PER_APARTMENT)
    
    all_tasks = []
    for idx, photo_url in enumerate(photos):
        all_tasks.append((photo_url, idx, apartment_id))
    
    if not all_tasks:
        print(f"No photos found for apartment {apartment_id}")
        return []
    
    # Distribute tasks evenly among browser instances
    browser_tasks = [[] for _ in range(MAX_BROWSER_INSTANCES)]
    for i, task in enumerate(all_tasks):
        browser_idx = i % MAX_BROWSER_INSTANCES
        browser_tasks[browser_idx].append(task)
    
    print(f"Distributing {len(all_tasks)} image tasks among {MAX_BROWSER_INSTANCES} browser instances for apartment {apartment_id}")
    for i, tasks in enumerate(browser_tasks):
        print(f"Browser {i+1} will process {len(tasks)} images")
    
    # Launch browser workers in parallel
    results = []
    with ThreadPoolExecutor(max_workers=MAX_BROWSER_INSTANCES) as executor:
        future_to_browser = {
            executor.submit(browser_worker, i+1, tasks, output_dir): i 
            for i, tasks in enumerate(browser_tasks) if tasks
        }
        
        for future in future_to_browser:
            browser_results = future.result()
            results.extend(browser_results)
    
    # Count successes and failures
    successes = sum(1 for r in results if r["error"] is None)
    failures = sum(1 for r in results if r["error"] is not None)
    
    print(f"\nDownload complete for apartment {apartment_id}: {successes} images saved, {failures} failures")
    return results


def process_image_batch(batch: List[Dict], prompt: str, apartments: Dict):
    """Process a batch of images for caption generation"""
    for image_result in batch:
        image_path = image_result["filepath"]
        apartment_id = image_result["apartment_id"]
        image_url = image_result["url"]
        
        # Implement retry logic for caption generation
        max_retries = 3
        retry_delay = 20  # seconds
        
        for retry_count in range(max_retries):
            try:
                # Generate caption
                caption = generate_text(image_path, prompt)
                
                # Check if we got an error response
                if caption.startswith("Error:"):
                    if "429" in caption and retry_count < max_retries - 1:
                        print(f"Rate limit hit, retrying in {retry_delay} seconds... (Attempt {retry_count + 1}/{max_retries})")
                        time.sleep(retry_delay)
                        # Increase delay for next retry
                        retry_delay *= 2
                        continue
                
                # Initialize apartment entry if it doesn't exist (thread-safe operation)
                if apartment_id not in apartments:
                    apartments[apartment_id] = {
                        "id": apartment_id,
                        "images": []
                    }
                
                # Add image and caption to apartment (thread-safe append)
                apartments[apartment_id]["images"].append({
                    "url": image_url,
                    "description": caption
                })
                
                # Successfully processed this image, break retry loop
                break
            
            except Exception as e:
                print(f"Error processing image {os.path.basename(image_path)}: {str(e)}")
                if retry_count < max_retries - 1:
                    print(f"Retrying in {retry_delay} seconds... (Attempt {retry_count + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    # Add failed caption on last retry
                    if apartment_id not in apartments:
                        apartments[apartment_id] = {"id": apartment_id, "images": []}
                    
                    apartments[apartment_id]["images"].append({
                        "url": image_url,
                        "description": f"Error: Failed after {max_retries} attempts: {str(e)}"
                    })
        
        # Add a delay to respect rate limits between images
        time.sleep(API_RATE_LIMIT_DELAY)
    
    return apartments


def generate_captions_parallel(image_results: List[Dict], prompt: str):
    """Generate captions for all images in parallel and return apartment data"""
    print(f"\nGenerating captions for images...")
    
    # Filter out any failed images
    successful_images = [img for img in image_results if img["error"] is None]
    
    if not successful_images:
        print("No successfully downloaded images found.")
        return {}
    
    print(f"Processing {len(successful_images)} images with parallelism (max {MAX_API_CONCURRENCY} concurrent requests).")
    
    # Group images by apartment ID (shared dictionary for all threads)
    apartments = {}
    
    # Process in smaller batches to avoid overwhelming the API
    batch_size = 1  # Process one image per batch for maximum reliability
    batches = [successful_images[i:i + batch_size] for i in range(0, len(successful_images), batch_size)]
    
    # Use ThreadPoolExecutor with limited concurrency
    with ThreadPoolExecutor(max_workers=MAX_API_CONCURRENCY) as executor:
        futures = []
        
        # Submit all batches to the executor
        for batch in batches:
            future = executor.submit(process_image_batch, batch, prompt, apartments)
            futures.append(future)
        
        # Track progress
        total_futures = len(futures)
        completed = 0
        
        # Process futures as they complete
        for future in futures:
            try:
                # Wait for each future to complete
                future.result()
                completed += 1
                print(f"Progress: {completed}/{total_futures} batches processed")
            except Exception as e:
                print(f"A batch processing task failed with error: {str(e)}")
                # Continue processing other batches
    
    print(f"Caption generation complete: {sum(len(apt['images']) for apt in apartments.values())} images processed")
    return apartments


def delete_apartment_images(output_dir: str, apartment_id: str):
    """Delete all images for a specific apartment"""
    count = 0
    for file in os.listdir(output_dir):
        if file.startswith(f"{apartment_id}_") and file.endswith('.jpg'):
            os.remove(os.path.join(output_dir, file))
            count += 1
    
    print(f"Deleted {count} images for apartment {apartment_id}")


def process_apartment(apartment: Dict, img_output_dir: str, caption_prompt: str):
    """Process a single apartment: download images, generate captions, delete images"""
    print(f"\n{'='*80}\nProcessing apartment {apartment['id']}\n{'='*80}")
    
    # Download images for this apartment
    image_results = download_apartment_images_parallel(apartment, img_output_dir)
    
    if not image_results:
        print(f"No images were downloaded for apartment {apartment['id']}")
        return None
    
    # Generate captions for the images
    apartment_data = generate_captions_parallel(image_results, caption_prompt)
    
    # Delete images for this apartment to save space
    delete_apartment_images(img_output_dir, apartment['id'])
    
    # Return the apartment data
    if apartment['id'] in apartment_data:
        return apartment_data[apartment['id']]
    else:
        return None


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
    try:
        with open("scripts/apartments.json", "r") as file:
            apartment_data = json.load(file)
    except Exception as e:
        print(f"Error reading apartments JSON file: {str(e)}")
        return
    
    # Check if the data is an array or a single object
    if isinstance(apartment_data, dict):
        # Handle case where it's a single apartment object
        apartments_data = [apartment_data]
    else:
        # Handle case where it's an array of apartments
        apartments_data = apartment_data
    
    print(f"Found {len(apartments_data)} apartments to process")
    
    # Process each apartment one at a time
    all_results = []
    caption_prompt = "Describe this apartment image in detail, including the room type, furniture, lighting, colors, and overall ambiance."
    
    json_output_file = os.path.join(json_output_dir, "apartment_image_descriptions.json")
    
    # Try to load existing results if any
    if os.path.exists(json_output_file):
        try:
            with open(json_output_file, 'r') as f:
                all_results = json.load(f)
                print(f"Loaded {len(all_results)} existing results from output file")
        except Exception as e:
            print(f"Error loading existing results: {str(e)}")
    
    # Track processed apartment IDs to avoid duplicates
    processed_ids = {apt["id"] for apt in all_results}
    
    for i, apartment in enumerate(apartments_data):
        apartment_id = apartment.get("id")
        if not apartment_id:
            print(f"Skipping apartment at index {i} - missing ID")
            continue
            
        # Skip already processed apartments
        if apartment_id in processed_ids:
            print(f"Skipping apartment {apartment_id} - already processed")
            continue
            
        print(f"\nProcessing apartment {i+1} of {len(apartments_data)} (ID: {apartment_id})")
        
        try:
            result = process_apartment(apartment, img_output_dir, caption_prompt)
            if result:
                all_results.append(result)
                processed_ids.add(apartment_id)
            
            # Save results after each apartment to avoid data loss
            try:
                with open(json_output_file, 'w') as f:
                    json.dump(all_results, f, indent=2)
                print(f"Updated JSON output with {len(all_results)} apartments so far")
            except Exception as e:
                print(f"Error saving results: {str(e)}")
                
        except Exception as e:
            print(f"Error processing apartment {apartment_id}: {str(e)}")
            # Clean up any images that might be left
            delete_apartment_images(img_output_dir, apartment_id)
            # Continue with next apartment
    
    print(f"\nCompleted processing all apartments")
    print(f"Final results saved to {json_output_file}")
    
    # Print some statistics
    print(f"Successfully processed {len(all_results)} out of {len(apartments_data)} apartments")
    print(f"Total images processed: {sum(len(apt['images']) for apt in all_results)}")
    
    return all_results


if __name__ == "__main__":
    main() 