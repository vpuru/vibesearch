import os
import json
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
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
INDEX_NAME = "apartments-search"
# Path to apartments.json file
APARTMENTS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "apartments.json"
)


def create_embedding(text):
    """Create an embedding for the given text using sentence-transformers"""
    try:
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"Error creating embedding: {e}")
        return None


def search_apartments(query, filter_dict=None, top_k=10):
    """
    Search for apartments in the Pinecone index

    Args:
        query (str): The search query
        filter_dict (dict, optional): Filter criteria for metadata. Defaults to None.
        top_k (int, optional): Number of results to return. Defaults to 10.

    Returns:
        list: List of matching apartments with scores
    """
    # Get the index
    index = pc.Index(INDEX_NAME)

    # Create embedding for the query
    query_embedding = create_embedding(query)

    if query_embedding is None:
        print("Failed to create embedding for query")
        return []

    # Search the index
    search_results = index.query(
        vector=query_embedding, filter=filter_dict, top_k=top_k, include_metadata=True
    )

    # Format results
    formatted_results = []
    for match in search_results.matches:
        result = {"id": match.id, "score": match.score, "metadata": match.metadata}
        formatted_results.append(result)

    return formatted_results


def get_relevant_images(query, property_id, top_k=4):
    """
    Get the most relevant images for a property based on a query

    Args:
        query (str): The search query
        property_id (str): The property ID to filter by
        top_k (int): Number of images to return

    Returns:
        list: List of image URLs
    """
    try:
        # Create query embedding
        query_embedding = model.encode(query).tolist()

        # Search in the images namespace with property_id filter
        results = pc.Index(INDEX_NAME).query(
            vector=query_embedding,
            namespace="images",
            filter={"property_id": property_id},
            top_k=top_k,
            include_metadata=True,
        )

        # Extract image URLs from results
        image_urls = [
            match.metadata["image_url"]
            for match in results.matches
            if "image_url" in match.metadata
        ]

        return image_urls
    except Exception as e:
        print(f"Error getting relevant images: {e}")
        return []


def get_apartment_preview_by_id(apartment_id, query=None):
    """
    Get preview data for a specific apartment by ID

    Args:
        apartment_id (str): The ID of the apartment
        query (str, optional): Search query to find relevant images

    Returns:
        dict: Preview data for the apartment or None if not found
    """
    try:
        with open(APARTMENTS_FILE, "r") as f:
            apartments = json.load(f)

        # Find the apartment with the matching ID
        for apartment in apartments:
            if apartment.get("id") == apartment_id:
                # Get relevant images if query is provided, otherwise use first 4 photos
                photos = []
                if query and len(query.strip()) > 0:
                    photos = get_relevant_images(query, apartment_id)

                # If no relevant images found or no query provided, use first 4 photos
                if not photos and apartment.get("photos"):
                    photos = apartment.get("photos")[:4]

                # Extract only the preview data
                preview = {
                    "id": apartment.get("id"),
                    "propertyName": apartment.get("propertyName"),
                    "location": {
                        "city": apartment.get("location", {}).get("city"),
                        "state": apartment.get("location", {}).get("state"),
                    },
                    "coordinates": apartment.get(
                        "coordinates",
                        {
                            "latitude": 34.0522,  # Default to Los Angeles if not available
                            "longitude": -118.2437,
                        },
                    ),
                    "rent": apartment.get("rent"),
                    "beds": apartment.get("beds"),
                    "baths": apartment.get("baths"),
                    "sqft": apartment.get("sqft"),
                    "photos": photos if photos else None,
                }
                return preview

        # If no matching apartment is found
        return None
    except Exception as e:
        print(f"Error retrieving apartment preview: {e}")
        return None


def get_apartment_details_by_id(apartment_id):
    """
    Get all details for a specific apartment by ID

    Args:
        apartment_id (str): The ID of the apartment

    Returns:
        dict: All data for the apartment or None if not found
    """
    try:
        with open(APARTMENTS_FILE, "r") as f:
            apartments = json.load(f)

        # Find the apartment with the matching ID
        for apartment in apartments:
            if apartment.get("id") == apartment_id:
                return apartment

        # If no matching apartment is found
        return None
    except Exception as e:
        print(f"Error retrieving apartment details: {e}")
        return None
