import os
import openai
from typing import List

def process_images_with_gpt4o(image_urls: List[str], user_query: str = "") -> str:
    """
    Process images with GPT-4o to generate descriptions for apartment search.
    
    Args:
        image_urls: List of image URLs to process
        user_query: Optional user query to provide context
        
    Returns:
        String description of the images suitable for apartment search
    """
    try:
        # Configure OpenAI client
        client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        # Prepare messages
        messages = [
            {
                "role": "system", 
                "content": "You are a helpful assistant that generates semantic search descriptions for apartment listings. Follow the prompt format exactly."
            }
        ]
        
        # Add user context if provided
        content_parts = []
        prompt = "In less than 20 words, describe the attached image(s) in a way that would help match other similar apartment images. Focus on aesthetics and design."
        if user_query:
            prompt = f"Based on these images and the user's query: '{user_query}', generate a concise search description focusing on visual aspects, style, and aesthetic preferences visible in the images. Keep it under 20 words."
        
        content_parts.append({"type": "text", "text": prompt})
        
        # Add image URLs
        for url in image_urls:
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": url}
            })
        
        messages.append({"role": "user", "content": content_parts})
        
        # Call GPT-4o
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=100
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error processing images with GPT-4o: {str(e)}")
        return "Modern stylish apartment space with clean lines and natural light"  # Fallback description 