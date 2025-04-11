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
INPUT_FILE = "scripts/output/apartment_image_descriptions.json"
INDEX_NAME = "apartments-search"
EMBEDDING_DIMENSION = 384  # Dimension for all-MiniLM-L6-v2


def create_embedding(text):
    """Create an embedding for the given text using sentence-transformers"""
    try:
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"Error creating embedding: {e}")
        return None


def prepare_apartment_data(apartments):
    """Prepare apartment data for Pinecone upsert"""
    vectors = []

    for apartment in tqdm(apartments, desc="Creating embeddings"):
        # Extract semantic description
        semantic_description = apartment.get("semantic_description", "")

        if not semantic_description:
            print(
                f"Warning: Missing semantic description for apartment {apartment['id']}"
            )
            continue

        # Create embedding for the semantic description
        embedding = create_embedding(semantic_description)

        if embedding is None:
            print(
                f"Warning: Failed to create embedding for apartment {apartment['id']}"
            )
            continue

        # Create metadata (all fields except semantic_description)
        metadata = {k: v for k, v in apartment.items() if k != "semantic_description"}

        # Handle problematic metadata values
        for key, value in list(metadata.items()):
            # Handle None/null values
            if value is None:
                if key in [
                    "min_rent",
                    "max_rent",
                    "min_beds",
                    "max_beds",
                    "min_baths",
                    "max_baths",
                    "min_sqft",
                    "max_sqft",
                ]:
                    metadata[key] = 0  # Replace numeric nulls with 0
                else:
                    metadata[key] = ""  # Replace string nulls with empty string
            # Handle boolean values
            elif isinstance(value, bool):
                metadata[key] = str(value).lower()  # Convert boolean to string
            # Handle non-serializable types (in case there are any)
            elif not isinstance(value, (str, int, float, bool, list)):
                metadata[key] = str(value)  # Convert to string

        # Create vector object
        vector = {"id": apartment["id"], "values": embedding, "metadata": metadata}

        # Debug information
        print(f"Vector ID: {vector['id']}")
        print(f"Vector dimension: {len(vector['values'])}")
        print(f"First 5 values: {vector['values'][:5]}")
        print(f"Metadata sample: {list(metadata.keys())[:5]}")

        vectors.append(vector)

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
    else:
        print(f"Creating new index: '{INDEX_NAME}'")
        pc.create_index(
            name=INDEX_NAME,
            dimension=EMBEDDING_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )

    # Connect to the index
    index = pc.Index(INDEX_NAME)

    # Debug information
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
            response = index.upsert(vectors=batch)
            print(f"Upsert response: {response}")
            # Small delay to avoid rate limiting
            time.sleep(0.5)
        except Exception as e:
            print(f"Error upserting batch {i//batch_size + 1}/{total_batches}: {e}")
            # Print the first vector that might be causing issues
            if batch:
                print(f"First vector ID in batch: {batch[0]['id']}")
                print(f"Metadata keys: {list(batch[0]['metadata'].keys())}")
                for k, v in batch[0]["metadata"].items():
                    print(f"  {k}: {v} (type: {type(v)})")


def main():
    start_time = datetime.now()
    print(f"Starting apartment data import at {start_time}")

    # Load apartment data
    try:
        with open(INPUT_FILE, "r") as file:
            apartments = json.load(file)
        print(f"Loaded {len(apartments)} apartments from {INPUT_FILE}")
    except Exception as e:
        print(f"Error loading apartment data: {e}")
        return

    # Initialize Pinecone
    try:
        index = init_pinecone_index()
    except Exception as e:
        print(f"Error initializing Pinecone index: {e}")
        return

    # Prepare apartment data for Pinecone
    vectors = prepare_apartment_data(apartments)
    print(f"Created embeddings for {len(vectors)} apartments")

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
