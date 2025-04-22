chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractTranscript") {
      try {
        const segments = document.querySelectorAll("ytd-transcript-segment-renderer");
        const lines = Array.from(segments)
          .map(el => el.innerText.trim())
          .filter(Boolean);
        sendResponse({ transcript: lines.join("\n") });
      } catch (err) {
        sendResponse({ transcript: null, error: err.message });
      }
    }
    return true;
  });
  