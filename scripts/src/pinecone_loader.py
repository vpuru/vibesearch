import os
import json
from datetime import datetime
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

# Get API key from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX = "apartments-search"

# File input constants
INPUT_FILE = "data/apartments.json"
SEMANTIC_DESCRIPTION_FILE = "src/semantic_descriptions.json"
APARTMENT_IMAGE_DESCRIPTIONS_FILE = "output/apartment_image_descriptions.json"

# Check if required API key is set
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in environment variables")

# Initialize sentence-transformer model
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Initialize Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)

class PineconeEntry:
    def __init__(self, id: str, embedding: any, metadata: any):
        self.id = id
        self.embedding = embedding
        self.metadata = metadata


def load_semantic_description_doc_for_apartment(apartment_id) -> str:
    """
    Load and combine all semantic descriptions for an apartment's images into a single string.
    Args:
        apartment_id (str): The ID of the apartment to load the semantic descriptions for.
    Returns:
        str: A combined string of all image descriptions for the apartment.
    """
    with open(APARTMENT_IMAGE_DESCRIPTIONS_FILE, "r") as f:
        apartments = json.load(f)
        
    # Find the apartment with matching ID
    apartment = next((apt for apt in apartments if apt["id"] == apartment_id), None)
    if not apartment:
        raise ValueError(f"Apartment with ID {apartment_id} not found")
        
    # Combine all image descriptions into a single string
    all_descriptions = []
    for image in apartment["images"]:
        all_descriptions.append(image["description"])
        
    # Join all descriptions with a space separator
    return " ".join(all_descriptions)

def load_data_for_apartment(apartment_id) -> dict:
    """
    Load the Pinecone entry for an apartment from the input file.
    Args:
        apartment_id (str): The ID of the apartment to load the Pinecone entry for.
    Returns:
        dict: The Pinecone entry for the apartment.
    """
    with open(INPUT_FILE, "r") as f:
        apartments = json.load(f)
        
    # Find the apartment with matching ID
    apartment = next((apt for apt in apartments if apt["id"] == apartment_id), None)
    if not apartment:
        raise ValueError(f"Apartment with ID {apartment_id} not found")
        
    return apartment

def load_filters_for_apartment(apartment_id) -> dict:
    """
    Load the filters for an apartment from the input file.
    Args:
        apartment_id (str): The ID of the apartment to load the filters for.
    Returns:
        dict: The filters for the apartment including bedrooms, bathrooms, and price range.
    """
    with open(INPUT_FILE, "r") as f:
        apartments = json.load(f)
        
    # Find the apartment with matching ID
    apartment = next((apt for apt in apartments if apt["id"] == apartment_id), None)
    if not apartment:
        raise ValueError(f"Apartment with ID {apartment_id} not found")
        
    # Extract and process bedrooms
    beds_str = apartment["beds"]
    if "studio" in beds_str.lower():
        beds = 0
    else:
        # Find all numbers in the string and take the maximum
        numbers = re.findall(r'\d+', beds_str)
        beds = max([int(n) for n in numbers]) if numbers else 0

    # Extract and process bathrooms
    baths_str = apartment["baths"]
    if "studio" in baths_str.lower():
        baths = 0
    else:
        # Find all numbers in the string and take the maximum
        numbers = re.findall(r'\d+', baths_str)
        baths = max([int(n) for n in numbers]) if numbers else 0
        
    # Extract and process price range
    price_min = apartment["rent"]["min"]
    price_max = apartment["rent"]["max"]
    
    # If either price is None, set it equal to the other
    if price_min is None and price_max is not None:
        price_min = price_max
    elif price_max is None and price_min is not None:
        price_max = price_min
    elif price_min is None and price_max is None:
        price_min = price_max = 0  # Default to 0 if both are None
        
    # Extract filters from the apartment data
    filters = {
        "bedrooms": beds,
        "bathrooms": baths,
        "price_min": price_min,
        "price_max": price_max
    }

    return filters

