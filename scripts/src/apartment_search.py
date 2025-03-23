#!/usr/bin/env python3
"""
Apartment Semantic Search CLI

This script allows you to search for apartments using semantic search and optional filters.

Examples:
    Basic search:
    python3 apartment_search.py "modern apartment with view"

    Search with filters:
    python3 apartment_search.py "cozy studio downtown" --city "Los Angeles" --max-rent 2500 --studio

    Search with bedroom requirements:
    python3 apartment_search.py "luxury apartment" --min-beds 2 --max-beds 3 --min-rent 2000 --results 5
"""

import os
import argparse
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

# Check if required API key is set
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in environment variables")

# Initialize sentence-transformer model
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Initialize Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)

# Constants
INDEX_NAME = "apartments-search"


def create_embedding(text):
    """Create an embedding for the given text using sentence-transformers"""
    try:
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"Error creating embedding: {e}")
        return None


def search_apartments(query, filter_dict=None, top_k=10):
    """
    Search for apartments in the Pinecone index

    Args:
        query (str): The search query
        filter_dict (dict, optional): Filter criteria for metadata. Defaults to None.
        top_k (int, optional): Number of results to return. Defaults to 10.

    Returns:
        list: List of matching apartments with scores
    """
    # Get the index
    index = pc.Index(INDEX_NAME)

    # Create embedding for the query
    query_embedding = create_embedding(query)

    if query_embedding is None:
        print("Failed to create embedding for query")
        return []

    # Search the index
    search_results = index.query(
        vector=query_embedding, filter=filter_dict, top_k=top_k, include_metadata=True
    )

    # Format results
    formatted_results = []
    for match in search_results.matches:
        result = {"id": match.id, "score": match.score, "metadata": match.metadata}
        formatted_results.append(result)

    return formatted_results


def print_results(results):
    """Print search results in a readable format"""
    if not results:
        print("No results found")
        return

    print(f"\n===== Found {len(results)} matching apartments =====\n")

    for i, result in enumerate(results, 1):
        metadata = result["metadata"]
        print(
            f"{i}. {metadata.get('property_name', 'N/A')} (Score: {result['score']:.4f})"
        )
        print(
            f"   Location: {metadata.get('city', 'N/A')}, {metadata.get('state', 'N/A')}"
        )
        print(
            f"   Rent: ${metadata.get('min_rent', 'N/A')} - ${metadata.get('max_rent', 'N/A')}"
        )
        print(
            f"   Beds: {metadata.get('min_beds', 'N/A')} - {metadata.get('max_beds', 'N/A')}"
        )
        print(f"   URL: {metadata.get('url', 'N/A')}")
        print()


def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(
        description="Search for apartments using semantic search"
    )
    parser.add_argument("query", help="The search query for semantic search (required)")
    parser.add_argument("--city", help="Filter by city")
    parser.add_argument("--state", help="Filter by state")
    parser.add_argument("--min-rent", type=int, help="Minimum rent")
    parser.add_argument("--max-rent", type=int, help="Maximum rent")
    parser.add_argument("--min-beds", type=float, help="Minimum number of bedrooms")
    parser.add_argument("--max-beds", type=float, help="Maximum number of bedrooms")
    parser.add_argument("--min-baths", type=float, help="Minimum number of bathrooms")
    parser.add_argument("--max-baths", type=float, help="Maximum number of bathrooms")
    parser.add_argument(
        "--studio", action="store_true", help="Include studio apartments"
    )
    parser.add_argument(
        "--has-available-units",
        action="store_true",
        help="Only show apartments with available units",
    )
    parser.add_argument(
        "--results",
        type=int,
        default=10,
        help="Number of results to return (default: 10)",
    )

    # Parse arguments
    args = parser.parse_args()

    # Build filter dictionary from arguments
    filter_dict = {}

    if args.city:
        filter_dict["city"] = args.city

    if args.state:
        filter_dict["state"] = args.state

    if args.min_rent:
        filter_dict["min_rent"] = {"$gte": args.min_rent}

    if args.max_rent:
        filter_dict["max_rent"] = {"$lte": args.max_rent}

    if args.min_beds:
        filter_dict["min_beds"] = {"$gte": args.min_beds}

    if args.max_beds:
        filter_dict["max_beds"] = {"$lte": args.max_beds}

    if args.min_baths:
        filter_dict["min_baths"] = {"$gte": args.min_baths}

    if args.max_baths:
        filter_dict["max_baths"] = {"$lte": args.max_baths}

    if args.studio:
        filter_dict["is_studio"] = "true"

    if args.has_available_units:
        filter_dict["has_available_units"] = "true"

    # Don't pass empty filter dictionary
    if not filter_dict:
        filter_dict = None

    # Search for apartments
    results = search_apartments(args.query, filter_dict, args.results)

    # Print results
    print_results(results)


if __name__ == "__main__":
    main()
