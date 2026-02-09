# PHANTOM.AI

**PHANTOM.AI** is an **AI-powered chrome extension**. It allows you to chat with AI, summarize complex articles, and draft professional mail replies—all while keeping your data local. It uses ollama to run AI models locally on your system.

## Features:

AI Chat: A chat interface to  ask questions anytime.

-Summarization: Instantly summarize long articles or emails into key bullet points or brief paragraphs.

-One-Click mail Replies: Automatically drafts professional responses.

-Privacy: Designed to work with local models (like Ollama), ensuring your sensitive emails never leave your machine.

-Cross-Platform: Full support for Gmail.com, Outlook.com and Yahoo.com.

## Installation guide:

**Pre-requirements:**
    1. You must have ollama installed on your device with at least one AI model running. If not installed, install from here https://ollama.com/download .

    2. Make sure ollama is running in the background.

1. Clone this repo on your system.

    ```
    git clone https://github.com/karthikg15/
    ```

2. Create a new system environment variable:
    ```
    OLLAMA_ORIGINS="chrome-extension://*"
    ```
3. Turn on developer mode on your chrome extension settings.
[developer mode screenshot](image.png)

4. Click on `Load unpacked` option on your chrom extension page and load the downloded extension.

5. Pin the extension for convenient use. 
