document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save-settings').addEventListener('click', saveSettings);

function loadSettings() {
    chrome.storage.local.get(['apiKey', 'port', 'baseFolder'], (result) => {
        if (result.apiKey) document.getElementById('api-key').value = result.apiKey;
        if (result.port) document.getElementById('api-port').value = result.port;
        if (result.baseFolder) document.getElementById('base-folder').value = result.baseFolder;
    });
}

function saveSettings() {
    const apiKey = document.getElementById('api-key').value.trim();
    const port = document.getElementById('api-port').value;
    const baseFolder = document.getElementById('base-folder').value.trim();
    const status = document.getElementById('status');

    if (!apiKey) {
        status.textContent = "API Key is required.";
        status.style.color = "red";
        return;
    }

    chrome.storage.local.set({ apiKey, port, baseFolder }, () => {
        status.textContent = "Settings saved successfully! You can now use the Clipper.";
        status.style.color = "green";

        // Optional: Test connection here?
    });
}
