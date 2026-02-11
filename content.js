// In content.js
function extractGeneralContent() {
  const article = new Readability(document.cloneNode(true)).parse();
  if (article && article.textContent.length > 200) {
    return { type: "ARTICLE", text: article.textContent };
  }

  const bodyText = document.body.innerText
    .replace(/\s\s+/g, ' ')
    .trim();

  if (bodyText.length > 100) {
    return { type: "GENERAL", text: bodyText };
  }

  return { type: "ERROR", text: null };
}


// Article Extraction
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


// Mail Extraction 
const PROVIDERS = {
  "mail.google.com": {
    body: ".a3s.aiL",
    subject: "h2.hP"
  },
  "outlook.live.com": {
    body: "[aria-label='Message body']",
    subject: "[role='heading'][aria-level='2']"
  },
  "mail.yahoo.com": {
    body: ".msg-body",
    subject: "[data-test-id='message-view-subject']"
  }
};

function extractGmailContent() {
  const bodySelectors = ['.a3s.aiL', '.adn.ads', '[role="main"] .ii.gt', '.m14623dcb877eef15'];
  
  let emailBody = null;
  for (const selector of bodySelectors) {
    emailBody = document.querySelector(selector);
    if (emailBody && emailBody.innerText.trim().length > 10) break; 
  }

  const subject = document.querySelector('h2.hP')?.innerText || "No Subject";

  if (emailBody) {
    return {
      subject: subject,
      body: emailBody.innerText.trim()
    };
  }

  const iframes = document.querySelectorAll('iframe');
  for (let frame of iframes) {
    try {
      const frameBody = frame.contentDocument?.body;
      if (frameBody && frameBody.innerText.trim().length > 50) {
        return { subject: subject, body: frameBody.innerText.trim() };
      }
    } catch (e) { /* Ignore cross-origin errors */ }
  }

  return null;
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PING") {
    sendResponse({ status: "ready" });
  } else if (request.type === "EXTRACT_EMAIL") {
    sendResponse(extractGmailContent());
  }
  return true; 
});
