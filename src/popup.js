// Global state
let currentArticle = null;
let turndownService = new TurndownService();
let imagesToUpload = []; // { src: string, filename: string, blob: Blob }

// Configure Turndown
turndownService.addRule('obsidian-images', {
    filter: 'img',
    replacement: function (content, node) {
        const src = node.getAttribute('src');
        if (!src) return '';

        // Generate a filename for the image
        const timestamp = Date.now();
        // Simple hash or random to avoid collision in same second
        const random = Math.floor(Math.random() * 1000);
        // Guess extension
        let ext = 'png';
        if (src.includes('.jpg') || src.includes('.jpeg')) ext = 'jpg';
        else if (src.includes('.gif')) ext = 'gif';
        else if (src.includes('.svg')) ext = 'svg';
        else if (src.includes('.webp')) ext = 'webp';

        const filename = `Pasted image ${timestamp}${random}.${ext}`;

        // Queue for download and upload
        imagesToUpload.push({ src, filename });

        // Return the Obsidian link format
        // We will know the full path later (assets/YYYY/MM/filename) -> actually we need to know the path prefix now?
        // Or we can just use ![[filename]] if we assume the user has "Use wikilinks" ON and Obsidian finds it.
        // User requested: Images in Clippings/assets/YYYY/MM/. 
        // If we put ![[filename]], Obsidian might not find it if it's in a subfolder unless we use absolute path or if it's indexed.
        // Safer: ![[filename]] usually works if unique. 
        // User said: "reference: Use Obsidian default [[filename]] ... Obsidian will automatically track."
        return `![[${filename}]]`;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const settingsBtn = document.getElementById('save-settings');

    if (saveBtn) saveBtn.addEventListener('click', onSaveToObsidian);
    if (settingsBtn) settingsBtn.addEventListener('click', onSaveSettings);

    loadSettings();
    scanCurrentTab();
});

// --- Settings ---
function loadSettings() {
    chrome.storage.local.get(['apiKey', 'port', 'baseFolder'], (result) => {
        if (result.apiKey) document.getElementById('api-key').value = result.apiKey;
        if (result.port) document.getElementById('api-port').value = result.port;
        if (result.baseFolder) document.getElementById('base-folder').value = result.baseFolder;

        if (!result.apiKey) {
            updateStatus('Please configure Obsidian API settings.');
            document.querySelector("details").open = true;
        }
    });
}

function onSaveSettings() {
    const apiKey = document.getElementById('api-key').value;
    const port = document.getElementById('api-port').value;
    const baseFolder = document.getElementById('base-folder').value;

    chrome.storage.local.set({ apiKey, port, baseFolder }, () => {
        updateStatus('Settings saved.');
    });
}

// --- Content Extraction ---
async function scanCurrentTab() {
    updateStatus('Scanning page...');

    if (!chrome.tabs) {
        updateStatus('Error: chrome.tabs API not available.');
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            updateStatus('No active tab found.');
            return;
        }

        console.log('Active tab:', tab.id, tab.url);

        if (!chrome.scripting) {
            updateStatus('Error: chrome.scripting API missing.');
            return;
        }

        updateStatus('Injecting scripts...');
        try {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['lib/readability.js'] });
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['lib/turndown.js'] }); // Ensure Turndown is injected too if needed by content.js or just popup? 
            // Actually content.js logic uses Readability. Popup uses Turndown. content.js does parsing. 
            // My previous content.js used Readability.
            // Popup uses Turndown. Turndown is imported in popup.html via <script>.
            // So we don't need to inject Turndown into the page unless content.js uses it. (It doesn't).
            // BUT: content.js uses Readability.

            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        } catch (scriptErr) {
            console.error('ExecuteScript failed:', scriptErr);
            updateStatus('Script injection failed: ' + scriptErr.message);
            return;
        }

        updateStatus('Parsing content...');
        chrome.tabs.sendMessage(tab.id, { action: 'PARSE' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                updateStatus('Message error: ' + chrome.runtime.lastError.message);
                return;
            }
            if (response && response.error) {
                console.error('Response error:', response.error);
                updateStatus('Parse error: ' + response.error);
                return;
            }
            if (response) {
                handleParseResult(response);
            } else {
                updateStatus('Unknown error: No response.');
            }
        });

    } catch (err) {
        console.error('Scan error:', err);
        updateStatus('Scan failed: ' + err.message);
    }
}

