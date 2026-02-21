let currentArticleContext = '';
let articleChatHistory = [];

// Initialize theme
chrome.storage.local.get(['selectedTheme'], (res) => {
  if (res.selectedTheme) {
    document.documentElement.setAttribute('data-theme', res.selectedTheme);
  }
});

document.getElementById("summarize").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const isMail = tab.url.includes("mail.google.com") || tab.url.includes("outlook.live.com") || tab.url.includes("mail.yahoo.com");

    if (isMail) {
      getEmailData();
    } else {
      const resultContainer = document.getElementById("result");
      const textContainer = document.getElementById("summary-text");
      const type = document.getElementById("summary-type").value;

      resultContainer.classList.add("active");
      textContainer.innerHTML = `
        <div class="loading-container">
          <div class="spinner"></div>
          <div class="loading-pulse">PHANTOM.AI is reading...</div>
        </div>
      `;

      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {

        if (!tab.url.startsWith('http')) {
          textContainer.innerText = "Phantom can't run on browser internal pages.";
          return;
        }

        chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async (res) => {

          if (chrome.runtime.lastError) {
            console.log("Connection failed");
            return;
          }

          if (res?.text) {
            try {
              const lengthLimit = (type === 'brief') ? "under 120 words" : "thoroughly";
              const prompt = `Summarize this as ${type} in ${lengthLimit}. Plain text only, no markdown: ${res.text}`;

              const summary = await getAiSummary(prompt);
              const cleanSummary = summary.replace(/\*\*/g, '');
              textContainer.innerText = cleanSummary;

              // Enable article chat
              currentArticleContext = res.text;
              articleChatHistory = [{ role: 'system', content: `You are an AI assistant. Use the following article context to answer questions: ${currentArticleContext}` }];
              document.getElementById("article-chat-container").style.display = "block";
              document.getElementById("article-chat-history").innerHTML = "";
            } catch (error) {
              textContainer.innerHTML = `<span style="color: #ef4444;">Connection lost. check Ollama.</span>`;
            }
          } else {
            textContainer.innerText = "Refresh the page and try again - Unable to read the content";
          }
        });
      });
    }
  });

});


// Copy function
document.getElementById("copy-btn").addEventListener("click", () => {
  const text = document.getElementById("summary-text").innerText;
  navigator.clipboard.writeText(text);
  const btn = document.getElementById("copy-btn");
  btn.style.color = "#10b981";
  setTimeout(() => btn.style.color = "#64748b", 1000);
});



// Ollama run - AI summary function
async function getAiSummary(text) {
  console.log("Working on summary");
  const storage = await chrome.storage.local.get(['selectedModel']);
  const activeModel = storage.selectedModel;

  const url = "http://localhost:11434/api/chat";
  const data = {
    model: activeModel,
    messages: [
      { role: "user", content: text }
    ],
    stream: false
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.message.content;

  } catch (error) {
    console.error("Failed to connect to Ollama:", error);
    return "Error: Make sure Ollama is running and OLLAMA_ORIGINS is set.";
  }
}


// Chat history 
let chatHistory = [
  { role: 'system', content: 'Use the provided article context to answer questions.' }
];

async function handleChat() {
  document.getElementById("query-btn").disabled = true;
  const inputField = document.getElementById("chatQuery");
  const userText = inputField.value.trim();

  if (!userText) return;

  appendMessage("user", userText);
  chatHistory.push({ role: "user", content: userText });
  inputField.value = "";

  showTypingIndicator();

  try {
    const storage = await chrome.storage.local.get(['selectedModel']);
    const activeModel = storage.selectedModel;

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: activeModel,
        messages: chatHistory,
        stream: false
      }),
    });
    document.getElementById("query-btn").disabled = false;

    const data = await response.json();
    const aiMessage = data.message.content;

    removeTypingIndicator();
    appendMessage("assistant", aiMessage);
    chatHistory.push({ role: "assistant", content: aiMessage });

  } catch (error) {
    removeTypingIndicator();
    document.getElementById("query-btn").disabled = false;
    appendMessage("error", "Failed to connect to Ollama.");
  }
}


function showTypingIndicator() {
  const chatDisplay = document.getElementById("chat-history");
  const typingDiv = document.createElement("div");

  typingDiv.id = "typing-bubble";
  typingDiv.className = "typing-indicator";
  typingDiv.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;

  chatDisplay.appendChild(typingDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing-bubble");
  if (indicator) indicator.remove();
}

function appendMessage(role, text) {
  const chatDisplay = document.getElementById("chat-history");
  const msgDiv = document.createElement("div");

  msgDiv.className = `message ${role}`;
  msgDiv.innerText = text;

  chatDisplay.appendChild(msgDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

document.getElementById("chatQuery").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleChat();
  }
});


document.getElementById("query-btn").addEventListener("click", handleChat);

// Settings page
document.getElementById("open-settings").addEventListener("click", () => {
  try {
    window.open(chrome.runtime.getURL('options.html'));
  } catch (error) {
    appendMessage("Error", error);
  }
});

// Function to switch tabs
function switchTab(targetId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-target') === targetId);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === targetId);
  });
}


document.querySelectorAll('.tab-nav .tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    switchTab(button.getAttribute('data-target'));
  });
});

document.querySelectorAll('.tab-nav .tab-btn').forEach((button, index) => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    const indicator = document.getElementById('tab-indicator');

    indicator.style.transform = `translateX(${index * 100}%)`;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === targetId);
    });
  });
});


// Email summary functions
let emailBodyForReply = "";

