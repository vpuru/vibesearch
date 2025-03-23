import json
import os
from typing import Dict, Any, List
import re
from dotenv import load_dotenv
import time
from datetime import datetime
from openai import AsyncOpenAI
import asyncio
from tqdm import tqdm
import aiohttp
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Get x.ai API key
XAI_API_KEY = os.getenv("XAI_API_KEY")
if not XAI_API_KEY:
    raise ValueError("XAI_API_KEY not found in environment variables")

# Ensure output directory exists
OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Configure rate limiting
RATE_LIMIT = 10  # requests per second
BATCH_SIZE = 50  # number of concurrent requests


class RateLimiter:
    def __init__(self, rate_limit):
        self.rate_limit = rate_limit
        self.tokens = rate_limit
        self.last_update = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            now = time.monotonic()
            time_passed = now - self.last_update
            self.tokens = min(
                self.rate_limit, self.tokens + time_passed * self.rate_limit
            )
            self.last_update = now

            if self.tokens < 1:
                sleep_time = (1 - self.tokens) / self.rate_limit
                await asyncio.sleep(sleep_time)
                self.tokens = 0
                self.last_update = time.monotonic()
            else:
                self.tokens -= 1


@asynccontextmanager
async def get_async_client():
    async with AsyncOpenAI(
        api_key=XAI_API_KEY,
        base_url="https://api.x.ai/v1",
    ) as client:
        yield client


def read_prompt() -> str:
    """Read the prompt template from prompt.txt"""
    with open("prompt.txt", "r") as f:
        return f.read()


def extract_number(s: str) -> int:
    """Extract the first number from a string, return 0 if no number found"""
    if not s:
        return 0
    matches = re.findall(r"\d+", s)
    return int(matches[0]) if matches else 0


def extract_sqft(sqft_str: str) -> tuple[int, int]:
    """Extract min and max sqft from string like '500 - 800 sq ft' or '500 sq ft'"""
    if not sqft_str:
        return (0, 0)
    numbers = re.findall(r"\d+", sqft_str)
    if len(numbers) >= 2:
        return (int(numbers[0]), int(numbers[1]))
    elif len(numbers) == 1:
        return (int(numbers[0]), int(numbers[0]))
    return (0, 0)


def extract_amenities(amenities_data: List[Dict[str, Any]]) -> List[str]:
    """Extract amenities from the complex amenities structure"""
    all_amenities = []
    for amenity_group in amenities_data:
        if isinstance(amenity_group, dict):
            values = amenity_group.get("value", [])
            if isinstance(values, list):
                all_amenities.extend(values)
            elif isinstance(values, str):
                all_amenities.append(values)
        elif isinstance(amenity_group, str):
            all_amenities.append(amenity_group)
    return list(set(all_amenities))  # Remove duplicates


async def generate_semantic_description_with_grok(
    client: AsyncOpenAI,
    property_data: Dict[str, Any],
    prompt: str,
    rate_limiter: RateLimiter,
) -> tuple[str, str, bool]:
    """Generate semantic description using x.ai's Grok API"""
    property_id = property_data.get("id", "unknown")

    try:
        await rate_limiter.acquire()

        # Convert property data to formatted string
        input_text = (
            f"{prompt}\n\nInput Property Data:\n{json.dumps(property_data, indent=2)}"
        )

        completion = await client.chat.completions.create(
            model="grok-2-latest",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that generates semantic search descriptions for apartment listings. Follow the prompt format exactly, including all sections. Your output MUST include both 'Section 1: Location and Points of Interest (POI) Information' and 'Section 2: Practical Information'.",
                },
                {"role": "user", "content": input_text},
            ],
        )

        description = completion.choices[0].message.content.strip()

        # Verify that both sections are present
        if "Section 1:" not in description or "Section 2:" not in description:
            return (
                "",
                f"Response missing required sections for property {property_id}",
                False,
            )

        if not description:
            return "", f"Empty response from Grok API for property {property_id}", False

        return description, "", True

    except Exception as e:
        return "", f"Error calling Grok API for property {property_id}: {str(e)}", False


