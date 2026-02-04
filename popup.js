
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-target');

    // 1. Remove active class from all buttons and panes
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    // 2. Add active class to clicked button and target pane
    button.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

document.getElementById("summarize").addEventListener("click", async () => {
  console.log("Clicked Summarize");
  const resultDiv = document.getElementById("result");
  const summaryType = document.getElementById("summary-type").value;
  
  resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async (res) => {

    if (chrome.runtime.lastError || !res?.text) {
      resultDiv.innerText = "Could not extract text. Ensure you are on a webpage and refresh.";
      return;
    } 
    try {
      const summary = await getAiSummary(res.text, summaryType);
      resultDiv.innerText = summary;
    } catch (error) {
      resultDiv.innerText = `Error: ${error.message}`;
    }
  });
});

document.getElementById("copy-btn").addEventListener("click", () => {
  const summaryText = document.getElementById("result").innerText;

  if (summaryText && summaryText.trim() !== "") {
    navigator.clipboard
      .writeText(summaryText)
      .then(() => {
        const copyBtn = document.getElementById("copy-btn");
        const originalText = copyBtn.innerText;

        copyBtn.innerText = "Copied!";
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }
});

async function getAiSummary(text, summaryType) {
  console.log("Working on summary");
  const url = "http://localhost:11434/api/chat";
  
  const data = {
    model: "qwen2.5-coder:3b",
    messages: [
      { 
        role: "user", 
        content: `Summarize the following content as ${summaryType}: ${text}` 
      }
    ],
    stream: false // Set to false so you get the whole response at once
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
    // console.log("Summary:", result.message.content);
    console.log("Summarized");
    return result.message.content;
    
  } catch (error) {
    console.error("Failed to connect to Ollama:", error);
    return "Error: Make sure Ollama is running and OLLAMA_ORIGINS is set.";
  }
}


// 1. Initialize chat history with an optional system message
let chatHistory = [
  { role: 'system', content: 'Use the provided article context to answer questions.'}
];

async function handleChat() {
  document.getElementById("query-btn").disabled = true;
  const inputField = document.getElementById("chatQuery");
  const userText = inputField.value.trim();

  if (!userText) return;

  // 1. Add User message
  appendMessage("user", userText);
  chatHistory.push({ role: "user", content: userText });
  inputField.value = ""; 

  // 2. Show Typing Indicator
  showTypingIndicator();

  try {
    
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5-coder:3b",
        messages: chatHistory,
        stream: false
      }),
    });
    document.getElementById("query-btn").disabled = false;

    const data = await response.json();
    const aiMessage = data.message.content;

    // 3. Remove Indicator and Add AI response
    removeTypingIndicator();
    appendMessage("assistant", aiMessage);
    chatHistory.push({ role: "assistant", content: aiMessage });

  } catch (error) {
    removeTypingIndicator();
    document.getElementById("query-btn").disabled = false;
    appendMessage("error", "Failed to connect to Ollama.");
  }
}

// Helper functions for the indicator
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
  
  // Apply the classes (user or assistant)
  msgDiv.className = `message ${role}`;
  msgDiv.innerText = text;

  chatDisplay.appendChild(msgDiv);

  // Smooth scroll to the latest message
  chatDisplay.scrollTo({
    top: chatDisplay.scrollHeight,
    behavior: 'smooth'
  });
}

document.getElementById("chatQuery").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleChat();
  }
});
// Event Listener
document.getElementById("query-btn").addEventListener("click", handleChat);
