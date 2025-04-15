chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractTranscript") {
      try {
        const lines = Array.from(document.querySelectorAll("ytd-transcript-segment-renderer span"))
          .map(el => el.innerText)
          .filter(Boolean);
        const result = lines.join("\n");
        sendResponse({ transcript: result });
      } catch (err) {
        sendResponse({ transcript: null, error: err.message });
      }
    }
    return true; // Needed for async sendResponse
  });
  