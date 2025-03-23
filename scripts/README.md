# Apartment Search with Pinecone Vector Database

This project loads apartment data into a Pinecone vector database for semantic search of apartments based on their descriptions.

## Setup

1. Install the required packages:

   ```
   pip install -r requirements.txt
   ```

2. Set up your environment variables in the `.env` file:

   ```
   PINECONE_API_KEY=your_pinecone_api_key
   ```

   - Get a Pinecone API key by [signing up for Pinecone](https://www.pinecone.io)

## Usage

### 1. Loading Data into Pinecone

To load apartment data into the Pinecone vector database, run:

```
python src/pinecone_loader.py
```

This will:

- Load apartment data from `output/searchable_apartments_20250323_121136.json`
- Create embeddings for each apartment's semantic description using the sentence-transformers model
- Store the embeddings and metadata in a Pinecone index named "apartments-search"

### 2. Searching for Apartments

To search for apartments using semantic search, run:

```
python src/apartment_search.py
```

Follow the interactive prompts to:

- Enter your search query in natural language
- Apply optional filters for city, price range, and number of bedrooms
- Specify the number of results to return

Example queries:

- "Apartments near the beach with a pool"
- "Modern apartments with good public transit access"
- "Family-friendly apartments with hardwood floors"

## How It Works

1. The semantic descriptions of apartments are converted to vector embeddings using the all-MiniLM-L6-v2 model
2. All other apartment fields are stored as metadata for filtering
3. When you search, your query is also converted to a vector embedding
4. Pinecone finds the most semantically similar apartment descriptions to your query
5. You can filter results by metadata to narrow down options

## Notes

- The Pinecone index is created using the serverless tier in the us-west-2 region
- The embedding model is all-MiniLM-L6-v2 (384 dimensions) from sentence-transformers
- This is a free, open-source alternative to commercial embedding models
- Batch processing is used to efficiently load data in chunks
