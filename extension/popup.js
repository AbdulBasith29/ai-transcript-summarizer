document.getElementById("summarizeBtn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          const segments = document.querySelectorAll("ytd-transcript-segment-renderer");
          return Array.from(segments).map(el => el.innerText).join("\n");
        }
      }, (results) => {
        const output = document.getElementById("output");
        if (results && results[0] && results[0].result) {
          output.textContent = results[0].result;
        } else {
          output.textContent = "Transcript not found. Try opening the transcript panel.";
        }
      });
    });
  });
  