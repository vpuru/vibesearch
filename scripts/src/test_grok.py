import json
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Get x.ai API key
XAI_API_KEY = os.getenv("XAI_API_KEY")
if not XAI_API_KEY:
    raise ValueError("XAI_API_KEY not found in environment variables")

# Initialize OpenAI client with x.ai base URL
client = OpenAI(
    api_key=XAI_API_KEY,
    base_url="https://api.x.ai/v1",
)


def test_grok_api():
    # Load a single property from the dataset
    with open("apartments.json", "r") as f:
        properties = json.load(f)
        test_property = properties[0]  # Use the first property

    # Read the prompt
    with open("prompt.txt", "r") as f:
        prompt = f.read()

    # Format input text
    input_text = (
        f"{prompt}\n\nInput Property Data:\n{json.dumps(test_property, indent=2)}"
    )

    try:
        # Test the Grok API call
        completion = client.chat.completions.create(
            model="grok-2-latest",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that generates semantic search descriptions for apartment listings.",
                },
                {"role": "user", "content": input_text},
            ],
        )

        description = completion.choices[0].message.content

        print("\nSuccess! Generated Description:")
        print("=" * 80)
        print(description)
        print("=" * 80)

    except Exception as e:
        print(f"\nError testing Grok API: {e}")


if __name__ == "__main__":
    test_grok_api()
