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
        <div class="article-footer">
          <span class="article-date">${formatDate(article.savedAt)}</span>
          <div class="btn-group">
            <button class="open-btn" data-url="${article.url}" title="Open article">Open</button>
            <button class="delete-btn" data-index="${index}" title="Remove article">Delete</button>
          </div>
        </div>
      `;

      articlesList.appendChild(card);
    });

    // Add listeners for Delete
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        const index = parseInt(btn.getAttribute("data-index"));
        deleteArticle(index);
      });
    });

    // Add listeners for Open
    const openButtons = document.querySelectorAll(".open-btn");
    openButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        const url = btn.getAttribute("data-url");
        if (url) {
          chrome.tabs.create({ url: url });
        }
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