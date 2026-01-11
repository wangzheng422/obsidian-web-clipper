# Obsidian Web Clipper

A Chrome Extension for clipping web pages (HTML and PDF) to Obsidian using the [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api).

## Features
- **Clip Webpages**: Converts article content to Markdown using Readability and Turndown.
- **Clip PDFs**: Detects PDF tabs and saves the PDF file with a Markdown reference.
- **Offline Assets**: Downloads images and PDFs locally to your Obsidian vault.
- **Structure**:
  - Markdown notes saved to `<BaseFolder>/` (default: `Clippings/`).
  - Assets saved to `<BaseFolder>/assets/YYYY/MM/`.
- **Configurable**: Set your API Key, Port, and Base Folder in extension settings.

## Prerequisites
1.  **Obsidian** installed.
2.  **Obsidian Local REST API** plugin installed and enabled in your vault.
    - Go to Obsidian Settings > Community Plugins > Local REST API.
    - Copy the **API Key**.
    - Ensure the server is running (default port `27123`).

## Installation (Loading Unpacked)
1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the `src/` directory from this project.

## Usage
1.  Click the extension icon in the toolbar.
2.  **First time**: Enter your API Key, Port, and Base Folder in the settings at the bottom of the popup.
3.  **Clip Page**: The extension will preview the content. Click **Save** to send it to Obsidian.
4.  **Clip PDF**: If a PDF is open, it will show a download preview. Click **Save** to upload the PDF and create a link note.

## Build (For Distribution)
To create a `.zip` file for distribution:

```bash
make zip
```

This will create `obsidian-web-clipper.zip` in the root directory.
