# Privacy Policy for Vault Web Clipper

**Effective Date:** 2026-01-11

## 1. Introduction
Vault Web Clipper ("the Extension") is designed to respect your privacy. This Privacy Policy describes how data is handled by the Extension.

## 2. Data Collection and Usage
**We do not collect, store, or share any of your personal data.**

*   **Local Processing**: All processing (article extraction, markdown conversion, PDF handling) happens locally on your device within your web browser.
*   **Direct Transfer**: When you choose to save content, the Extension communicates directly with the **Obsidian Local REST API** running on your local machine (localhost).
*   **No Analytics**: The Extension does not include any tracking scripts, analytics, or third-party telemetry.

## 3. Permissions
The Extension requests the minimum permissions necessary to function:
*   **activeTab / tabs**: Used solely to capture the title and content of the page you explicitly choose to clip.
*   **scripting**: Used to run the Readability parser on the current page to extract article content.
*   **storage**: Used to save your configuration settings (API Key, Port, Base Folder) locally in your browser's sync storage.
*   **Host Permissions**: Used to allow the extension to run on the web pages you visit and wish to clip.

## 4. Data Sharing
Since we do not collect any data, we do not share any data with third parties. Your notes and API keys never leave your local environment.

## 5. Changes to This Policy
We may update this policy from time to time. Any changes will be posted on this page.

## 6. Contact
If you have questions about this policy, please open an issue in our GitHub repository.
