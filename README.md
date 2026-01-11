# Vault Web Clipper

A Chrome Extension for clipping web pages (HTML and PDF) to Obsidian using the [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api).

## Features
- **Clip Webpages**: Converts article content to Markdown using Readability and Turndown.
- **Clip PDFs**: Detects PDF tabs and saves the PDF file with a Markdown reference.
- **Offline Assets**: Downloads images and PDFs locally to your Obsidian vault.
- **Structure**:
  - Markdown notes saved to `<BaseFolder>/` (default: `Clippings/`).
  - Assets saved to `<BaseFolder>/assets/YYYY/MM/DD/`.
  - Uses YAML frontmatter for metadata (e.g., `source` URL).
- **Configurable**: Set your API Key, Port, and Base Folder in extension settings.

## Prerequisites
1.  **Obsidian** installed.
2.  **Obsidian Local REST API** plugin installed and enabled in your vault.
    - Go to Obsidian Settings > Community Plugins > Local REST API.
    - Copy the **API Key**.
    - Ensure the server is running (default port `27123`).

## Installation

### Method 1: Install from Release (Recommended)
1.  Download the latest `vault-web-clipper.zip` from the [Releases page](https://github.com/wangzheng422/obsidian-web-clipper/releases).
2.  Unzip the file (you should get a folder distinct from the zip).
3.  Open Chrome and navigate to `chrome://extensions/`.
4.  Enable **Developer mode** (top right toggle).
5.  Click **Load unpacked**.
6.  Select the unzipped folder (containing `manifest.json`).

### Method 2: Install from Source
1.  Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode**.
4.  Click **Load unpacked**.
5.  Select the `src/` directory.

## Usage
1.  **First Run**: After installation, a **Welcome Page** will open automatically.
2.  **Setup**: Enter your Obsidian Local REST API Key and settings in the Welcome Page.
3.  **Clip**:
    -   Click the extension icon (💎) in the toolbar.
    -   Click **Save to Obsidian**.
    -   The extension will save the article or PDF to your vault.
3.  **Clip Page**: The extension will preview the content. Click **Save** to send it to Obsidian.
4.  **Clip PDF**: If a PDF is open, it will show a download preview. Click **Save** to upload the PDF and create a link note.

## Build (For Distribution)
To create a `.zip` file for distribution:

```bash
make zip
```

This will create `vault-web-clipper.zip` in the root directory.
