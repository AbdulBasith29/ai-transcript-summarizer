from flask import Flask, request, jsonify
import requests
import os
from flask import Flask, request, jsonify
from flask_cors import CORS  # 👈 Add this

app = Flask(__name__)
CORS(app)  # 👈 This enables CORS for all routes

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

# --- QUESTION ANSWERING FUNCTION ---
def answer_question(question, transcript, format_type="paragraph", api_key=TOGETHER_API_KEY, model=MODEL):
    """
    Answers a question about the transcript using Together.ai.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    format_instruction = "Provide your answer in a clear, concise paragraph." if format_type == "paragraph" else "Provide your answer as a bullet-point list of key points."

    prompt = f"""Based on the following transcript, answer this question: {question}

Transcript:
{transcript}

Instructions:
{format_instruction}
Focus on providing accurate information from the transcript.
If the answer cannot be found in the transcript, say so.
Keep the response concise and relevant to the question.

Answer:"""

    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 500,
        "temperature": 0.7
    }

    response = requests.post("https://api.together.xyz/v1/chat/completions", headers=headers, json=body)

    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        return f"[Error answering question] {response.text}"

# --- FLASK ENDPOINTS ---
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

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get("question", "")
    transcript = data.get("transcript", "")
    format_type = data.get("format", "paragraph")

    if not TOGETHER_API_KEY:
        return jsonify({"error": "Together.ai API key not found. Set TOGETHER_API_KEY env var."}), 400

    if not question or not transcript:
        return jsonify({"error": "Question and transcript are required"}), 400

    answer = answer_question(question, transcript, format_type)
    return jsonify({"answer": answer})

# --- MAIN ---
if __name__ == "__main__":
    app.run(debug=True)
