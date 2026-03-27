const saveBtn = document.getElementById("saveBtn");
const message = document.getElementById("message");
const count = document.getElementById("count");
const articlesList = document.getElementById("articlesList");

let messageTimeout;

function showMessage(text, type = "info") {
  clearTimeout(messageTimeout);
  
  message.textContent = text;
  message.className = `show ${type}`;
  
  // Set color based on type
  if (type === "success") message.style.color = "var(--success)";
  else if (type === "error") message.style.color = "var(--error)";
  else message.style.color = "var(--warning)";

  messageTimeout = setTimeout(() => {
    message.className = "";
  }, 3000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString(undefined, options);
}

function updateSavedCount(total) {
  count.textContent = `${total} item${total !== 1 ? "s" : ""}`;
}

function renderArticles() {
  chrome.storage.local.get({ articles: [] }, (data) => {
    const articles = data.articles;
    updateSavedCount(articles.length);

    if (articles.length === 0) {
      articlesList.innerHTML = `<p class="empty-text">Your library is empty.<br>Save articles to see them here.</p>`;
      return;
    }

    articlesList.innerHTML = "";

    articles.forEach((article, index) => {
      const card = document.createElement("div");
      card.className = "article-card";
      card.style.animationDelay = `${index * 0.05}s`;

      card.innerHTML = `
        <div class="article-title" title="${article.title}">${article.title}</div>
        <a class="article-url" href="${article.url}" target="_blank" title="${article.url}">${article.url}</a>
        <div class="article-footer">
          <span class="article-date">${formatDate(article.savedAt)}</span>
          <button class="delete-btn" data-index="${index}" title="Remove article">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            Delete
          </button>
        </div>
      `;

      articlesList.appendChild(card);
    });

    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        const index = parseInt(btn.getAttribute("data-index"));
        deleteArticle(index);
      });
    });
  });
}

function deleteArticle(index) {
  chrome.storage.local.get({ articles: [] }, (data) => {
    const articles = data.articles;
    articles.splice(index, 1);

    chrome.storage.local.set({ articles }, () => {
      showMessage("Removed from library", "error");
      renderArticles();
    });
  });
}

saveBtn.addEventListener("click", async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs || tabs.length === 0) {
      showMessage("No active tab found.", "error");
      return;
    }

    const activeTab = tabs[0];

    const article = {
      title: activeTab.title || "Untitled Article",
      url: activeTab.url || "",
      savedAt: new Date().toISOString()
    };

    chrome.storage.local.get({ articles: [] }, (data) => {
      const existingArticles = data.articles;

      const alreadySaved = existingArticles.some(
        (item) => item.url === article.url
      );

      if (alreadySaved) {
        showMessage("Already in library", "warning");
        return;
      }

      const updatedArticles = [article, ...existingArticles];

      chrome.storage.local.set({ articles: updatedArticles }, () => {
        showMessage("Saved successfully!", "success");
        renderArticles();
      });
    });
  } catch (error) {
    console.error(error);
    showMessage("Error saving article.", "error");
  }
});

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  renderArticles();
});