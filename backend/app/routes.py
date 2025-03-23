from flask import Blueprint, request, jsonify
from app.services import search_apartments

search_bp = Blueprint('search', __name__)

@search_bp.route('/api/search', methods=['GET'])
def search():
    # Get mandatory query parameter
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    
    # Get optional parameters
    top_k = request.args.get('limit', default=20, type=int)
    
    # Build filter dictionary from query parameters
    filter_dict = {}
    
    if 'city' in request.args:
        filter_dict["city"] = request.args.get('city')
    
    if 'state' in request.args:
        filter_dict["state"] = request.args.get('state')
    
    if 'min_rent' in request.args:
        filter_dict["min_rent"] = {"$gte": int(request.args.get('min_rent'))}
    
    if 'max_rent' in request.args:
        filter_dict["max_rent"] = {"$lte": int(request.args.get('max_rent'))}
    
    if 'min_beds' in request.args:
        filter_dict["min_beds"] = {"$gte": float(request.args.get('min_beds'))}
    
    if 'max_beds' in request.args:
        filter_dict["max_beds"] = {"$lte": float(request.args.get('max_beds'))}
    
    if 'min_baths' in request.args:
        filter_dict["min_baths"] = {"$gte": float(request.args.get('min_baths'))}
    
    if 'max_baths' in request.args:
        filter_dict["max_baths"] = {"$lte": float(request.args.get('max_baths'))}
    
    if 'studio' in request.args and request.args.get('studio').lower() in ['true', '1', 'yes']:
        filter_dict["is_studio"] = "true"
    
    if 'has_available_units' in request.args and request.args.get('has_available_units').lower() in ['true', '1', 'yes']:
        filter_dict["has_available_units"] = "true"
        
    # Don't pass empty filter dictionary
    if not filter_dict:
        filter_dict = None
    
    # Search for apartments
    results = search_apartments(query, filter_dict, top_k)
    
    return jsonify({"results": results})