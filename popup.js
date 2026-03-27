/**
 * SmartClip – popup.js
 * Manages the reading list stored in chrome.storage.local.
 */

const saveBtn      = document.getElementById("save-btn");
const readingList  = document.getElementById("reading-list");
const emptyState   = document.getElementById("empty-state");
const articleCount = document.getElementById("article-count");
const searchInput  = document.getElementById("search-input");
const tabs         = document.querySelectorAll(".tab");
const currentTitle = document.getElementById("current-title");
const currentUrl   = document.getElementById("current-url");

let articles = [];
let activeFilter = "all";
let currentTab   = null;

// ── Initialise ────────────────────────────────────────────────────────────────

async function init() {
  // Load persisted articles
  const result = await chrome.storage.local.get("articles");
  articles = result.articles || [];

  // Get the currently active browser tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab) {
    currentTitle.textContent = tab.title || tab.url;
    currentUrl.textContent   = tab.url;

    const alreadySaved = articles.some(a => a.url === tab.url);
    saveBtn.disabled = false;

    if (alreadySaved) {
      markSaveButtonSaved();
    }
  }

  renderList();
}

// ── Save current page ──────────────────────────────────────────────────────────

saveBtn.addEventListener("click", async () => {
  if (!currentTab) return;

  const alreadySaved = articles.some(a => a.url === currentTab.url);
  if (alreadySaved) return;

  // Try to get enriched metadata from the content script
  let metadata = { title: currentTab.title, description: "" };
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: extractMetadata
    });
    if (result && result.result) {
      metadata = result.result;
    }
  } catch (_) {
    // Content script may be unavailable on restricted pages; use tab title
  }

  const article = {
    id:          crypto.randomUUID(),
    url:         currentTab.url,
    title:       metadata.title || currentTab.title || currentTab.url,
    description: metadata.description || "",
    domain:      extractDomain(currentTab.url),
    favicon:     `https://www.google.com/s2/favicons?domain=${extractDomain(currentTab.url)}&sz=32`,
    savedAt:     new Date().toISOString(),
    read:        false
  };

  articles.unshift(article);
  await saveArticles();

  markSaveButtonSaved();
  renderList();
});

/** Function injected into the page to pull Open-Graph / meta tag data. */
function extractMetadata() {
  const getMeta = (name) => {
    const el =
      document.querySelector(`meta[property="og:${name}"]`) ||
      document.querySelector(`meta[name="twitter:${name}"]`) ||
      document.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute("content") || "" : "";
  };

  return {
    title:       getMeta("title") || document.title || "",
    description: getMeta("description") || ""
  };
}

// ── Render list ───────────────────────────────────────────────────────────────

function renderList() {
  // Update badge
  const unreadCount = articles.filter(a => !a.read).length;
  articleCount.textContent = unreadCount;

  const query = searchInput.value.toLowerCase().trim();

  const filtered = articles.filter(article => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "read"   &&  article.read) ||
      (activeFilter === "unread" && !article.read);

    const matchesSearch =
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.domain.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  // Clear current items (keep empty-state node)
  Array.from(readingList.querySelectorAll(".article-card")).forEach(el => el.remove());

  if (filtered.length === 0) {
    emptyState.style.display = "block";
    emptyState.textContent =
      query ? "No articles match your search." : "No saved articles yet.";
    return;
  }

  emptyState.style.display = "none";

  filtered.forEach(article => {
    const card = buildCard(article);
    readingList.appendChild(card);
  });
}

function buildCard(article) {
  const card = document.createElement("div");
  card.className = `article-card${article.read ? " is-read" : ""}`;
  card.dataset.id = article.id;

  const date = new Date(article.savedAt);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  card.innerHTML = `
    <img class="article-favicon" src="${escapeHtml(article.favicon)}" alt="" />
    <div class="article-body">
      <a class="article-title" href="${escapeHtml(article.url)}" target="_blank" title="${escapeHtml(article.title)}">${escapeHtml(article.title)}</a>
      <div class="article-domain">${escapeHtml(article.domain)}</div>
      <div class="article-meta">
        ${article.read ? '<span class="read-badge">Read</span>' : ""}
        <span class="date-badge">${dateStr}</span>
      </div>
    </div>
    <div class="article-actions">
      <button class="btn btn-icon read-btn" title="${article.read ? "Mark as unread" : "Mark as read"}">
        ${article.read ? readIcon("#4caf50") : readIcon("#aaa")}
      </button>
      <button class="btn btn-icon delete-btn" title="Remove">
        ${trashIcon()}
      </button>
    </div>`;

  card.querySelector(".read-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleRead(article.id);
  });

  card.querySelector(".delete-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteArticle(article.id);
  });

  return card;
}

// ── Article actions ───────────────────────────────────────────────────────────

async function toggleRead(id) {
  articles = articles.map(a => a.id === id ? { ...a, read: !a.read } : a);
  await saveArticles();
  renderList();
}

async function deleteArticle(id) {
  articles = articles.filter(a => a.id !== id);
  await saveArticles();

  // Re-enable save button if current page was just deleted
  if (currentTab && !articles.some(a => a.url === currentTab.url)) {
    saveBtn.className   = "btn btn-primary";
    saveBtn.disabled    = false;
    saveBtn.innerHTML   = plusIcon() + " Save";
  }

  renderList();
}

function saveArticles() {
  return chrome.storage.local.set({ articles });
}

// ── Tabs / search ─────────────────────────────────────────────────────────────

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    renderList();
  });
});

searchInput.addEventListener("input", renderList);

// ── Helpers ───────────────────────────────────────────────────────────────────

function markSaveButtonSaved() {
  saveBtn.className = "btn btn-saved";
  saveBtn.disabled  = true;
  saveBtn.innerHTML = checkIcon() + " Saved";
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_) {
    return url;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readIcon(color = "currentColor") {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function trashIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6H21M8 6V4H16V6M19 6L18 20H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function plusIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

function checkIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
