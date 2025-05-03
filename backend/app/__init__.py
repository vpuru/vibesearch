from flask import Flask, request, make_response
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    
    # Configure CORS to allow requests from any origin
    CORS(app, origins=["https://vibesearch-ui.vercel.app"])

    # Add CORS headers to all responses using an after_request handler
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin and origin in [
            "https://vibesearch-ui.vercel.app",
        ]:
            response.headers.add("Access-Control-Allow-Origin", origin)
        response.headers.add(
            "Access-Control-Allow-Headers", "Content-Type,Authorization,Accept"
        )
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response

    # Add OPTIONS method handler for preflight requests
    @app.route("/api/<path:path>", methods=["OPTIONS"])
    def options_handler(path):
        response = make_response()
        origin = request.headers.get("Origin")
        if origin and origin in [
            "https://vibesearch-ui.vercel.app",
        ]:
            response.headers.add("Access-Control-Allow-Origin", origin)
        response.headers.add(
            "Access-Control-Allow-Headers", "Content-Type,Authorization,Accept"
        )
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        response.headers.add("Access-Control-Max-Age", "3600")
        return response
    
    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint to verify the API is running"""
        return {"status": "ok", "message": "API is running"}

    return app

