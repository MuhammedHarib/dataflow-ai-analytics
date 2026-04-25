import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def generate_gemini_reply(message: str):
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(message)
        return response.text, 0
    except Exception as e:
        print("Gemini Error:", e)
        raise