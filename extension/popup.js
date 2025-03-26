document.getElementById("summarizeBtn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "extractTranscript" },
        (response) => {
          const output = document.getElementById("output");
          if (response && response.transcript) {
            output.textContent = response.transcript;
          } else {
            output.textContent =
              "Transcript not found. Try refreshing or opening the transcript panel.";
          }
        }
      );
    });
  });
  