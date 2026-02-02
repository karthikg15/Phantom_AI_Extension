
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
      const summary = await getQwenSummary(res.text, summaryType);
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

async function getQwenSummary(text, summaryType) {
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
