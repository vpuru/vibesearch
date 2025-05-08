from flask import Flask, request, jsonify
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    
    # Allow all origins and headers (disable CORS restrictions)
    CORS(app, supports_credentials=True)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint to verify the API is running"""
        return {"status": "ok", "message": "API is running"}
    
    @app.route("/", methods=["GET"])
    def root_health():
        return {"status": "ok", "message": "API root is running"}, 200
    
    # Import and register blueprints
    from app.routes import search_bp
    app.register_blueprint(search_bp)

    return app
