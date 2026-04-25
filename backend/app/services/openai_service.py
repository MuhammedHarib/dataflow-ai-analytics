import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def generate_openai_reply(message: str, free: bool = True):
    """
    Returns:
        reply (str)
        tokens_used (int)
    """

    model = "gpt-4o-mini" if free else "gpt-4o"

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": message}
        ],
        temperature=0.7,
        max_tokens=500,
    )

    reply = response.choices[0].message.content
    tokens_used = response.usage.total_tokens

    return reply, tokens_used