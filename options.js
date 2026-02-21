document.addEventListener('DOMContentLoaded', async () => {
  const modelSelect = document.getElementById('model-select');
  const themeSelect = document.getElementById('theme-select');
  const statusBadge = document.getElementById('connection-status');
  const saveBtn = document.getElementById('save-settings');

  // Load saved settings
  chrome.storage.local.get(['selectedModel', 'selectedTheme'], (res) => {
    if (res.selectedModel) {
      // We'll set this once models are loaded in checkOllama
    }
    if (res.selectedTheme) {
      themeSelect.value = res.selectedTheme;
      document.documentElement.setAttribute('data-theme', res.selectedTheme);
    }
  });

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
    const theme = themeSelect.value;

    chrome.storage.local.set({
      selectedModel: model,
      selectedTheme: theme
    }, () => {
      document.documentElement.setAttribute('data-theme', theme);

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