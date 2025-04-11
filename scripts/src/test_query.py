from dotenv import load_dotenv
load_dotenv()

from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Initialize model and Pinecone
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
pc = Pinecone()
index = pc.Index('apartments-search')

# Create a test query
query = 'modern apartment with a pool and gym'
query_embedding = model.encode(query).tolist()

# Search
results = index.query(
    vector=query_embedding,
    top_k=3,
    include_metadata=True
)

# Print results
print(f"\nQuery: {query}\n")
for match in results['matches']:
    print(f"Score: {match.score:.3f}")
    print(f"Property: {match.metadata['propertyName']}")
    print(f"Rent: ${match.metadata['min_rent']} - ${match.metadata['max_rent']}")
    print(f"Location: {match.metadata['location']}")
    print(f"Amenities: {', '.join(match.metadata['amenities'][:5])}...")
    print() 