function handleParseResult(data) {
    currentArticle = data;
    const previewArea = document.getElementById('preview-area');
    const noteTitleInput = document.getElementById('note-title');

    previewArea.classList.remove('hidden');
    // Sanitize title for filename usage later
    noteTitleInput.value = data.title.replace(/[\\/:*?"<>|]/g, '-');

    if (data.isPdf) {
        updateStatus(`PDF Detected: ${data.url}`);
    } else {
        updateStatus(`Article ready: ${data.title}`);
    }
}

// --- Save & Upload ---
async function onSaveToObsidian() {
    if (!currentArticle) return;
    updateStatus('Starting save process...');

    // Disable button
    document.getElementById('save-btn').disabled = true;

    try {
        const settings = await chrome.storage.local.get(['apiKey', 'port', 'baseFolder']);
        const startApiKey = settings.apiKey;
        const port = settings.port || 27123;
        const baseFolder = settings.baseFolder || 'Clippings';

        if (!startApiKey) throw new Error('API Key missing.');

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const assetPath = `${baseFolder}/assets/${year}/${month}`;

        // Ensure directories exist
        await createDirectoryIfNeeded(startApiKey, port, baseFolder);
        await createDirectoryIfNeeded(startApiKey, port, `${baseFolder}/assets`);
        await createDirectoryIfNeeded(startApiKey, port, `${baseFolder}/assets/${year}`);
        await createDirectoryIfNeeded(startApiKey, port, assetPath);

        const title = document.getElementById('note-title').value || 'Untitled';
        const safeTitle = title.replace(/[\\/:*?"<>|]/g, '-');

        if (currentArticle.isPdf) {
            // PDF Implementation
            updateStatus('Downloading PDF...');
            const pdfBlob = await fetchBlob(currentArticle.url);
            const pdfFilename = `${safeTitle}.pdf`;

            updateStatus('Uploading PDF...');
            await uploadFile(startApiKey, port, `${assetPath}/${pdfFilename}`, pdfBlob);

            // Create Markdown Note
            const markdownContent = `# ${title}\n\n![[${pdfFilename}]]\n\n[Original URL](${currentArticle.url})`;
            await uploadFile(startApiKey, port, `${baseFolder}/${safeTitle}.md`, markdownContent);

        } else {
            // HTML Implementation
            imagesToUpload = []; // Reset queue

            // 1. Convert to Markdown (populates imagesToUpload)
            let markdown = turndownService.turndown(currentArticle.content);

            // 2. Add frontmatter or header
            const header = `# ${title}\n\nSource: [${currentArticle.url}](${currentArticle.url})\n\n---\n\n`;
            markdown = header + markdown;

            // 3. Download & Upload Images
            if (imagesToUpload.length > 0) {
                updateStatus(`Processing ${imagesToUpload.length} images...`);
                for (let i = 0; i < imagesToUpload.length; i++) {
                    const img = imagesToUpload[i];
                    try {
                        updateStatus(`Downloading image ${i + 1}/${imagesToUpload.length}...`);
                        // Handle relative URLs for images
                        const imgUrl = new URL(img.src, currentArticle.url).href;
                        const blob = await fetchBlob(imgUrl);

                        updateStatus(`Uploading image ${i + 1}/${imagesToUpload.length}...`);
                        await uploadFile(startApiKey, port, `${assetPath}/${img.filename}`, blob);
                    } catch (e) {
                        console.error('Image failed', img, e);
                        // We continue even if image fails
                    }
                }
            }

            // 4. Upload Markdown
            updateStatus('Uploading Markdown note...');
            await uploadFile(startApiKey, port, `${baseFolder}/${safeTitle}.md`, markdown);
        }

        updateStatus('Saved successfully!');
        setTimeout(() => window.close(), 1500);

    } catch (err) {
        console.error(err);
        updateStatus('Error: ' + err.message);
        document.getElementById('save-btn').disabled = false;
    }
}

// --- Helpers ---

async function fetchBlob(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return await response.blob();
}

async function uploadFile(apiKey, port, path, content) {
    const url = `http://127.0.0.1:${port}/vault/${encodeURI(path)}`; // Local REST API uses /vault/<path>

    const options = {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/octet-stream'
        },
        body: content
    };

    // If content is string, change type? Text is fine as octet-stream usually, 
    // but text/markdown is better for .md
    if (typeof content === 'string') {
        options.headers['Content-Type'] = 'text/markdown';
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed for ${path}: ${response.status} ${text}`);
    }
}

async function createDirectoryIfNeeded(apiKey, port, path) {
    // Local REST API creates directories implicitly on file PUT? 
    // Usually yes, but let's check docs. "PUT /vault/path/to/file writes file, creating directories if needed."
    // So explicit directory creation might not be needed.
    // But if we want to be safe, there is `PUT /vault/path/to/dir/` (trailing slash) to create directory.

    // We'll skip explicit creation for now and rely on file PUT. 
    // If that fails, we can add it back.
    // Actually, let's just do a cheap MKCOL or PUT /vault/dir/
    try {
        const url = `http://127.0.0.1:${port}/vault/${encodeURI(path)}/`;
        await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
    } catch (ignore) {
        // Ignore if it already exists or errors
    }
}

function updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
    }
    console.log('[Status]:', message);
}
