
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
  const resultContainer = document.getElementById("result");
  const textContainer = document.getElementById("summary-text");
  const type = document.getElementById("summary-type").value;

  // Show container and add loading state
  resultContainer.classList.add("active");
  textContainer.innerText = "Generating summary...";

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async (res) => {
      if (res?.text) {
        const summary = await getAiSummary(res.text, type);
        textContainer.innerText = summary;
      }
    });
  });
});

// Copy logic
document.getElementById("copy-btn").addEventListener("click", () => {
  const text = document.getElementById("summary-text").innerText;
  navigator.clipboard.writeText(text);
  
  // Quick visual feedback
  const btn = document.getElementById("copy-btn");
  btn.style.color = "#10b981";
  setTimeout(() => btn.style.color = "#64748b", 1000);
});


async function getAiSummary(text, summaryType) {
  console.log("Working on summary");
  const storage = await chrome.storage.local.get(['selectedModel']);
  const activeModel = storage.selectedModel; // Fallback if none selected

  const url = "http://localhost:11434/api/chat";
  const data = {
    model: activeModel, // Use the dynamic variable
    messages: [
      { role: "user", content: `Summarize this as ${summaryType}: ${text}` }
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


document.getElementById("open-settings").addEventListener("click", () => {
  try {
    window.open(chrome.runtime.getURL('options.html'));
  } catch (error) {
    appendMessage("Error", error);
  }
});

// Function to switch tabs
function switchTab(targetId) {
  // 1. Update Buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-target') === targetId);
  });

  // 2. Update Content Panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === targetId);
  });
}

// Listener for the shortcut button
document.getElementById('go-to-summarize').addEventListener('click', () => {
  switchTab('summary-tab');
});

// Update your existing tab-nav listener to use the switchTab function
document.querySelectorAll('.tab-nav .tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    switchTab(button.getAttribute('data-target'));
  });
});