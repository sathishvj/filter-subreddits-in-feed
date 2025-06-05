// content.js

let blockedSubreddits = [];

function applyStyles(postElement, shouldHide) {
  if (shouldHide) {
    postElement.classList.add("hidden-by-extension");
    // Or directly: postElement.style.display = 'none';
  } else {
    postElement.classList.remove("hidden-by-extension");
    // Or directly: postElement.style.display = ''; // Or original display value
  }
}

function addFilterButton(post, subredditName, subredditElement) {
  // Check if button already exists
  if (post.querySelector(".reddit-filter-button")) {
    return;
  }

  const button = document.createElement("button");
  button.className = "reddit-filter-button";
  button.textContent = blockedSubreddits.includes(subredditName)
    ? "Filtered"
    : "Filter";
  button.title = `Filter out r/${subredditName}`;

  if (blockedSubreddits.includes(subredditName)) {
    button.classList.add("filtered");
  }

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSubredditFilter(subredditName, button);
  });

  // Ensure the post container has relative positioning for absolute positioning to work
  const computedStyle = window.getComputedStyle(post);
  if (computedStyle.position === "static") {
    post.style.position = "relative";
  }

  // Try to insert after the feed post credit bar, otherwise append to the post
  const creditBarElement = post.querySelector('[id^="feed-post-credit-bar"]');
  if (creditBarElement && creditBarElement.parentNode) {
    // Insert 'button' after 'creditBarElement'
    creditBarElement.parentNode.insertBefore(
      button,
      creditBarElement.nextSibling
    );
  } else {
    // Fallback: Add button directly to the post container
    post.appendChild(button);
  }

  // post.appendChild(button);
}

function toggleSubredditFilter(subredditName, buttonElement) {
  chrome.storage.sync.get(["blockedSubreddits"], (result) => {
    let blockedSubreddits = result.blockedSubreddits || [];
    const isCurrentlyBlocked = blockedSubreddits.includes(subredditName);

    if (isCurrentlyBlocked) {
      // Remove from blocked list
      blockedSubreddits = blockedSubreddits.filter(
        (sub) => sub !== subredditName
      );
      buttonElement.textContent = "Filter";
      buttonElement.classList.remove("filtered");
    } else {
      // Add to blocked list
      blockedSubreddits.push(subredditName);
      buttonElement.textContent = "Filtered";
      buttonElement.classList.add("filtered");
    }

    chrome.storage.sync.set({ blockedSubreddits }, () => {
      // Update local copy and re-filter
      loadAndFilter();
    });
  });
}

function filterFeedContent() {
  // --- SELECTORS ARE CRUCIAL AND LIKELY TO CHANGE ---
  // These are examples. You MUST inspect Reddit's current HTML structure.
  // A general selector for post containers across different feeds:
  const postSelectors = [
    'div[data-testid="post-container"]', // New Reddit card view
    "div.Post", // Older Reddit views or variations
    "article", // General semantic tag often used for posts
    ".scrollerItem", // Often used in infinite scrolling lists
    // Add more selectors if Reddit uses different structures in different feeds
  ].join(", "); // Combine into a single query string

  const posts = document.querySelectorAll(postSelectors);

  posts.forEach((post) => {
    // Attempt to find the subreddit name within the post.
    // This is highly dependent on Reddit's HTML structure.
    let subredditName = null;
    let subredditElement = null;
    const subredditLinkSelectors = [
      'a[data-testid="subreddit-name"]', // New Reddit
      'a[href*="/r/"][data-post-click-location="subreddit"]', // Common pattern
      ".Post__subredditLink", // Example for a specific class
      "a._2tbHP6ZydRpjI44J3syuqL", // Example of an obfuscated class (less stable)
    ];

    for (const selector of subredditLinkSelectors) {
      subredditElement = post.querySelector(selector);
      if (subredditElement) {
        const textContent = subredditElement.textContent.trim(); // e.g., "r/askreddit"
        const href = subredditElement.getAttribute("href"); // e.g., "/r/askreddit/"

        if (textContent.startsWith("r/")) {
          subredditName = textContent.substring(2).toLowerCase();
          break;
        } else if (href) {
          const match = href.match(/\/r\/([^/]+)/i);
          if (match && match[1]) {
            subredditName = match[1].toLowerCase();
            break;
          }
        }
      }
    }

    if (subredditName) {
      // Add filter button to each post
      addFilterButton(post, subredditName, subredditElement);

      // Apply filtering logic
      if (blockedSubreddits.includes(subredditName)) {
        // console.log(`Hiding post from: r/${subredditName}`);
        applyStyles(post, true);
      } else {
        // Ensure post is visible if it was previously hidden but subreddit is no longer blocked
        applyStyles(post, false);
      }
    }
  });
}

// Load blocked subreddits from storage and then filter
function loadAndFilter() {
  chrome.storage.sync.get(["blockedSubreddits"], (result) => {
    blockedSubreddits = (result.blockedSubreddits || []).map((s) =>
      s.toLowerCase()
    );
    filterFeedContent();
  });
}

// Initial filtering
loadAndFilter();

// Observe DOM changes for dynamically loaded content (infinite scroll)
const observer = new MutationObserver((mutations) => {
  let newContentPotentiallyAdded = false;
  for (const mutation of mutations) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        // A very basic check. Be more specific if possible to improve performance.
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.matches &&
          (node.matches(
            'div[data-testid="post-container"], div.Post, article, .scrollerItem'
          ) ||
            node.querySelector(
              'div[data-testid="post-container"], div.Post, article, .scrollerItem'
            ))
        ) {
          newContentPotentiallyAdded = true;
          break;
        }
      }
    }
    if (newContentPotentiallyAdded) break;
  }

  if (newContentPotentiallyAdded) {
    // console.log('New content detected, re-filtering.');
    filterFeedContent(); // Re-run the filter on new content
  }
});

// Start observing the document body for added child nodes in the entire subtree
observer.observe(document.documentElement, {
  // Observe documentElement for wider coverage
  childList: true,
  subtree: true,
});

// Listen for messages from the popup (e.g., when the blocklist is updated)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "refreshFilters") {
    // console.log('Blocklist updated, re-filtering.');
    loadAndFilter(); // Reload list and re-filter
    sendResponse({ status: "Filters refreshed" });
  }
  return true; // Indicates you wish to send a response asynchronously
});
