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
  const toggleChatBtn = document.getElementById("toggleChatBtn");

  let currentTranscript = null;
  let chatHistory = [];
  let currentVideoId = null;
  let chatVisible = false;

  // --- Helpers for per-video storage ---
  function getVideoIdFromUrl(url) {
    const match = url.match(/[?&]v=([\w-]{11})/);
    return match ? match[1] : null;
  }

  function getStorageKey(key) {
    return `ytai_${currentVideoId}_${key}`;
  }

  function saveState(summary, transcript, chatHistory) {
    if (!currentVideoId) return;
    localStorage.setItem(getStorageKey("summary"), summary);
    localStorage.setItem(getStorageKey("transcript"), transcript);
    localStorage.setItem(getStorageKey("chatHistory"), JSON.stringify(chatHistory));
  }

  function loadState() {
    if (!currentVideoId) return { summary: null, transcript: null, chatHistory: [] };
    return {
      summary: localStorage.getItem(getStorageKey("summary")),
      transcript: localStorage.getItem(getStorageKey("transcript")),
      chatHistory: JSON.parse(localStorage.getItem(getStorageKey("chatHistory")) || "[]")
    };
  }

  function clearState() {
    if (!currentVideoId) return;
    localStorage.removeItem(getStorageKey("summary"));
    localStorage.removeItem(getStorageKey("transcript"));
    localStorage.removeItem(getStorageKey("chatHistory"));
  }

  // --- Chat UI ---
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
    // Save to chat history
    chatHistory.push({ content, isUser });
    localStorage.setItem(getStorageKey("chatHistory"), JSON.stringify(chatHistory));
  }

  function renderChatHistory() {
    chatMessages.innerHTML = '';
    chatHistory.forEach(msg => addMessage(msg.content, msg.isUser));
  }

  // --- Toggle chat visibility ---
  toggleChatBtn.addEventListener('click', () => {
    chatVisible = !chatVisible;
    chatMessages.style.display = chatVisible ? 'block' : 'none';
    toggleChatBtn.textContent = chatVisible ? 'Hide Previous Q&A' : 'Show Previous Q&A';
  });

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
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 180) + 'px';
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
      // Get current video ID
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentVideoId = getVideoIdFromUrl(tab.url);
      if (!tab.url?.includes("youtube.com/watch") || !currentVideoId) {
        throw new Error("Please navigate to a YouTube video page first.");
      }
      // Clear previous state for new video
      clearState();
      chatHistory = [];
      renderChatHistory();
      chatVisible = false;
      chatMessages.style.display = 'none';
      toggleChatBtn.textContent = 'Show Previous Q&A';
      updateProgress(20, "Extracting transcript...");
      updateStatus("Extracting transcript from video...");
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
      currentTranscript = response.transcript;
      updateProgress(40, "Transcript extracted!");
      updateStatus("Transcript extracted successfully", 'success');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateProgress(50, "Sending to AI for summarization...");
      updateStatus("Generating summary...");
      const summary = await summarizeTranscript(response.transcript);
      updateProgress(100, "Summary complete!");
      updateStatus("Summary generated successfully", 'success');
      output.innerHTML = formatSummary(summary);
      saveState(summary, currentTranscript, chatHistory);
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

  // --- Restore state on load ---
  (async function restoreOnLoad() {
    // Get current video ID
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentVideoId = getVideoIdFromUrl(tab.url);
    const { summary, transcript, chatHistory: savedChat } = loadState();
    if (summary && transcript) {
      output.innerHTML = formatSummary(summary);
      currentTranscript = transcript;
      chatInput.disabled = false;
      chatInput.placeholder = "Ask a question about the video...";
    } else {
      chatInput.disabled = true;
      chatInput.placeholder = "Please summarize the video first...";
    }
    chatHistory = savedChat || [];
    renderChatHistory();
    chatVisible = false;
    chatMessages.style.display = 'none';
    toggleChatBtn.textContent = 'Show Previous Q&A';
  })();
});
  