function handleEmailSummary(emailText) {
  emailBodyForReply = emailText;
  const resultContainer = document.getElementById("result");
  const textContainer = document.getElementById("summary-text");
  const emailActions = document.getElementById("email-actions");

  const type = document.getElementById("summary-type").value;
  const lengthLimit = (type === 'brief') ? "under 120 words" : "thoroughly";
  const prompt = `Summarzie this mail ${emailText} summary type: ${type} in ${lengthLimit}. Plain text only, no markdown:`;


  resultContainer.classList.add("active");
  emailActions.style.display = "none";
  textContainer.innerHTML = `<div class="loading-container">
                                <div class="spinner"></div>
                                <div class="loading-pulse">PHANTOM.AI is reading your email...</div>
                              </div>
                            `;

  getAiSummary(prompt).then(summary => {
    const cleanSummary = summary.replace(/\*\*/g, '');
    textContainer.innerText = cleanSummary;

    emailActions.style.display = "block";
  });
}

// Handle the reply generation
document.getElementById("generate-reply-btn").addEventListener("click", async () => {
  const replyContainer = document.getElementById("reply-output-container");
  const replyResult = document.getElementById("reply-result");

  replyContainer.style.display = "block";
  replyResult.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-pulse">PHANTOM.AI is drafting a reply...</div>
    </div>
  `;

  try {
    const prompt = `Draft a professional reply to: ${emailBodyForReply}, make it 100-120 words`;
    const reply = await getAiSummary(prompt);
    const cleanReply = reply.replace(/\*\*/g, '');
    replyResult.innerText = cleanReply;
  } catch (e) {
    replyResult.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 10px;">Error drafting reply.</div>`;
  }
});


// Copy Reply functiona
document.getElementById("copy-reply-btn").addEventListener("click", () => {
  const text = document.getElementById("reply-result").innerText;
  navigator.clipboard.writeText(text);
  const icon = document.querySelector("#copy-reply-btn svg");
  icon.style.stroke = "#10b981";
  setTimeout(() => icon.style.stroke = "currentColor", 2000);
});


async function getEmailData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { type: "PING" }, async (response) => {

    if (chrome.runtime.lastError || !response) {
      console.log("PHANTOM.AI: Content script missing. Automating re-injection...");

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });

        setTimeout(() => executeExtraction(tab.id), 100);
      } catch (err) {
        console.error("PHANTOM.AI: Critical Injection Error", err);
        alert("Please refresh mail to enable PHANTOM.AI.");
      }
    } else {
      executeExtraction(tab.id);
    }
  });
}


function executeExtraction(tabId) {
  chrome.tabs.sendMessage(tabId, { type: "EXTRACT_EMAIL" }, (res) => {
    if (res && res.body) {
      handleEmailSummary(res.body);
    }
  });
}


// Grammar Check logic
document.getElementById('check-grammar-btn').addEventListener('click', async () => {
  const inputArea = document.getElementById('grammar-input');
  const resultContainer = document.getElementById('grammar-result-container');
  const resultText = document.getElementById('grammar-result-text');
  const text = inputArea.value.trim();

  if (!text) return;

  resultContainer.style.display = 'block';
  resultText.innerHTML = `<div class='loading-container'><div class='spinner'></div><div class='loading-pulse'>PHANTOM.AI is checking grammar...</div></div>`;

  try {
    const prompt = `Correct the grammar and spelling of this text. Return ONLY the corrected text, no chat or explanations: ${text}`;
    const corrected = await getAiSummary(prompt);
    resultText.innerText = corrected.trim();
  } catch (error) {
    resultText.innerHTML = `<span style='color: #ef4444;'>Error checking grammar.</span>`;
  }
});

document.getElementById('copy-grammar-btn').addEventListener('click', () => {
  const text = document.getElementById('grammar-result-text').innerText;
  navigator.clipboard.writeText(text);
  const icon = document.querySelector('#copy-grammar-btn svg');
  icon.style.stroke = '#10b981';
  setTimeout(() => icon.style.stroke = 'currentColor', 2000);
});
// Contextual Article Chat logic
async function handleArticleChat() {
  const inputField = document.getElementById("article-query");
  const userText = inputField.value.trim();
  const chatHistory = document.getElementById("article-chat-history");

  if (!userText || !currentArticleContext) return;

  // Append user message
  const userMsg = document.createElement("div");
  userMsg.className = "article-msg user";
  userMsg.innerText = userText;
  chatHistory.appendChild(userMsg);

  articleChatHistory.push({ role: "user", content: userText });
  inputField.value = "";
  chatHistory.scrollTop = chatHistory.scrollHeight;

  // Loading indicator for article chat
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "article-msg loading";
  loadingMsg.innerText = "PHANTOM is thinking...";
  chatHistory.appendChild(loadingMsg);

  try {
    const storage = await chrome.storage.local.get(['selectedModel']);
    const activeModel = storage.selectedModel;

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: activeModel,
        messages: articleChatHistory,
        stream: false
      }),
    });

    const data = await response.json();
    const aiMessage = data.message.content;

    loadingMsg.remove();

    const assistantMsg = document.createElement("div");
    assistantMsg.className = "article-msg assistant";
    assistantMsg.innerText = aiMessage;
    chatHistory.appendChild(assistantMsg);

    articleChatHistory.push({ role: "assistant", content: aiMessage });
    chatHistory.scrollTop = chatHistory.scrollHeight;

  } catch (error) {
    loadingMsg.innerText = "Error connecting to Ollama.";
    loadingMsg.className = "article-msg error";
  }
}

document.getElementById("article-query-btn").addEventListener("click", handleArticleChat);
document.getElementById("article-query").addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleArticleChat();
});

