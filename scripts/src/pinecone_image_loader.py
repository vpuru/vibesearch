import json
import os
import time
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
INPUT_FILE = "apartment_descriptions.jsonl"  # JSONL file in scripts directory
INDEX_NAME = "apartments-search"
NAMESPACE = "images"  # Separate namespace for image embeddings
EMBEDDING_DIMENSION = 384  # Dimension for all-MiniLM-L6-v2
MAX_METADATA_SIZE = 40000  # Pinecone's limit is 40KB


def create_embedding(text):
    """Create an embedding for the given text using sentence-transformers"""
    try:
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"Error creating embedding: {e}")
        return None


def prepare_image_data(apartments):
    """Prepare image data for Pinecone upsert"""
    vectors = []

    for apartment in tqdm(apartments, desc="Creating image embeddings"):
        property_id = apartment["id"]

        for idx, photo in enumerate(apartment.get("photos", [])):
            description = photo.get("description", "").strip()
            if not description:
                continue

            # Create embedding for the image description
            embedding = create_embedding(description)
            if embedding is None:
                print(
                    f"Warning: Failed to create embedding for image {idx} of apartment {property_id}"
                )
                continue

            # Create metadata
            metadata = {
                "property_id": property_id,
                "description": description[
                    : MAX_METADATA_SIZE - 100
                ],  # Leave room for other metadata
                "image_url": photo.get("url", ""),
                "image_index": idx,
            }

            # Create vector object with a unique ID combining property ID and image index
            vector_id = f"{property_id}_{idx}"
            vector = {"id": vector_id, "values": embedding, "metadata": metadata}

            # Debug information
            print(f"Vector ID: {vector_id}")
            print(f"Property ID: {property_id}")
            print(f"Image index: {idx}")
            print(f"Description length: {len(description)} chars")
            print(f"Vector dimension: {len(embedding)}")
            print(f"First 5 values: {embedding[:5]}")

            vectors.append(vector)

    return vectors


def init_pinecone_index():
    """Initialize Pinecone index"""
    # Check if index exists
    existing_indexes = pc.list_indexes().names()

    print(f"Available indexes: {existing_indexes}")

    if INDEX_NAME in existing_indexes:
        print(f"Index '{INDEX_NAME}' already exists")
        return pc.Index(INDEX_NAME)

    print(f"Creating new index: '{INDEX_NAME}'")
    pc.create_index(
        name=INDEX_NAME,
        dimension=EMBEDDING_DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

    # Connect to the index
    index = pc.Index(INDEX_NAME)
    print(f"Index information: {index}")
    return index


def upsert_to_pinecone(index, vectors, batch_size=100):
    """Upsert vectors to Pinecone in batches"""
    total_vectors = len(vectors)
    total_batches = (total_vectors + batch_size - 1) // batch_size

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
            f"Processing batch {i//batch_size + 1}/{total_batches} with {batch_size_actual} vectors"
        )

        try:
            response = index.upsert(
                vectors=batch, namespace=NAMESPACE  # Use the images namespace
            )
            print(f"Upsert response: {response}")
            # Small delay to avoid rate limiting
            time.sleep(0.5)
        except Exception as e:
            print(f"Error upserting batch {i//batch_size + 1}/{total_batches}: {e}")
            if batch:
                print(f"First vector in failed batch - ID: {batch[0]['id']}")


def load_apartments(file_path):
    """Load data from either JSON or JSONL file"""
    try:
        with open(file_path, "r") as file:
            # Try to load as JSON first
            try:
                content = file.read()
                if content.strip().startswith("["):
                    # If it starts with [, treat as JSON array
                    apartments = json.loads(content)
                    return apartments
            except json.JSONDecodeError:
                pass

            # If JSON loading failed, try JSONL
            file.seek(0)
            apartments = []
            for line in file:
                try:
                    apartment = json.loads(line.strip())
                    apartments.append(apartment)
                except json.JSONDecodeError as e:
                    if line.strip():  # Only print error for non-empty lines
                        print(f"Error parsing line: {e}")
                    continue
            return apartments
    except Exception as e:
        print(f"Error reading file: {e}")
        return []


def main():
    start_time = datetime.now()
    print(f"Starting image data import at {start_time}")

    # Load apartment data
    apartments = load_apartments(INPUT_FILE)
    if not apartments:
        print(f"No valid apartments loaded from {INPUT_FILE}")
        return
    print(f"Loaded {len(apartments)} apartments from {INPUT_FILE}")

    # Initialize Pinecone
    try:
        index = init_pinecone_index()
    except Exception as e:
        print(f"Error initializing Pinecone index: {e}")
        return

    # Prepare image data for Pinecone
    vectors = prepare_image_data(apartments)
    print(f"Created embeddings for {len(vectors)} images")

    # Upsert to Pinecone
    upsert_to_pinecone(index, vectors)

    # Print stats
    try:
        stats = index.describe_index_stats()
        print(f"Index stats after import: {stats}")
    except Exception as e:
        print(f"Error getting index stats: {e}")

    end_time = datetime.now()
    duration = end_time - start_time
    print(f"Import completed at {end_time}")
    print(f"Total duration: {duration}")


if __name__ == "__main__":
    main()
