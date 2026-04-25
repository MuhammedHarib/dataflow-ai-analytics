# app/utils/helpers.py
def count_tokens(text: str) -> int:
    return len(text.split())

def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    words = text.split()
    return [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]