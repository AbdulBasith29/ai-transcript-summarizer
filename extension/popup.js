document.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");
  const loading = document.getElementById("loading");
  const summarizeBtn = document.getElementById("summarizeBtn");

  summarizeBtn.addEventListener("click", async () => {
    output.textContent = "";
    loading.style.display = "block";
    summarizeBtn.disabled = true;

    try {
      // First check if we're on a YouTube video page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url?.includes("youtube.com/watch")) {
        throw new Error("Please navigate to a YouTube video page first.");
      }

      // Try to get the transcript
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tab.id,
          { action: "extractTranscript" },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error("Could not connect to YouTube tab. Please refresh the page and try again."));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (!response?.transcript) {
        throw new Error(response?.error || "Could not find transcript. Make sure captions are available for this video.");
      }

      // Get the summary from the backend
      const summary = await summarizeTranscript(response.transcript);
      output.textContent = summary;
      localStorage.setItem("lastSummary", summary);

    } catch (error) {
      output.textContent = `❌ ${error.message}`;
    } finally {
      loading.style.display = "none";
      summarizeBtn.disabled = false;
    }
  });

  async function summarizeTranscript(transcript) {
    try {
      const response = await fetch("http://localhost:5000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Server error: ${error}`);
      }

      const data = await response.json();
      return data.summary;
    } catch (err) {
      if (err.message.includes("Failed to fetch")) {
        throw new Error("Could not connect to backend server. Make sure Flask is running on port 5000.");
      }
      throw err;
    }
  }
});
  