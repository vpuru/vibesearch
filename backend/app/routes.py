from flask import Blueprint, request, jsonify
from app.services import (
    search_apartments,
    get_apartment_preview_by_id,
    get_apartment_details_by_id,
)
from app.image_processing import process_images_with_gpt4o

search_bp = Blueprint("search", __name__)


@search_bp.route("/api/search", methods=["GET"])
def search():
    try:
        # Log all request parameters for debugging
        print(f"DEBUG: Request parameters: {dict(request.args)}")

        # Get mandatory query parameter
        query = request.args.get("query")
        if not query:
            return jsonify({"error": "Query parameter is required"}), 400

        # Get optional parameters
        top_k = request.args.get(
            "limit", default=50, type=int
        )  # Increased default limit to 50

        # Build filter dictionary from query parameters
        filter_dict = {}

        if "city" in request.args:
            filter_dict["city"] = request.args.get("city")

        if "state" in request.args:
            filter_dict["state"] = request.args.get("state")

        if "min_rent" in request.args:
            filter_dict["min_rent"] = {"$gte": int(request.args.get("min_rent"))}

        if "max_rent" in request.args:
            filter_dict["max_rent"] = {"$lte": int(request.args.get("max_rent"))}

        if "min_beds" in request.args:
            filter_dict["min_beds"] = {"$gte": float(request.args.get("min_beds"))}

        if "max_beds" in request.args:
            filter_dict["max_beds"] = {"$lte": float(request.args.get("max_beds"))}

        if "min_baths" in request.args:
            filter_dict["min_baths"] = {"$gte": float(request.args.get("min_baths"))}

        if "max_baths" in request.args:
            filter_dict["max_baths"] = {"$lte": float(request.args.get("max_baths"))}

        if "studio" in request.args and request.args.get("studio").lower() in [
            "true",
            "1",
            "yes",
        ]:
            filter_dict["is_studio"] = "true"

        if "has_available_units" in request.args and request.args.get(
            "has_available_units"
        ).lower() in ["true", "1", "yes"]:
            filter_dict["has_available_units"] = "true"

        # Don't pass empty filter dictionary
        if not filter_dict:
            filter_dict = None

        print (query)
        # Search for apartments
        results = search_apartments(query, filter_dict, top_k)

        # Get the search type if provided
        search_type = request.args.get("searchType", "text")

        # Log the results for debugging
        print(f"DEBUG: Search completed, returned {len(results)} results")
        print(f"DEBUG: Results: {results}")

        return jsonify({"results": results, "searchType": search_type})
    except Exception as e:
        error_message = f"Error in search endpoint: {str(e)}"
        print(error_message)
        import traceback

        print(traceback.format_exc())
        return jsonify({"error": error_message}), 500


@search_bp.route("/api/process-images", methods=["POST"])
def process_images():
    try:
        data = request.json
        if not data or "imageUrls" not in data or not data["imageUrls"]:
            return jsonify({"error": "Image URLs are required"}), 400
        
        image_urls = data["imageUrls"]
        user_query = data.get("userQuery", "")

        description = process_images_with_gpt4o(image_urls, user_query)
        
        return jsonify({
            "description": description,
            "original_urls": image_urls
        })
    except Exception as e:
        error_message = f"Error processing images: {str(e)}"
        print(error_message)
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": error_message}), 500


@search_bp.route("/api/apartment/preview/<string:apartment_id>", methods=["GET"])
def apartment_preview(apartment_id):
    """
    Get preview data for a specific apartment by ID

    Args:
        apartment_id (str): The ID of the apartment to retrieve preview data for

    Returns:
        JSON: Preview data for the apartment or error message
    """
    try:
        # Log the request for debugging
        print(f"DEBUG: Apartment preview request for ID: {apartment_id}")

        # Get apartment preview data
        apartment = get_apartment_preview_by_id(apartment_id)

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

    Returns:
        JSON: All data for the apartment or error message
    """
    try:
        # Log the request for debugging
        print(f"DEBUG: Apartment details request for ID: {apartment_id}")

        # Get apartment details
        apartment = get_apartment_details_by_id(apartment_id)

        if apartment is None:
            return jsonify({"error": "Apartment not found"}), 404

        return jsonify({"apartment": apartment})
    except Exception as e:
        error_message = f"Error in apartment details endpoint: {str(e)}"
        print(error_message)
        import traceback

        print(traceback.format_exc())
        return jsonify({"error": error_message}), 500
