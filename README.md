# VibeSearch - Apartment Search App

A semantic apartment search application using natural language queries to find properties.

## Project Structure

- `backend/`: Flask API server with Pinecone integration for semantic search
- `frontend/`: React TypeScript frontend with property search and display components
- `scripts/`: Data processing and test tools

## Getting Started

### Setup Environment

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/vibesearch.git
   cd vibesearch
   ```

2. **Backend Setup**

   ```bash
   cd backend

   # Create and activate a virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt

   # Create .env file (copy from example)
   cp .env.example .env

   # Edit .env file with your Pinecone API keys
   ```

3. **Frontend Setup**

   ```bash
   cd frontend

   # Install dependencies
   npm install
   ```

### Running the Development Environment

You can start both the frontend and backend in development mode with:

```bash
./start_dev.sh
```

Or start them individually:

**Backend:**

```bash
cd backend
source venv/bin/activate
python run.py
```

**Frontend:**

```bash
cd frontend
npm run dev
```

The frontend will be accessible at http://localhost:8080 and the backend API at http://127.0.0.1:8080.

## Features

- Natural language search for apartments
- Filters for price, bedrooms, bathrooms, and more
- Property cards with details and images
- Responsive design

## API Endpoints

- `GET /api/search`: Search for apartments

  - Query parameters:
    - `query`: Natural language search query (required)
    - `limit`: Maximum number of results (optional, default 50)
    - Filters: `city`, `state`, `min_rent`, `max_rent`, `min_beds`, `max_beds`, `min_baths`, `max_baths`, `studio`, `has_available_units`

- `GET /api/health`: Health check endpoint

## Development

### Mock Data

If you don't have a Pinecone API key, the backend will use mock data for development. This allows testing the frontend without requiring the Pinecone service.

### Debugging

- Frontend debugging logs can be viewed in the browser console
- Backend debugging logs are output to the terminal

## Troubleshooting

### CORS Issues

If you encounter CORS errors:

- Ensure the backend CORS configuration includes your frontend URL
- Check that frontend requests include the proper headers
- Make sure the API requests use the correct protocol (http/https)

### Connection Issues

- Verify the API_BASE_URL in frontend/src/services/config.ts matches your backend
- Ensure the backend server is running on the expected port
- Check for network errors in browser console
