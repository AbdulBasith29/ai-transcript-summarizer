chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractTranscript") {
    getTranscript()
      .then(transcript => sendResponse({ transcript }))
      .catch(error => sendResponse({ transcript: null, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

async function getTranscript() {
  // First, check if we're on a video page
  if (!window.location.pathname.includes('/watch')) {
    throw new Error('Not a YouTube video page');
  }

  // Try to find the transcript button
  const menuContainer = document.querySelector('ytd-menu-renderer');
  if (!menuContainer) {
    throw new Error('Menu container not found');
  }

  // Click the more actions button if transcript panel isn't open
  const transcriptSegments = document.querySelectorAll("ytd-transcript-segment-renderer");
  if (transcriptSegments.length === 0) {
    const moreButton = Array.from(menuContainer.querySelectorAll('button'))
      .find(button => button.getAttribute('aria-label')?.includes('More actions'));
    
    if (!moreButton) {
      throw new Error('More actions button not found');
    }
    
    moreButton.click();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for menu to open

    // Find and click the "Show transcript" button
    const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer');
    const transcriptButton = Array.from(menuItems)
      .find(item => item.textContent.toLowerCase().includes('transcript'));
    
    if (!transcriptButton) {
      throw new Error('Transcript button not found. Transcript might not be available.');
    }

    transcriptButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for transcript to load
  }

  // Now get the transcript segments
  const segments = document.querySelectorAll("ytd-transcript-segment-renderer");
  if (segments.length === 0) {
    throw new Error('No transcript segments found');
  }

  const lines = Array.from(segments)
    .map(el => el.innerText.trim())
    .filter(Boolean);

  return lines.join("\n");
}
  