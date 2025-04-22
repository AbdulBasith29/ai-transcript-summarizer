document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("summarizeBtn").addEventListener("click", () => {
      const output = document.getElementById("output");
      const loading = document.getElementById("loading");
  
      output.textContent = "";
      loading.style.display = "block";
  
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "extractTranscript" },
          async (response) => {
            if (chrome.runtime.lastError) {
              output.textContent = "❌ Could not connect to YouTube tab. Make sure you're on a video page.";
              loading.style.display = "none";
              return;
            }
  
            if (response && response.transcript) {
              const summary = await summarizeTranscript(response.transcript);
              output.textContent = summary;
              localStorage.setItem("lastSummary", summary);
            } else {
              output.textContent = "❌ Transcript not found. Make sure it's open.";
            }
  
            loading.style.display = "none";
          }
        );
      });
    });
  
    async function summarizeTranscript(transcript) {
      try {
        const response = await fetch("http://localhost:5000/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript })
        });
  
        if (!response.ok) throw new Error("Server error");
  
        const data = await response.json();
        return data.summary;
      } catch (err) {
        return "❌ Could not connect to backend. Is Flask running?";
      }
    }
  });
  