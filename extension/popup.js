document.getElementById("summarizeBtn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: extractTranscript
      }, (results) => {
        const output = document.getElementById("output");
        if (results && results[0] && results[0].result) {
          output.textContent = results[0].result;
        } else {
          output.textContent = "Transcript not found. Try refreshing or opening the transcript panel.";
        }
      });
    });
  });
  
  function extractTranscript() {
    try {
      const lines = Array.from(document.querySelectorAll("ytd-transcript-segment-renderer span"))
        .map(el => el.innerText)
        .filter(Boolean);
      return lines.join("\n");
    } catch (err) {
      return "Error extracting transcript: " + err.message;
    }
  }
  