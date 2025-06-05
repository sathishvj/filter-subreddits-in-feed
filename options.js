// options.js
document.addEventListener('DOMContentLoaded', () => {
  const subredditInput = document.getElementById('subredditInput');
  const addSubredditBtn = document.getElementById('addSubredditBtn');
  const blockedList = document.getElementById('blockedList');

  // Load and display current blocked list
  loadBlockedList();

  // Add event listener for the add button
  addSubredditBtn.addEventListener('click', addSubreddit);

  // Add event listener for Enter key in input field
  subredditInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addSubreddit();
    }
  });

  function addSubreddit() {
    const subreddit = subredditInput.value.trim().toLowerCase();
    if (subreddit) {
      chrome.storage.sync.get(['blockedSubreddits'], (result) => {
        const blockedSubreddits = result.blockedSubreddits || [];
        if (!blockedSubreddits.includes(subreddit)) {
          blockedSubreddits.push(subreddit);
          chrome.storage.sync.set({ blockedSubreddits }, () => {
            subredditInput.value = '';
            loadBlockedList();
            // Send message to all Reddit tabs to refresh filters
            chrome.tabs.query({ url: "*://*.reddit.com/*" }, (tabs) => {
              tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: "refreshFilters" });
              });
            });
          });
        } else {
          alert('Subreddit is already blocked!');
        }
      });
    }
  }

  function loadBlockedList() {
    blockedList.innerHTML = ''; // Clear current list
    chrome.storage.sync.get(['blockedSubreddits'], (result) => {
      const blockedSubreddits = result.blockedSubreddits || [];
      if (blockedSubreddits.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No subreddits blocked yet.';
        li.style.fontStyle = 'italic';
        li.style.color = '#666';
        blockedList.appendChild(li);
      } else {
        blockedSubreddits.forEach(sub => {
          const li = document.createElement('li');
          const subText = document.createElement('span');
          subText.textContent = `r/${sub}`;
          li.appendChild(subText);
          
          const removeBtn = document.createElement('button');
          removeBtn.textContent = 'Remove';
          removeBtn.className = 'remove-btn';
          removeBtn.addEventListener('click', () => {
            removeSubreddit(sub);
          });
          li.appendChild(removeBtn);
          blockedList.appendChild(li);
        });
      }
    });
  }

  function removeSubreddit(subredditToRemove) {
    chrome.storage.sync.get(['blockedSubreddits'], (result) => {
      let blockedSubreddits = result.blockedSubreddits || [];
      blockedSubreddits = blockedSubreddits.filter(sub => sub !== subredditToRemove);
      chrome.storage.sync.set({ blockedSubreddits }, () => {
        loadBlockedList();
        // Send message to all Reddit tabs to refresh filters
        chrome.tabs.query({ url: "*://*.reddit.com/*" }, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: "refreshFilters" });
          });
        });
      });
    });
  }
});