document.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");
  const loadingContainer = document.getElementById("loadingContainer");
  const loadingProgress = document.getElementById("loadingProgress");
  const loadingText = document.getElementById("loadingText");
  const statusContainer = document.getElementById("statusContainer");
  const statusIcon = document.getElementById("statusIcon");
  const statusText = document.getElementById("statusText");
  const summarizeBtn = document.getElementById("summarizeBtn");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const chatMessages = document.getElementById("chatMessages");
  const responseFormat = document.getElementById("responseFormat");

  let currentTranscript = null;

  function formatSummary(text) {
    // Split the text into sections based on "Chunk X Summary:" markers
    const sections = text.split(/(?=Chunk \d+ Summary:)/);
    
    // Format each section
    const formattedSections = sections.map(section => {
      // Extract the chunk number and content
      const match = section.match(/Chunk (\d+) Summary:(.*)/s);
      if (!match) return section;

      const [, chunkNum, content] = match;
      
      // Clean up the content
      const cleanContent = content.trim()
        .replace(/\n+/g, '\n')  // Replace multiple newlines with single newline
        .replace(/\n/g, '<br>') // Replace newlines with <br> tags
        .replace(/•/g, '<br>•'); // Add line breaks before bullet points

      return `
        <div class="summary-section">
          <div class="summary-title">Part ${chunkNum}</div>
          <div class="summary-content">${cleanContent}</div>
        </div>
      `;
    });

    return formattedSections.join('');
  }

  function updateStatus(message, type = 'info') {
    statusContainer.style.display = 'flex';
    statusText.textContent = message;
    
    switch(type) {
      case 'error':
        statusIcon.textContent = '❌';
        statusText.className = 'error';
        break;
      case 'success':
        statusIcon.textContent = '✅';
        statusText.className = 'success';
        break;
      default:
        statusIcon.textContent = '⏳';
        statusText.className = '';
    }
  }

  function updateProgress(percent, message) {
    loadingProgress.style.width = `${percent}%`;
    loadingText.textContent = message;
  }

  function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function askQuestion(question) {
    if (!currentTranscript) {
      addMessage("Please summarize the video first before asking questions.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question,
          transcript: currentTranscript,
          format: responseFormat.value
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get response from server");
      }

      const data = await response.json();
      addMessage(data.answer);
    } catch (error) {
      addMessage("Sorry, I couldn't process your question. Please try again.");
    }
  }

  // Handle chat input
  chatInput.addEventListener('input', () => {
    sendBtn.disabled = !chatInput.value.trim();
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        sendBtn.click();
      }
    }
  });

  sendBtn.addEventListener('click', async () => {
    const question = chatInput.value.trim();
    if (!question) return;

    addMessage(question, true);
    chatInput.value = '';
    sendBtn.disabled = true;
    await askQuestion(question);
  });

  summarizeBtn.addEventListener("click", async () => {
    output.textContent = "";
    loadingContainer.style.display = "block";
    statusContainer.style.display = "none";
    summarizeBtn.disabled = true;
    updateProgress(0, "Initializing...");

    try {
      // First check if we're on a YouTube video page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url?.includes("youtube.com/watch")) {
        throw new Error("Please navigate to a YouTube video page first.");
      }

      updateProgress(20, "Extracting transcript...");
      updateStatus("Extracting transcript from video...");

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

      // Store the transcript for chat
      currentTranscript = response.transcript;

      updateProgress(40, "Transcript extracted!");
      updateStatus("Transcript extracted successfully", 'success');
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause to show success

      updateProgress(50, "Sending to AI for summarization...");
      updateStatus("Generating summary...");

      // Get the summary from the backend
      const summary = await summarizeTranscript(response.transcript);
      
      updateProgress(100, "Summary complete!");
      updateStatus("Summary generated successfully", 'success');
      
      // Format and display the summary
      output.innerHTML = formatSummary(summary);
      localStorage.setItem("lastSummary", summary);

      // Enable chat
      chatInput.disabled = false;
      chatInput.placeholder = "Ask a question about the video...";

    } catch (error) {
      updateStatus(error.message, 'error');
      output.textContent = `❌ ${error.message}`;
      chatInput.disabled = true;
      chatInput.placeholder = "Please summarize the video first...";
    } finally {
      loadingContainer.style.display = "none";
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
  