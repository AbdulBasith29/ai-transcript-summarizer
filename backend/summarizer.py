from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

# Set your Together.ai API key as an environment variable or paste it here
TOGETHER_API_KEY = os.environ.get("TOGETHER_API_KEY")
MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"  #swap later to gpt-4 or mixtral

# --- CHUNKING FUNCTION ---
def chunk_text(text, max_words=1500):
    """
    Splits the input text into chunks of approx. `max_words` words.
    """
    words = text.split()
    for i in range(0, len(words), max_words):
        yield " ".join(words[i:i + max_words])

# --- SUMMARIZATION FUNCTION ---
def summarize_chunk(chunk, api_key, model=MODEL):
    """
    Sends one chunk to Together.ai for summarization.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    body = {
        "model": model,
        "messages": [{"role": "user", "content": f"Summarize the following:\n\n{chunk}"}],
        "max_tokens": 300,
        "temperature": 0.7
    }

    response = requests.post("https://api.together.xyz/v1/chat/completions", headers=headers, json=body)

    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        return f"[Error summarizing chunk] {response.text}"

# --- FLASK ENDPOINT ---
@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json()
    transcript = data.get("transcript", "")

    if not TOGETHER_API_KEY:
        return jsonify({"error": "Together.ai API key not found. Set TOGETHER_API_KEY env var."}), 400

    summaries = []

    for i, chunk in enumerate(chunk_text(transcript)):
        print(f"Summarizing chunk {i + 1}...")
        summary = summarize_chunk(chunk, TOGETHER_API_KEY)
        summaries.append(f"Chunk {i + 1} Summary:\n{summary}\n")

    final_summary = "\n".join(summaries)

    return jsonify({"summary": final_summary})

# --- MAIN ---
if __name__ == "__main__":
    app.run(debug=True)
