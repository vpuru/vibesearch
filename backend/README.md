# VIBESearch Backend API

Flask backend for the VIBESearch apartment search application.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory with your Pinecone API key:
```
PINECONE_API_KEY=your_pinecone_api_key_here
```

## Running the Server

```bash
python run.py
```

The server will start on http://localhost:5000

## API Endpoints

### Search Apartments

```
GET /api/search
```

**Required Parameters:**
- `query` - The search query text for semantic search

**Optional Parameters:**
- `limit` - Number of results to return (default: 20)
- `city` - Filter by city
- `state` - Filter by state
- `min_rent` - Minimum rent
- `max_rent` - Maximum rent
- `min_beds` - Minimum number of bedrooms
- `max_beds` - Maximum number of bedrooms
- `min_baths` - Minimum number of bathrooms
- `max_baths` - Maximum number of bathrooms
- `studio` - Include studio apartments (true/false)
- `has_available_units` - Only show apartments with available units (true/false)

**Example Request:**
```
GET /api/search?query=modern apartment downtown&city=Los Angeles&max_rent=2500&min_beds=1&limit=30
```

**Example Response:**
```json
{
  "results": [
    {
      "id": "apartment-123",
      "score": 0.8975,
      "metadata": {
        "property_name": "Urban Heights",
        "city": "Los Angeles",
        "state": "CA",
        "min_rent": 2000,
        "max_rent": 2400,
        "min_beds": 1,
        "max_beds": 2,
        "url": "https://example.com/apartment/123"
      }
    },
    ...
  ]
}
```