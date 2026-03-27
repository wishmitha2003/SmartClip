/**
 * SmartClip – background.js (service worker, Manifest V3)
 *
 * Listens for the extension icon click (though the popup handles the primary UI)
 * and wires up the context-menu "Save to SmartClip" option so users can save
 * any page directly from the right-click menu.
 */

chrome.runtime.onInstalled.addListener(() => {
  // Create a context-menu item that appears on all pages
  chrome.contextMenus && chrome.contextMenus.create({
    id:       "smartclip-save",
    title:    "Save to SmartClip",
    contexts: ["page", "link"]
  });
});

// Handle context-menu clicks
chrome.contextMenus && chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "smartclip-save") return;

  const url   = info.linkUrl || (tab && tab.url) || "";
  const title = (tab && tab.title) || url;

  if (!url) return;

  const result   = await chrome.storage.local.get("articles");
  const articles = result.articles || [];

  // Avoid duplicates
  if (articles.some(a => a.url === url)) return;

  const domain = extractDomain(url);
  articles.unshift({
    id:          crypto.randomUUID(),
    url,
    title,
    description: "",
    domain,
    favicon:     `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    savedAt:     new Date().toISOString(),
    read:        false
  });

  await chrome.storage.local.set({ articles });
});

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_) {
    return url;
  }
}
