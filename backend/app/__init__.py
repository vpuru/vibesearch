from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Register routes
    from app.routes import search_bp
    app.register_blueprint(search_bp)
    
    return app