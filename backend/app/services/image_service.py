# app/services/image_service.py
"""
Image Analysis Service.

Uses Groq's vision model to analyze uploaded images.
Returns structured analysis: detected object, confidence, description.
Future use: dashboard design analysis from screenshot.
"""

import os
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client     = Groq(api_key=os.getenv("GROQ_API_KEY"))
# Groq vision model
VIS_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct"

SUPPORTED_IMAGE_TYPES = {
    "image/jpeg":  "jpeg",
    "image/jpg":   "jpeg",
    "image/png":   "png",
    "image/gif":   "gif",
    "image/webp":  "webp",
}

IMAGE_SYSTEM_PROMPT = """You are an expert image analyst.

When analyzing an image, always follow this exact structure in your response:

**Detected Object:** [primary subject — animal, object, person, scene, dashboard, chart, etc.]
**Confidence:** [High / Medium / Low]
**Description:** [2–4 sentences describing visible features: color, shape, size, context, environment]

Additional rules:
- If it is an animal: identify the species, breed if visible, and behavioral context
- If it is a dashboard or UI screenshot: describe the layout, sections, color scheme, chart types present, and overall design style — this helps in recreating or improving the design
- If it is a chart or data visualization: identify the chart type, apparent data domain, axes if visible
- If it is a document or spreadsheet: describe the structure and apparent content
- Never return an empty or vague response
- Always provide your best assessment even if uncertain — use "Low confidence" for unclear images
- Be specific and professional"""


def is_image_file(content_type: str) -> bool:
    return content_type in SUPPORTED_IMAGE_TYPES


def analyze_image(image_bytes: bytes, content_type: str, user_message: str = "") -> dict:
    """
    Analyze an image using Groq vision model.

    Args:
        image_bytes:  Raw image bytes
        content_type: MIME type e.g. "image/jpeg"
        user_message: Optional user question about the image

    Returns:
        {reply, source, warning}
    """
    media_type = content_type if content_type in SUPPORTED_IMAGE_TYPES else "image/jpeg"

    # Encode to base64
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    image_url = f"data:{media_type};base64,{b64}"

    user_text = user_message.strip() if user_message.strip() else "Analyze this image in detail."

    try:
        response = client.chat.completions.create(
            model=VIS_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": IMAGE_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url},
                        },
                        {
                            "type": "text",
                            "text": user_text,
                        },
                    ],
                },
            ],
            temperature=0.3,
            max_tokens=1000,
        )
        return {
            "reply":   response.choices[0].message.content,
            "source":  "Groq Vision",
            "warning": None,
        }
    except Exception as e:
        print(f"Groq Vision Error: {e}")
        # Fallback: if vision model unavailable, return informative error
        return {
            "reply":   "Image analysis is currently unavailable. Please ensure the Groq vision model is accessible.",
            "source":  "Groq Vision",
            "warning": f"Vision model error: {str(e)}",
        }