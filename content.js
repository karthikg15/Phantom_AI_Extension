function getArticleText() {
  try {
    const docClone = document.cloneNode(true);
    const article = new Readability(docClone).parse();

    if (article && article.textContent) {
      articleTitle = article.title;
      return article.textContent.trim().replace(/\s\s+/g, ' ');
    } else {
      console.warn("Readability could not find an article on this page.");
      return "Could not extract article text.";
    }
  } catch (error) {
    console.error("Extraction error:", error);
    return "Error extracting text.";
  }
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_ARTICLE_TEXT") {
    const text = getArticleText();
    sendResponse({ text });
  }
});

