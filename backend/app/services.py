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


def get_apartment_preview_by_id(apartment_id, query=None):
    """
    Get preview data for a specific apartment by ID, with optional query parameter
    to order images by relevance to the query

    Args:
        apartment_id (str): The ID of the apartment
        query (str, optional): The search query to rank images by. Default is None.

    Returns:
        dict: Preview data for the apartment or None if not found
    """
    try:
        with open(APARTMENTS_FILE, "r") as f:
            apartments = json.load(f)

        # Find the apartment with the matching ID
        for apartment in apartments:
            if apartment.get("id") == apartment_id:
                # Get the original photos
                photos = apartment.get("photos", [])
                
                # If we have a query and photos, rank them by relevance
                if query and photos and len(photos) > 0:
                    ranked_photos = rank_apartment_images_by_query(apartment_id, query, photos)
                    print(query)
                    if ranked_photos:
                        photos = ranked_photos
                
                # Extract only the preview data
                # Ensure photos are a list of string URLs
                final_photos = photos
                if photos and len(photos) > 0:
                    # Convert any dict photos to string URLs
                    if isinstance(photos[0], dict) and "url" in photos[0]:
                        final_photos = [p["url"] for p in photos if isinstance(p, dict) and "url" in p]
                        
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
                    "photos": final_photos if final_photos and len(final_photos) > 0 else None,
                }
                return preview

        # If no matching apartment is found
        return None
    except Exception as e:
        print(f"Error retrieving apartment preview: {e}")
        return None


def rank_apartment_images_by_query(apartment_id, query, original_photos):
    """
    Rank apartment images by relevance to a search query using Pinecone

    Args:
        apartment_id (str): The ID of the apartment
        query (str): The search query to rank images by
        original_photos (list): Original list of photo objects or URLs

    Returns:
        list: Reordered list of URLs (strings), most relevant first
    """
    try:
        print(f"Ranking images for apartment {apartment_id} by query: '{query}'")
        print(f"Original photos type: {type(original_photos)}")
        
        # Debug the photos list
        if not isinstance(original_photos, list):
            print(f"Error: original_photos is not a list but {type(original_photos)}")
            return original_photos
            
        # Check if the list is empty
        if not original_photos:
            print("Error: original_photos is empty")
            return original_photos
            
        # Check the structure of the photos list
        print(f"First photo item type: {type(original_photos[0])}")
        
        # Convert photo objects to URLs if needed
        photo_urls = []
        for photo in original_photos:
            if isinstance(photo, dict) and "url" in photo:
                photo_urls.append(photo["url"])
            elif isinstance(photo, str):
                photo_urls.append(photo)
            else:
                print(f"Unknown photo format: {type(photo)}")
                
        if not photo_urls:
            print("Error: Could not extract any URLs from original_photos")
            return original_photos
                
        try:
            print(f"Original photo order first 3 URLs: {[url[:50] + '...' for url in photo_urls[:3]]}")
        except Exception as e:
            print(f"Error printing original photo URLs: {e}")
            return original_photos
            
        # Create embedding for the query
        query_embedding = create_embedding(query)
        if not query_embedding:
            print("Failed to create embedding for query")
            return original_photos
            
        # Connect to the apartment images index
        image_index = pc.Index("apartment-images-search")
        
        # Query the image index with filtering by apartment_id
        search_results = image_index.query(
            vector=query_embedding,
            filter={"apartment_id": apartment_id},
            top_k=50,  # Get enough results to cover all apartment images
            include_metadata=True
        )
        
        if not search_results.matches:
            print(f"No matching images found for apartment {apartment_id}")
            return photo_urls  # Return the extracted URLs
            
        print(f"Found {len(search_results.matches)} matching images")
        
        # Create a map of URL to relevance score
        url_score_map = {}
        for match in search_results.matches:
            original_url = match.metadata.get("original_url")
            if original_url:
                url_score_map[original_url] = match.score
                print(f"Match score: {match.score:.4f} for URL: {original_url[:50]}...")
                
        if not url_score_map:
            print("No URL mappings created from search results")
            return photo_urls  # Return the extracted URLs
            
        # Create a copy of the URLs to sort
        urls_to_sort = photo_urls.copy()
        
        # Sort URLs based on relevance scores
        # For URLs not in search results (no score), put them at the end
        def get_url_score(url):
            score = url_score_map.get(url, -1)
            if score >= 0:
                score_display = f"{score:.4f}"
            else:
                score_display = str(score)
            print(f"Score for {url[:50]}...: {score_display}")
            return score
            
        # Sort URLs by score (highest first)
        urls_to_sort.sort(key=get_url_score, reverse=True)
        
        print(f"Successfully ranked {len(urls_to_sort)} images for apartment {apartment_id}")
        print(f"New photo order first 3 URLs: {[url[:50] + '...' for url in urls_to_sort[:3]]}")
        
        # Return the sorted URLs as strings (not objects)
        return urls_to_sort
        
    except Exception as e:
        print(f"Error ranking apartment images: {e}")
        import traceback
        print(traceback.format_exc())
        # Return the extracted URLs if available, otherwise original photos
        return [p["url"] if isinstance(p, dict) and "url" in p else p for p in original_photos]


def get_apartment_details_by_id(apartment_id, query=None):
    """
    Get all details for a specific apartment by ID, with optional query parameter
    to order images by relevance to the query

    Args:
        apartment_id (str): The ID of the apartment
        query (str, optional): The search query to rank images by. Default is None.

    Returns:
        dict: All data for the apartment or None if not found
    """
    try:
        with open(APARTMENTS_FILE, "r") as f:
            apartments = json.load(f)

        # Find the apartment with the matching ID
        for apartment in apartments:
            if apartment.get("id") == apartment_id:
                # Make a deep copy to avoid modifying the original data
                result = apartment.copy()
                
                # If we have a query and photos, rank them by relevance
                photos = apartment.get("photos", [])
                if query and photos and len(photos) > 0:
                    ranked_photos = rank_apartment_images_by_query(apartment_id, query, photos)
                    if ranked_photos:
                        # Ensure we're returning a list of string URLs
                        if ranked_photos and isinstance(ranked_photos[0], dict) and "url" in ranked_photos[0]:
                            result["photos"] = [p["url"] for p in ranked_photos if isinstance(p, dict) and "url" in p]
                        else:
                            result["photos"] = ranked_photos
                
                return result

        # If no matching apartment is found
        return None
    except Exception as e:
        print(f"Error retrieving apartment details: {e}")
        return None
