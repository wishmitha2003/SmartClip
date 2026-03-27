/**
 * SmartClip – content.js
 *
 * Injected into every page. Exposes a helper used by popup.js (via
 * chrome.scripting.executeScript) to extract rich article metadata such as
 * Open-Graph tags, Twitter cards, and the canonical page description.
 *
 * The script itself is intentionally lightweight — it does nothing on its own
 * and only acts when invoked by the extension popup.
 */

/**
 * Returns the best available title and description for the current page by
 * inspecting Open-Graph, Twitter-card, and standard <meta> tags.
 *
 * @returns {{ title: string, description: string }}
 */
function extractMetadata() {
  /**
   * @param {string} name
   * @returns {string}
   */
  function getMeta(name) {
    const selectors = [
      `meta[property="og:${name}"]`,
      `meta[name="twitter:${name}"]`,
      `meta[name="${name}"]`
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const content = el.getAttribute("content");
        if (content) return content;
      }
    }
    return "";
  }

  const title       = getMeta("title")       || document.title || "";
  const description = getMeta("description") || "";

  return { title, description };
}