def extract_relevant_fields(property_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract relevant scalar fields from the property data for database filtering"""
    # Extract beds information
    beds_str = property_data.get("beds", "")
    is_studio = "studio" in beds_str.lower()
    min_beds = 0 if is_studio else extract_number(beds_str)
    max_beds = min_beds
    if "-" in beds_str:
        max_beds = extract_number(beds_str.split("-")[1])

    # Extract baths
    baths_str = property_data.get("baths", "")
    min_baths = extract_number(baths_str)
    max_baths = min_baths
    if "-" in baths_str:
        max_baths = extract_number(baths_str.split("-")[1])

    # Extract square footage
    sqft_min, sqft_max = extract_sqft(property_data.get("sqft", ""))

    # Extract rent
    rent_data = property_data.get("rent", {})
    min_rent = rent_data.get("min", 0)
    max_rent = rent_data.get("max", 0)

    # Location data
    coords = property_data.get("coordinates", {})

    return {
        "id": property_data.get("id", ""),
        "property_name": property_data.get("propertyName", ""),
        "url": property_data.get("url", ""),
        "latitude": coords.get("latitude", 0),
        "longitude": coords.get("longitude", 0),
        "postal_code": property_data.get("location", {}).get("postalCode", ""),
        "min_rent": min_rent,
        "max_rent": max_rent,
        "min_beds": min_beds,
        "max_beds": max_beds,
        "min_baths": min_baths,
        "max_baths": max_baths,
        "min_sqft": sqft_min,
        "max_sqft": sqft_max,
        "is_studio": is_studio,
        "has_available_units": bool(property_data.get("models", [])),
        "last_updated": property_data.get("lastUpdated", ""),
        "state": property_data.get("location", {}).get("state", ""),
        "city": property_data.get("location", {}).get("city", ""),
    }


async def process_property_batch(
    client: AsyncOpenAI,
    properties: List[Dict[str, Any]],
    prompt: str,
    rate_limiter: RateLimiter,
    pbar: tqdm,
) -> List[Dict[str, Any]]:
    """Process a batch of properties concurrently"""
    # Create all tasks first
    tasks = []
    property_map = {}  # Map to keep track of property data for each task

    for prop in properties:
        # Extract scalar fields first
        relevant_data = extract_relevant_fields(prop)

        # Create task for semantic description
        task = generate_semantic_description_with_grok(
            client, prop, prompt, rate_limiter
        )
        tasks.append(task)
        property_map[id(task)] = relevant_data

    # Wait for all tasks to complete simultaneously
    completed_tasks = await asyncio.gather(*tasks, return_exceptions=True)

    # Process results
    results = []
    for task, result in zip(tasks, completed_tasks):
        property_data = property_map[id(task)]

        if isinstance(result, Exception):
            print(f"Error processing property {property_data['id']}: {str(result)}")
            pbar.update(1)
            continue

        description, error, success = result
        if not success:
            print(error)
            pbar.update(1)
            continue

        # Add semantic description to property data
        property_data["semantic_description"] = description
        results.append(property_data)
        pbar.update(1)

    return results


async def process_apartments_async(input_file: str):
    """Process apartments data asynchronously"""
    # Read input data
    with open(input_file, "r") as f:
        properties = json.load(f)

    # Read prompt template
    prompt = read_prompt()

    # Create rate limiter
    rate_limiter = RateLimiter(RATE_LIMIT)

    # Create batches
    num_properties = len(properties)
    batches = [
        properties[i : i + BATCH_SIZE] for i in range(0, num_properties, BATCH_SIZE)
    ]

    # Process all properties with progress bar
    all_results = []
    with tqdm(total=num_properties, desc="Processing properties") as pbar:
        async with get_async_client() as client:
            # Create tasks for all batches
            batch_tasks = [
                process_property_batch(client, batch, prompt, rate_limiter, pbar)
                for batch in batches
            ]

            # Wait for all batches to complete
            batch_results = await asyncio.gather(*batch_tasks)

            # Combine results from all batches
            for results in batch_results:
                all_results.extend(results)

    # Generate output filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"searchable_apartments_{timestamp}.json"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    # Write results to file
    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=2)

    # Create symlink to latest output
    latest_link = os.path.join(OUTPUT_DIR, "latest_output.json")
    if os.path.exists(latest_link):
        os.remove(latest_link)
    os.symlink(output_filename, latest_link)

    print(f"\nProcessed {len(all_results)} properties successfully")
    print(f"Output saved to {output_path}")
    print(f"Latest output symlinked to {latest_link}")


def main():
    """Main entry point"""
    input_file = "apartments.json"
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found")
        return

    asyncio.run(process_apartments_async(input_file))


if __name__ == "__main__":
    main()
