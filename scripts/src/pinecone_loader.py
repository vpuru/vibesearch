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
INPUT_FILE = "output/searchable_apartments_20250323_121136.json"
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

        # Convert numeric values to appropriate types for Pinecone
        for key, value in metadata.items():
            if isinstance(value, bool):
                metadata[key] = str(value).lower()  # Convert boolean to string

        # Create vector object
        vector = {"id": apartment["id"], "values": embedding, "metadata": metadata}

        vectors.append(vector)

    return vectors


def init_pinecone_index():
    """Initialize Pinecone index"""
    # Check if index exists
    existing_indexes = pc.list_indexes().names()

    if INDEX_NAME in existing_indexes:
        print(f"Index '{INDEX_NAME}' already exists")
    else:
        print(f"Creating new index: '{INDEX_NAME}'")
        pc.create_index(
            name=INDEX_NAME,
            dimension=EMBEDDING_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-west-2"),
        )
        # Wait for index to be ready
        print("Waiting for index to initialize...")
        time.sleep(60)

    # Connect to the index
    index = pc.Index(INDEX_NAME)
    return index


def upsert_to_pinecone(index, vectors, batch_size=100):
    """Upsert vectors to Pinecone in batches"""
    total_vectors = len(vectors)
    total_batches = (total_vectors + batch_size - 1) // batch_size

    for i in tqdm(
        range(0, total_vectors, batch_size),
        desc="Upserting to Pinecone",
        total=total_batches,
    ):
        batch = vectors[i : i + batch_size]
        index.upsert(vectors=batch)
        # Small delay to avoid rate limiting
        time.sleep(0.5)


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
    stats = index.describe_index_stats()
    print(f"Index stats after import: {stats}")

    end_time = datetime.now()
    duration = end_time - start_time
    print(f"Import completed at {end_time}")
    print(f"Total duration: {duration}")


if __name__ == "__main__":
    main()
