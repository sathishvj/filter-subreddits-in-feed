// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const subredditInput = document.getElementById('subredditInput');
  const addSubredditBtn = document.getElementById('addSubredditBtn');
  const blockedList = document.getElementById('blockedList');

  // Load and display current blocked list
  loadBlockedList();

  addSubredditBtn.addEventListener('click', () => {
    const subreddit = subredditInput.value.trim().toLowerCase();
    if (subreddit) {
      chrome.storage.sync.get(['blockedSubreddits'], (result) => {
        const blockedSubreddits = result.blockedSubreddits || [];
        if (!blockedSubreddits.includes(subreddit)) {
          blockedSubreddits.push(subreddit);
          chrome.storage.sync.set({ blockedSubreddits }, () => {
            subredditInput.value = '';
            loadBlockedList();
            // Optionally, send a message to content script to re-filter immediately
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "refreshFilters" });
              }
            });
          });
        }
      });
    }
  });

  function loadBlockedList() {
    blockedList.innerHTML = ''; // Clear current list
    chrome.storage.sync.get(['blockedSubreddits'], (result) => {
      const blockedSubreddits = result.blockedSubreddits || [];
      blockedSubreddits.forEach(sub => {
        const li = document.createElement('li');
        li.textContent = sub;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
          removeSubreddit(sub);
        });
        li.appendChild(removeBtn);
        blockedList.appendChild(li);
      });
    });
  }

  function removeSubreddit(subredditToRemove) {
    chrome.storage.sync.get(['blockedSubreddits'], (result) => {
      let blockedSubreddits = result.blockedSubreddits || [];
      blockedSubreddits = blockedSubreddits.filter(sub => sub !== subredditToRemove);
      chrome.storage.sync.set({ blockedSubreddits }, () => {
        loadBlockedList();
        // Optionally, send a message to content script to re-filter immediately
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, { action: "refreshFilters" });
            }
        });
      });
    });
  }
});

// In content.js, you would add:
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "refreshFilters") {
//     // Unhide everything first or ensure logic handles re-hiding correctly
//     // For simplicity, just re-run the main hiding function:
//     hideBlockedSubreddits();
//   }
// });
