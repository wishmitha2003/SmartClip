const saveBtn = document.getElementById("saveBtn");
const message = document.getElementById("message");
const count = document.getElementById("count");
const articlesList = document.getElementById("articlesList");

function showMessage(text, color) {
  message.textContent = text;
  message.style.color = color;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function updateSavedCount(total) {
  count.textContent = `${total} article${total !== 1 ? "s" : ""}`;
}

function renderArticles() {
  chrome.storage.local.get({ articles: [] }, (data) => {
    const articles = data.articles;
    updateSavedCount(articles.length);

    if (articles.length === 0) {
      articlesList.innerHTML = `<p class="empty-text">No saved articles yet.</p>`;
      return;
    }

    articlesList.innerHTML = "";

    articles.forEach((article, index) => {
      const card = document.createElement("div");
      card.className = "article-card";

      card.innerHTML = `
        <p class="article-title">${article.title}</p>
        <a class="article-url" href="${article.url}" target="_blank">${article.url}</a>
        <div class="article-footer">
          <span class="article-date">${formatDate(article.savedAt)}</span>
          <button class="delete-btn" data-index="${index}">Delete</button>
        </div>
      `;

      articlesList.appendChild(card);
    });

    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-index"));
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
      showMessage("Article deleted.", "red");
      renderArticles();
    });
  });
}

saveBtn.addEventListener("click", async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs || tabs.length === 0) {
      showMessage("No active tab found.", "red");
      return;
    }

    const activeTab = tabs[0];

    const article = {
      title: activeTab.title || "Untitled",
      url: activeTab.url || "",
      savedAt: new Date().toISOString()
    };

    chrome.storage.local.get({ articles: [] }, (data) => {
      const existingArticles = data.articles;

      const alreadySaved = existingArticles.some(
        (item) => item.url === article.url
      );

      if (alreadySaved) {
        showMessage("This article is already saved.", "orange");
        return;
      }

      const updatedArticles = [article, ...existingArticles];

      chrome.storage.local.set({ articles: updatedArticles }, () => {
        showMessage("Article saved successfully!", "green");
        renderArticles();
      });
    });
  } catch (error) {
    console.error(error);
    showMessage("Error saving article.", "red");
  }
});

renderArticles();