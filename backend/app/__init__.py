from flask import Flask, request, make_response
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    
    # Configure CORS to allow requests from the frontend
    CORS(app, resources={
        r"/api/*": {
            "origins": ["https://vibesearch-ui.vercel.app"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
            "max_age": 3600
        }
    })

    # Handle OPTIONS requests
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', 'https://vibesearch-ui.vercel.app')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint to verify the API is running"""
        return {"status": "ok", "message": "API is running"}

    return app
