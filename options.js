document.addEventListener('DOMContentLoaded', async () => {
  const modelSelect = document.getElementById('model-select');
  const statusBadge = document.getElementById('connection-status');
  const saveBtn = document.getElementById('save-settings');

  async function checkOllama() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      
      if (data.models) {
        statusBadge.textContent = "Ollama Online";
        statusBadge.className = "status-badge online";
        
        modelSelect.innerHTML = ''; 
        data.models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.name;
          opt.textContent = m.name;
          modelSelect.appendChild(opt);
        });

        // Auto-select the saved model
        chrome.storage.local.get(['selectedModel'], (res) => {
          if (res.selectedModel) modelSelect.value = res.selectedModel;
        });
      }
    } catch (err) {
      statusBadge.textContent = "Ollama Offline";
      statusBadge.className = "status-badge offline";
      modelSelect.innerHTML = '<option value="">No models detected</option>';
    }
  }

  saveBtn.addEventListener('click', () => {
    const model = modelSelect.value;
    if (!model) return;

    chrome.storage.local.set({ selectedModel: model }, () => {
      saveBtn.textContent = "Saved!";
      saveBtn.style.background = "#059669";
      
      setTimeout(() => {
        saveBtn.textContent = "Save & Apply Changes";
        saveBtn.style.background = "#2563eb";
      }, 2000);
    });
  });

  checkOllama();
});