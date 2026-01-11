// Content Script
// Injected into the page to parse content

console.log('Obsidian Clipper Content Script Loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
        sendResponse({ status: 'OK' });
    } else if (request.action === 'PARSE') {
        try {
            // 1. PDF Detection
            if (
                document.contentType === 'application/pdf' ||
                window.location.href.toLowerCase().endsWith('.pdf')
            ) {
                console.log('PDF Detected');
                sendResponse({
                    isPdf: true,
                    url: window.location.href,
                    title: document.title || window.location.href.split('/').pop()
                });
                return;
            }

            // 2. HTML Parsing using Readability
            if (typeof Readability === 'undefined') {
                sendResponse({ error: 'Readability library not loaded.' });
                return;
            }

            const documentClone = document.cloneNode(true);
            const article = new Readability(documentClone).parse();

            if (!article) {
                sendResponse({ error: 'Failed to parse content.' });
                return;
            }

            // resolve relative URLs
            const base = document.baseURI;

            sendResponse({
                isPdf: false,
                url: window.location.href,
                title: article.title,
                byline: article.byline,
                content: article.content, // HTML content
                textContent: article.textContent
            });

        } catch (e) {
            console.error('Parsing error:', e);
            sendResponse({ error: e.message });
        }
    }
    return true; // Keep message channel open for async response
});