def generate_apartment_pinecone_entry(apartment_id: str) -> PineconeEntry:
    """
    Insert an apartment into Pinecone with metadata filters.
    
    Args:
        apartment_id (str): Unique identifier for the apartment
    Returns:
        dict: The Pinecone entry for the apartment
    """
    semantic_description = load_semantic_description_doc_for_apartment(apartment_id)
    filters = load_filters_for_apartment(apartment_id)
    
    # Generate embedding for the semantic description
    embedding = model.encode(semantic_description)
    
    # Prepare metadata
    metadata = {
        "apartment_id": apartment_id,
        **filters
    }

    return PineconeEntry(id=apartment_id, embedding=embedding, metadata=metadata)
    

def check_and_delete_index(index_name: str):
    """
    Check if an index exists and delete it if it does.
    Args:
        index_name (str): The name of the index to check and delete
    """
    if index_name in pc.list_indexes().names():
        print(f"Deleting existing index {index_name}...")
        pc.delete_index(index_name)
        print(f"Index {index_name} deleted successfully")

def create_index(index_name: str, dimension: int = 384):
    """
    Create a new Pinecone index with the specified name and dimension.
    Args:
        index_name (str): The name of the index to create
        dimension (int): The dimension of the vectors to be stored (default: 384 for all-MiniLM-L6-v2)
    """
    print(f"Creating new index {index_name}...")
    pc.create_index(
        name=index_name,
        dimension=dimension,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )
    print(f"Index {index_name} created successfully")

def insert_apartment_into_index(index_name: str, entry: PineconeEntry):
    """
    Insert a single apartment's data into the Pinecone index.
    Args:
        index_name (str): The name of the index to insert into
        entry (PineconeEntry): The apartment data to insert
    """
    index = pc.Index(index_name)
    index.upsert(
        vectors=[{
            "id": entry.id,
            "values": entry.embedding.tolist(),
            "metadata": entry.metadata
        }]
    )

def batch_insert_apartments(index_name: str, entries: list[PineconeEntry], batch_size: int = 100):
    """
    Insert multiple apartments into the Pinecone index in batches.
    Args:
        index_name (str): The name of the index to insert into
        entries (list[PineconeEntry]): List of apartment entries to insert
        batch_size (int): Size of each batch for insertion
    """
    index = pc.Index(index_name)
    
    # Process entries in batches
    for i in range(0, len(entries), batch_size):
        batch = entries[i:i + batch_size]
        vectors = [{
            "id": entry.id,
            "values": entry.embedding.tolist(),
            "metadata": entry.metadata
        } for entry in batch]
        
        index.upsert(vectors=vectors)

def main():
    # Load all apartments from the sample file
    with open(INPUT_FILE, "r") as f:
        apartments = json.load(f)
    
    # Check and delete existing index if it exists
    check_and_delete_index(INDEX)
    
    # Create new index
    create_index(INDEX)
    
    entries = []
    failed_apartments = []
    
    # Process each apartment with a progress bar
    print("\nProcessing apartments...")
    for apartment in tqdm(apartments, desc="Processing apartments"):
        try:
            apartment_id = apartment["id"]
            entry = generate_apartment_pinecone_entry(apartment_id)
            entries.append(entry)
        except Exception as e:
            failed_apartments.append((apartment_id, str(e)))
            continue
    
    # Insert all entries in batches with a progress bar
    print("\nInserting into Pinecone...")
    batch_size = 100
    num_batches = (len(entries) + batch_size - 1) // batch_size
    
    for i in tqdm(range(0, len(entries), batch_size), desc="Inserting batches", total=num_batches):
        batch = entries[i:i + batch_size]
        batch_insert_apartments(INDEX, batch, batch_size)
    
    # Print summary
    print(f"\nSummary:")
    print(f"Successfully processed and inserted {len(entries)} apartments")
    if failed_apartments:
        print(f"Failed to process {len(failed_apartments)} apartments:")
        for apartment_id, error in failed_apartments:
            print(f"- Apartment {apartment_id}: {error}")

if __name__ == "__main__":
    main()