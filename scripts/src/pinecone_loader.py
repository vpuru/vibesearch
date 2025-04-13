import json
import os
import time
import re
from datetime import datetime
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

# Check if required API key is set
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in environment variables")

# Initialize sentence-transformer model
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Initialize Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)

# Constants
IMAGE_DESCRIPTIONS_FILE = "output/apartment_image_descriptions.json"
IMAGE_DESCRIPTIONS_SAMPLE_FILE = "output/apartment_image_descriptions_sample.json"
APARTMENTS_FILE = "apartments.json"
INDEX_NAME = "apartment-images-search"
EMBEDDING_DIMENSION = 384  # Dimension for all-MiniLM-L6-v2


def clean_url_for_key(url):
    """Make a URL suitable for use as a key by removing unsafe characters"""
    # Extract just the filename part of the URL as base for the key
    filename = url.split('/')[-1]
    # Remove any unsafe characters and replace with underscores
    key = re.sub(r'[^\w\-\.]', '_', filename)
    # Add a prefix to make it easier to identify
    return f"img_{key}"


def create_embedding(text):
    """Create an embedding for the given text using sentence-transformers"""
    try:
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"Error creating embedding: {e}")
        return None


def prepare_apartment_images_data(image_descriptions):
    """Prepare individual image data for Pinecone upsert"""
    vectors = []
    skipped_count = 0
    processed_count = 0

    for apartment in tqdm(image_descriptions, desc="Processing apartments"):
        apartment_id = apartment["id"]
        print(f"\nProcessing apartment {apartment_id} with {len(apartment['images'])} images")
        
        # Process each image individually
        for img in apartment["images"]:
            img_url = img.get("url", "")
            img_description = img.get("description", "")
            
            if not img_url or not img_description:
                print(f"Warning: Missing URL or description for an image in apartment {apartment_id}")
                skipped_count += 1
                continue
            
            # Create a unique key for this image
            img_key = clean_url_for_key(img_url)
            
            # Create embedding for the image description
            embedding = create_embedding(img_description)
            
            if embedding is None:
                print(f"Warning: Failed to create embedding for image {img_key}")
                skipped_count += 1
                continue
            
            # Create metadata for the image
            metadata = {
                "apartment_id": apartment_id,
                "original_url": img_url,
                "description": img_description,
            }
            
            # Create vector object
            vector = {
                "id": img_key,
                "values": embedding,
                "metadata": metadata
            }
            
            # Debug information
            print(f"Created vector for image {img_key} from apartment {apartment_id}")
            print(f"Vector dimension: {len(vector['values'])}")
            
            vectors.append(vector)
            processed_count += 1

    print(f"\nProcessing complete:")
    print(f"Total images processed: {processed_count}")
    print(f"Total images skipped: {skipped_count}")
    print(f"Total vectors created: {len(vectors)}")
    
    return vectors


def init_pinecone_index():
    """Initialize Pinecone index"""
    # Check if index exists
    existing_indexes = pc.list_indexes().names()
    print(f"Available indexes: {existing_indexes}")

    if INDEX_NAME in existing_indexes:
        print(f"Index '{INDEX_NAME}' already exists")
        # Delete existing index for fresh start
        print(f"Deleting existing index '{INDEX_NAME}'")
        pc.delete_index(INDEX_NAME)
        print(f"Waiting after deletion...")
        time.sleep(10)

    print(f"Creating new index: '{INDEX_NAME}'")
    pc.create_index(
        name=INDEX_NAME,
        dimension=EMBEDDING_DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

    # Connect to the index
    index = pc.Index(INDEX_NAME)
    print(f"Connected to index: {index}")

    return index


def upsert_to_pinecone(index, vectors, batch_size=100):
    """Upsert vectors to Pinecone in batches"""
    total_vectors = len(vectors)
    total_batches = (total_vectors + batch_size - 1) // batch_size

    print(f"\nUpserting vectors to Pinecone:")
    print(f"Total vectors to upsert: {total_vectors}")
    print(f"Batch size: {batch_size}")
    print(f"Total batches: {total_batches}")

    for i in tqdm(
        range(0, total_vectors, batch_size),
        desc="Upserting to Pinecone",
        total=total_batches,
    ):
        batch = vectors[i : i + batch_size]
        batch_size_actual = len(batch)
        print(
            f"\nProcessing batch {i//batch_size + 1}/{total_batches} with {batch_size_actual} vectors"
        )

        try:
            response = index.upsert(vectors=batch)
            print(f"Upsert response: {response}")
            # Small delay to avoid rate limiting
            time.sleep(0.5)
        except Exception as e:
            print(f"Error upserting batch {i//batch_size + 1}/{total_batches}: {e}")
            # Print the first vector that might be causing issues
            if batch:
                print(f"First vector ID in batch: {batch[0]['id']}")
                print(f"Vector dimension: {len(batch[0]['values'])}")
                print(f"Metadata keys: {list(batch[0]['metadata'].keys())}")


def main():
    start_time = datetime.now()
    print(f"Starting apartment image data import at {start_time}")

    # Load image descriptions from the sample file for understanding structure
    # In production, we'll use the full file
    try:
        print(f"\nLoading image descriptions")
        # For testing, we can use the sample file
        # with open(IMAGE_DESCRIPTIONS_SAMPLE_FILE, "r") as file:
        # For production, use the full file
        with open(IMAGE_DESCRIPTIONS_FILE, "r") as file:
            image_descriptions = json.load(file)
        print(f"Loaded data for {len(image_descriptions)} apartments")
    except Exception as e:
        print(f"Error loading image descriptions: {e}")
        return

    # Initialize Pinecone
    try:
        index = init_pinecone_index()
    except Exception as e:
        print(f"Error initializing Pinecone index: {e}")
        return

    # Prepare image data for Pinecone
    vectors = prepare_apartment_images_data(image_descriptions)
    if not vectors:
        print("No vectors were created. Exiting.")
        return

    # Upsert to Pinecone
    upsert_to_pinecone(index, vectors)

    # Print stats
    try:
        stats = index.describe_index_stats()
        print(f"\nIndex stats after import: {stats}")
    except Exception as e:
        print(f"Error getting index stats: {e}")

    end_time = datetime.now()
    duration = end_time - start_time
    print(f"\nImport completed at {end_time}")
    print(f"Total duration: {duration}")


if __name__ == "__main__":
    main()