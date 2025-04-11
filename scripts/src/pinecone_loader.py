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
IMAGE_DESCRIPTIONS_FILE = "output/apartment_image_descriptions.json"
APARTMENTS_FILE = "apartments.json"
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


def load_apartment_details():
    """Load apartment details from apartments.json"""
    try:
        print(f"Loading apartment details from {APARTMENTS_FILE}")
        with open(APARTMENTS_FILE, "r") as file:
            apartments = json.load(file)
        print(f"Loaded {len(apartments)} apartments from {APARTMENTS_FILE}")
        # Create a mapping of apartment IDs to their details
        apartment_map = {apt["id"]: apt for apt in apartments}
        print(f"Created mapping with {len(apartment_map)} apartments")
        return apartment_map
    except Exception as e:
        print(f"Error loading apartment details: {e}")
        return {}


def prepare_apartment_data(image_descriptions, apartment_details):
    """Prepare apartment data for Pinecone upsert"""
    vectors = []
    skipped_count = 0
    processed_count = 0

    for apartment in tqdm(image_descriptions, desc="Creating embeddings"):
        apartment_id = apartment["id"]
        print(f"\nProcessing apartment {apartment_id}")
        
        # Get apartment details
        details = apartment_details.get(apartment_id)
        if not details:
            print(f"Warning: No details found for apartment {apartment_id}")
            skipped_count += 1
            continue

        # Combine all image descriptions into a single semantic description
        image_descs = [img["description"] for img in apartment["images"] if img.get("description")]
        semantic_description = " ".join(image_descs)
        print(f"Combined {len(image_descs)} image descriptions")

        if not semantic_description:
            print(f"Warning: No image descriptions found for apartment {apartment_id}")
            skipped_count += 1
            continue

        # Create embedding for the semantic description
        embedding = create_embedding(semantic_description)

        if embedding is None:
            print(f"Warning: Failed to create embedding for apartment {apartment_id}")
            skipped_count += 1
            continue

        # Flatten amenities into a list of strings
        amenities = []
        if details.get("amenities"):
            for amenity_group in details["amenities"]:
                if isinstance(amenity_group, dict) and "value" in amenity_group:
                    amenities.extend(amenity_group["value"])
        amenities = list(set(amenities))  # Remove duplicates

        # Extract relevant metadata from apartment details
        metadata = {
            "propertyName": details.get("propertyName", ""),
            "url": details.get("url", ""),
            "min_rent": details.get("rent", {}).get("min", 0),
            "max_rent": details.get("rent", {}).get("max", 0),
            "beds": details.get("beds", ""),
            "baths": details.get("baths", ""),
            "sqft": details.get("sqft", ""),
            "location": details.get("location", {}).get("fullAddress", ""),
            "coordinates": str(details.get("coordinates", {})),  # Convert dict to string
            "amenities": amenities,  # Now a list of strings
            "walkScore": details.get("scores", {}).get("walkScore", 0),
            "transitScore": details.get("scores", {}).get("transitScore", 0),
            "neighborhoodDescription": details.get("neighborhoodDescription", ""),
        }

        # Handle problematic metadata values
        for key, value in list(metadata.items()):
            # Handle None/null values
            if value is None:
                if key in ["min_rent", "max_rent", "walkScore", "transitScore"]:
                    metadata[key] = 0
                else:
                    metadata[key] = ""
            # Handle boolean values
            elif isinstance(value, bool):
                metadata[key] = str(value).lower()
            # Handle non-serializable types
            elif not isinstance(value, (str, int, float, bool, list)):
                metadata[key] = str(value)

        # Create vector object
        vector = {
            "id": apartment_id,
            "values": embedding,
            "metadata": metadata
        }

        # Debug information
        print(f"Created vector for apartment {apartment_id}")
        print(f"Vector dimension: {len(vector['values'])}")
        print(f"Metadata fields: {list(metadata.keys())}")
        print(f"Sample metadata values:")
        for k, v in list(metadata.items())[:3]:
            print(f"  {k}: {v}")

        vectors.append(vector)
        processed_count += 1

    print(f"\nProcessing complete:")
    print(f"Total apartments processed: {processed_count}")
    print(f"Total apartments skipped: {skipped_count}")
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
                print(f"Metadata keys: {list(batch[0]['metadata'].keys())}")
                for k, v in batch[0]["metadata"].items():
                    print(f"  {k}: {v} (type: {type(v)})")


def main():
    start_time = datetime.now()
    print(f"Starting apartment data import at {start_time}")

    # Load apartment details
    apartment_details = load_apartment_details()
    if not apartment_details:
        print("Failed to load apartment details")
        return

    # Load image descriptions
    try:
        print(f"\nLoading image descriptions from {IMAGE_DESCRIPTIONS_FILE}")
        with open(IMAGE_DESCRIPTIONS_FILE, "r") as file:
            image_descriptions = json.load(file)
        print(f"Loaded {len(image_descriptions)} apartments from {IMAGE_DESCRIPTIONS_FILE}")
    except Exception as e:
        print(f"Error loading image descriptions: {e}")
        return

    # Initialize Pinecone
    try:
        index = init_pinecone_index()
    except Exception as e:
        print(f"Error initializing Pinecone index: {e}")
        return

    # Prepare apartment data for Pinecone
    vectors = prepare_apartment_data(image_descriptions, apartment_details)
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
