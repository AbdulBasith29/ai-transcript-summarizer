document.getElementById("summarizeBtn").addEventListener("click", () => {
    const spinner = document.getElementById("spinner");
    const output = document.getElementById("output");
  
    // Show the spinner and clear the output
    spinner.style.display = "block";
    output.textContent = "";
  
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "extractTranscript" },
        (response) => {
          // Hide the spinner
          spinner.style.display = "none";
  
          if (response && response.transcript) {
            const summary = response.transcript;
            output.textContent = summary;
  
            // Save the summary in local storage
            localStorage.setItem("lastSummary", summary);
          } else {
            output.textContent =
              "Transcript not found. Try refreshing or opening the transcript panel.";
          }
        }
      );
    });
  });
  
  // Load the last saved summary when the popup opens
  window.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("lastSummary");
    if (saved) {
      document.getElementById("output").textContent = saved;
    }
  });