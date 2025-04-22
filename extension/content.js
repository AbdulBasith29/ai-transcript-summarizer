chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractTranscript") {
      try {
        let segments = document.querySelectorAll("ytd-transcript-segment-renderer span");
  
        // Fallback for newer YouTube transcript layout
        if (segments.length === 0) {
          console.log("⚠️ Trying updated selector...");
          segments = document.querySelectorAll("span.segment-text");
        }
  
        console.log("📺 Segments found:", segments.length);
  
        const lines = Array.from(segments)
          .map(el => el.innerText.trim())
          .filter(Boolean);
  
        console.log("📝 Extracted lines:", lines.length);
  
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
    return true;
  });
  