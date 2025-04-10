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


def search_apartments(query, filter_dict=None, top_k=10, image_urls=None):
    """
    Search for apartments in the Pinecone index

    Args:
        query (str): The search query
        filter_dict (dict, optional): Filter criteria for metadata. Defaults to None.
        top_k (int, optional): Number of results to return. Defaults to 10.
        image_urls (list, optional): List of image URLs to analyze. Defaults to None.

    Returns:
        list: List of matching apartments with scores
    """
    import os
    import openai
    
    # Get the index
    index = pc.Index(INDEX_NAME)
    
    # Handle different search modes
    search_text = query.strip()
    
    # If we have image URLs, we need to analyze them with GPT-4o
    if image_urls and len(image_urls) > 0:
        try:
            print(f"Processing {len(image_urls)} image URLs for analysis")
            
            # Get OpenAI API key from environment
            openai_api_key = os.getenv("OPENAI_API_KEY")
            
            if not openai_api_key:
                print("ERROR: OPENAI_API_KEY not found in environment")
                return []
            
            try:
                # Initialize OpenAI client
                client = openai.OpenAI(api_key=openai_api_key)
                print("Successfully initialized OpenAI client")
                
                # Construct messages for the API
                messages = [
                    {"role": "system", "content": "You are a helpful assistant that generates semantic search descriptions for apartment listings. Provide a concise description (less than 20 words) focusing on aesthetics and design elements visible in the images."}
                ]
                
                # Add image URLs to the message
                content = []
                
                # Add the text content
                if search_text:
                    content.append(
                        {"type": "text", 
                         "text": f"These are images of apartment interiors/exteriors. Generate a 20-word search description that combines analyzing these images with the text query: '{search_text}'. Focus on aesthetics and design elements."}
                    )
                else:
                    content.append(
                        {"type": "text", 
                         "text": "These are images of apartment interiors/exteriors. Generate a 20-word search description focusing on aesthetics and design elements visible in the images."}
                    )
                    
                # Add the image URLs (maximum 5 images to avoid token limits)
                for url in image_urls[:5]:
                    print(f"Adding image URL to content: {url[:60]}...")
                    content.append(
                        {"type": "image_url", "image_url": {"url": url}}
                    )
                
                messages.append({"role": "user", "content": content})
                
                print("Calling OpenAI API for image analysis")
                # Call the OpenAI API
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    max_tokens=100
                )
                
                # Get the generated description
                image_description = response.choices[0].message.content.strip()
                print(f"Generated image description: {image_description}")
                
                # Combine with any existing text query
                if search_text:
                    combined_query = f"{search_text} {image_description}"
                else:
                    combined_query = image_description
                    
                print(f"Combined query for embedding: {combined_query}")
                # Use the combined query for embedding
                query_embedding = create_embedding(combined_query)
                
            except Exception as api_error:
                print(f"ERROR during OpenAI API call: {api_error}")
                # Fall back to text query if available
                if search_text:
                    print(f"Falling back to text-only query: {search_text}")
                    query_embedding = create_embedding(search_text)
                else:
                    print("No fallback query available")
                    return []
        except Exception as e:
            print(f"Error analyzing images with OpenAI: {e}")
            
            # Fall back to text query if available, otherwise return empty results
            if search_text:
                query_embedding = create_embedding(search_text)
            else:
                print("No fallback query available")
                return []
    else:
        # Text-only search
        query_embedding = create_embedding(search_text)

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
