chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractTranscript") {
      try {
        const segments = document.querySelectorAll("ytd-transcript-segment-renderer span");
        console.log("📺 Segments found:", segments.length);  // 👈 Log this
  
        const lines = Array.from(segments)
          .map(el => el.innerText)
          .filter(Boolean);
  
        console.log("📝 Extracted lines:", lines.length);  // 👈 Log this too
  
        const result = lines.join("\n");
  
        if (!result) {
          console.warn("⚠️ Transcript was empty or not found.");
        }
  
        sendResponse({ transcript: result });
      } catch (err) {
        console.error("❌ Error extracting transcript:", err);
        sendResponse({ transcript: null, error: err.message });
      }
    }
    return true; // Needed for async sendResponse
  });
  