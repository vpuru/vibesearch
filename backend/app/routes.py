from flask import Blueprint, request, jsonify
from app.services import (
    search_apartments,
    get_apartment_preview_by_id,
    get_apartment_details_by_id,
)

search_bp = Blueprint("search", __name__)


@search_bp.route("/api/search", methods=["GET"])
def search():
    """
    Search for apartments based on text query, image URLs, and optional filters.
    
    Query Parameters:
        query (str, optional): Text search query to match against apartment descriptions
        imageUrls (str, optional): JSON string containing array of image URLs for visual search
        limit (int, optional): Maximum number of results to return (default: 50)
        
    Filter Parameters:
        min_price (float, optional): Minimum price filter
        max_price (float, optional): Maximum price filter
        min_bedrooms (float, optional): Minimum number of bedrooms
        max_bedrooms (float, optional): Maximum number of bedrooms
        min_bathrooms (float, optional): Minimum number of bathrooms
        max_bathrooms (float, optional): Maximum number of bathrooms
        
    Returns:
        JSON response containing:
            - results: Array of matching apartment objects
            - error: Error message if something went wrong
            
    Example:
        GET /api/search?query=modern&min_price=1000&max_price=3000&min_bedrooms=2
    """
    try:
        # Log all request parameters for debugging
        print(f"DEBUG: Request parameters: {dict(request.args)}")

        # Get query parameter (can be empty if only image search)
        query = request.args.get("query", "")
        print(f"DEBUG: Received query: '{query}'")
        
        # Get image URLs if any
        image_urls_json = request.args.get("imageUrls")
        image_urls = []
        if image_urls_json:
            try:
                import json
                image_urls = json.loads(image_urls_json)
                print(f"DEBUG: Received {len(image_urls)} image URLs")
                # Log a few sample URLs for debugging
                if len(image_urls) > 0:
                    print(f"DEBUG: Sample image URL: {image_urls[0][:60]}...")
            except json.JSONDecodeError as e:
                print(f"ERROR: Failed to parse image URLs: {image_urls_json[:100]}..., error: {e}")
            except Exception as e:
                print(f"ERROR: Unexpected error handling image URLs: {e}")
        
        # Check if we have at least a query or image URLs
        if not query.strip() and not image_urls:
            print("ERROR: No query or image URLs provided")
            return jsonify({"error": "Query parameter or image URLs are required"}), 400

        # Get optional parameters
        top_k = request.args.get("limit", default=50, type=int)

        # Build filter dictionary from query parameters
        filter_dict = {}

        # Get price range filters
        min_price = request.args.get("min_price", type=float)
        max_price = request.args.get("max_price", type=float)
        min_bedrooms = request.args.get("min_bedrooms", type=float)
        max_bedrooms = request.args.get("max_bedrooms", type=float)
        min_bathrooms = request.args.get("min_bathrooms", type=float)
        max_bathrooms = request.args.get("max_bathrooms", type=float)
        
        # Get amenities filter if passed
        amenities_json = request.args.get("amenities")
        amenities = []
        if amenities_json:
            try:
                import json
                amenities = json.loads(amenities_json)
                print(f"DEBUG: Received amenities filter: {amenities}")
            except json.JSONDecodeError as e:
                print(f"ERROR: Failed to parse amenities filter: {amenities_json[:100]}..., error: {e}")
            except Exception as e:
                print(f"ERROR: Unexpected error handling amenities filter: {e}")

        
        if min_price is not None:
            filter_dict["price_min"] = {
                "$gte": min_price
            }

        if max_price is not None:
            filter_dict["price_max"] = {
                "$lte": max_price
            }

        if min_bedrooms is not None or max_bedrooms is not None:
            filter_dict["bedrooms"] = {
                "$gte": min_bedrooms if min_bedrooms is not None else 0,
                "$lte": max_bedrooms if max_bedrooms is not None else float('9999')
            }

        if min_bathrooms is not None or max_bathrooms is not None:
            filter_dict["bathrooms"] = {
                "$gte": min_bathrooms if min_bathrooms is not None else 0,
                "$lte": max_bathrooms if max_bathrooms is not None else float('9999')
            }
            
        # Add amenities filter if provided
        if amenities and len(amenities) > 0:
            # Create a filter for amenities - looking for properties where any of the
            # requested amenities are present
            amenity_conditions = []
            for amenity in amenities:
                # Convert from display name (e.g. "Pet Friendly") to DB field name (e.g. "pet_friendly")
                amenity_field = amenity.lower().replace(" ", "_").replace("/", "_")
                amenity_conditions.append({f"amenities.{amenity_field}": "true"})
            
            if amenity_conditions:
                filter_dict["$or"] = amenity_conditions
                print(f"DEBUG: Applied amenities filter: {filter_dict['$or']}")
    
        # Don't pass empty filter dictionary
        if not filter_dict:
            filter_dict = None

        # Search for apartments based on query and/or image URLs
        results = search_apartments(query, filter_dict, top_k, image_urls)

        # Log the results for debugging
        print(f"DEBUG: Search completed, returned {len(results)} results")
        print(f"DEBUG: Results: {results}")

        return jsonify({"results": results})
    except Exception as e:
        error_message = f"Error in search endpoint: {str(e)}"
        print(error_message)
        import traceback

        print(traceback.format_exc())
        return jsonify({"error": error_message}), 500


@search_bp.route("/api/apartment/preview/<string:apartment_id>", methods=["GET"])
def apartment_preview(apartment_id):
    """
    Get preview data for a specific apartment by ID, with optional query parameter
    to order images by relevance to the query

    Args:
        apartment_id (str): The ID of the apartment to retrieve preview data for

    Query params:
        query (str, optional): The search query to rank images by relevance

    Returns:
        JSON: Preview data for the apartment or error message
    """
    try:
        # Log the request for debugging
        print(f"DEBUG: Apartment preview request for ID: {apartment_id}")
        
        # Get the optional query parameter
        query = request.args.get("query", "")
        if query:
            # print(f"DEBUG: Ordering images by relevance to query: '{query}'")
            pass
        
        # Get apartment preview data with query for image ordering
        apartment = get_apartment_preview_by_id(apartment_id, query)

        if apartment is None:
            return jsonify({"error": "Apartment not found"}), 404

        return jsonify({"apartment": apartment})
    except Exception as e:
        error_message = f"Error in apartment preview endpoint: {str(e)}"
        print(error_message)
        import traceback

        print(traceback.format_exc())
        return jsonify({"error": error_message}), 500


@search_bp.route("/api/apartment/details/<string:apartment_id>", methods=["GET"])
def apartment_details(apartment_id):
    """
    Get full details for a specific apartment by ID

    Args:
        apartment_id (str): The ID of the apartment to retrieve details for

    Query params:
        query (str, optional): The search query to rank images by relevance

    Returns:
        JSON: All data for the apartment or error message
    """
    try:
        # Log the request for debugging
        print(f"DEBUG: Apartment details request for ID: {apartment_id}")
        
        # Get the optional query parameter
        query = request.args.get("query", "")
        if query:
            print(f"DEBUG: Ordering images by relevance to query: '{query}'")

        # Get apartment details with query for image ordering
        apartment = get_apartment_details_by_id(apartment_id, query)

        if apartment is None:
            return jsonify({"error": "Apartment not found"}), 404

        return jsonify({"apartment": apartment})
    except Exception as e:
        error_message = f"Error in apartment details endpoint: {str(e)}"
        print(error_message)
        import traceback

        print(traceback.format_exc())
        return jsonify({"error": error_message}), 500
