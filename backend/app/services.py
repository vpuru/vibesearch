import os
import json
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Get API keys from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Check if required API keys are set
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in environment variables")
if not OPENAI_API_KEY:
    print("WARNING: OPENAI_API_KEY not found in environment variables. Image analysis will be disabled.")

# Initialize OpenAI client if API key is available
openai_client = None
if OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

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


def analyze_images_with_gpt4o(image_urls, user_query=None):
    """
    Analyze images using GPT-4o and return a description
    """
    try:
        # Check if OpenAI client is available
        if not openai_client:
            print("WARNING: OpenAI client not initialized. Using fallback description.")
            return "Modern apartment with stylish furnishings and natural light."
        
        messages = [{"role": "system", "content": "You are a helpful assistant that describes apartment images concisely."}]
        if user_query:
            # If there's a user query, include it in the prompt
            user_content = f"Generate a 20-word description that would help find matching apartments based on these images and the user's query: '{user_query}'. Focus on aesthetics, style, and design elements visible in the images."
        else:
            # If there are only images, ask for a general description
            user_content = "Generate a 20-word description that would help find matching apartments based on these images. Focus on aesthetics, style, and design elements visible in the images."
        user_message = {"role": "user", "content": [{"type": "text", "text": user_content}]}
        
        for image_url in image_urls:
            user_message["content"].append({"type": "image_url", "image_url": {"url": image_url}})
        messages.append(user_message)
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=100
        )
        description = response.choices[0].message.content.strip()
        return description
    
    except Exception as e:
        print(f"Error analyzing images with GPT-4o: {e}")
        # Return a fallback description in case of error
        return "Modern apartment with stylish furnishings and natural light."


def create_embedding(text):
    """Create an embedding for the given text using sentence-transformers"""
    try:
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"Error creating embedding: {e}")
        return None


def search_apartments(query, filter_dict=None, top_k=10, image_urls=None, search_type=None):
    """
    Search for apartments in the Pinecone index

    Args:
        query (str): The search query
        filter_dict (dict, optional): Filter criteria for metadata. Defaults to None.
        top_k (int, optional): Number of results to return. Defaults to 10.
        image_urls (list, optional): List of image URLs to analyze. Defaults to None.
        search_type (str, optional): Type of search ('text_only', 'image_only', or 'text_and_image'). Defaults to None.

    Returns:
        list: List of matching apartments with scores
    """
    # Get the index
    index = pc.Index(INDEX_NAME)
    
    # Process query based on search type and available images
    processed_query = query
    
    # If we have image URLs and it's not a text-only search, analyze the images
    if image_urls and search_type and search_type != "text_only":
        # For image-only search or text-and-image search
        if search_type == "image_only":
            # For image-only search, use only the image description
            image_description = analyze_images_with_gpt4o(image_urls)
            processed_query = image_description
        elif search_type == "text_and_image":
            # For text-and-image search, combine the query with image description
            image_description = analyze_images_with_gpt4o(image_urls, query)
            processed_query = f"{query} {image_description}"
    
    print(f"Original query: '{query}', Processed query: '{processed_query}'")
    
    # Create embedding for the processed query
    query_embedding = create_embedding(processed_query)

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


def get_apartment_preview_by_id(apartment_id):
    """
    Get preview data for a specific apartment by ID

    Args:
        apartment_id (str): The ID of the apartment

    Returns:
        dict: Preview data for the apartment or None if not found
    """
    try:
        with open(APARTMENTS_FILE, "r") as f:
            apartments = json.load(f)

        # Find the apartment with the matching ID
        for apartment in apartments:
            if apartment.get("id") == apartment_id:
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
                    "photos": (
                        apartment.get("photos", [])
                        if apartment.get("photos") and len(apartment.get("photos")) > 0
                        else None
                    ),
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
