// Content Script
// Injected into the page to parse content

console.log('Obsidian Clipper Content Script Loaded');

// ============================================================
// GitHub-specific Content Extraction
// ============================================================

/**
 * Check if current page is a GitHub issue, PR, or discussion
 */
function isGitHubIssueOrPR() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (hostname !== 'github.com') return false;

    // Match: /owner/repo/issues/123 or /owner/repo/pull/123 or /owner/repo/discussions/123
    return /^\/[^/]+\/[^/]+\/(issues|pull|discussions)\/\d+/.test(pathname);
}

/**
 * Extract content from GitHub issue/PR/discussion pages
 * Bypasses Readability which filters out elements with 'comment' in class names
 */
function extractGitHubContent() {
    console.log('Attempting GitHub-specific extraction...');

    // Extract issue/PR title
    const titleEl = document.querySelector('.js-issue-title, .gh-header-title .markdown-title, [data-testid="issue-title"]');
    const title = titleEl ? titleEl.textContent.trim() : document.title;

    // Extract author
    const authorEl = document.querySelector('.author, .gh-header-meta .author');
    const author = authorEl ? authorEl.textContent.trim() : null;

    // GitHub's new React-based UI uses these selectors:
    // - Main issue body: .react-issue-body .markdown-body
    // - Reply comments: .react-issue-comment .markdown-body
    // Also try legacy selectors as fallback
    const selectors = [
        '.react-issue-body .markdown-body',           // New React: issue body
        '.react-issue-comment .markdown-body',        // New React: comments
        '.comment-body.markdown-body',                // Legacy: comment body
        '.js-comment-body',                           // Legacy: JS comment body
        '[data-testid="issue-body"] .markdown-body'   // Testid selector
    ];

    const commentBodies = document.querySelectorAll(selectors.join(', '));

    if (commentBodies.length === 0) {
        console.log('No GitHub comment bodies found, falling back to Readability');
        return null;
    }

    console.log(`Found ${commentBodies.length} GitHub comments`);

    // Build combined HTML
    let combinedHtml = '<article class="github-issue-content">';

    commentBodies.forEach((body, index) => {
        // Try to get comment metadata (author, date) from parent containers
        // Support both new React and legacy structures
        const commentContainer = body.closest('.react-issue-comment, .react-issue-body, .timeline-comment, .js-comment-container, .TimelineItem');
        let commentAuthor = '', commentDate = '';

        if (commentContainer) {
            const authorLink = commentContainer.querySelector('.author, [data-testid*="author"]');
            const timeEl = commentContainer.querySelector('relative-time, time');
            commentAuthor = authorLink ? authorLink.textContent.trim() : '';
            commentDate = timeEl ? (timeEl.getAttribute('datetime') || timeEl.textContent) : '';
        }

        combinedHtml += `<section class="comment" data-index="${index}">`;
        if (commentAuthor || commentDate) {
            combinedHtml += `<p><strong>${commentAuthor}</strong> ${commentDate ? `- ${commentDate}` : ''}</p>`;
        }
        combinedHtml += body.innerHTML;
        combinedHtml += '</section><hr/>';
    });

    combinedHtml += '</article>';

    // Create text content for search/etc
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = combinedHtml;
    const textContent = tempDiv.textContent || '';

    console.log(`GitHub extraction successful: ${commentBodies.length} comments, ${textContent.length} chars`);

    return { title, author, content: combinedHtml, textContent };
}

// ============================================================
// Main Message Handler
// ============================================================

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

            // 2. GitHub-specific extraction (bypasses Readability)
            if (isGitHubIssueOrPR()) {
                const result = extractGitHubContent();
                if (result) {
                    sendResponse({
                        isPdf: false,
                        url: window.location.href,
                        title: result.title,
                        byline: result.author,
                        content: result.content,
                        textContent: result.textContent
                    });
                    return;
                }
                // If GitHub extraction failed, fall through to Readability
            }

            // 3. HTML Parsing using Readability (fallback)
            if (typeof Readability === 'undefined') {
                sendResponse({ error: 'Readability library not loaded.' });
                return;
            }

            const documentClone = document.cloneNode(true);

            // Pre-process DOM to fix common extraction issues (e.g. WeChat)
            preprocessDOM(documentClone);

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

/**
 * Pre-process DOM to handle site-specific quirks before Readability
 */
function preprocessDOM(doc) {
    // 1. WeChat Images: use data-src if src is missing or placeholder
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
        const dataSrc = img.getAttribute('data-src');
        if (dataSrc) {
            img.src = dataSrc;
            // Ensure format param is handled if present (WeChat often adds ?wx_fmt=xxx)
            // But src usage typically handles query params fine.
        }
    });

    // 2. WeChat Code Blocks: Fix nested spans and br tags in pre elements
    // WeChat structure: pre > code > span[leaf] > br
    const preElements = doc.querySelectorAll('pre');
    preElements.forEach(pre => {
        // Replace <br> with newlines
        pre.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

        // Unwrap spans (simplify structure)
        // We iterate backwards or just grab all spans
        const spans = pre.querySelectorAll('span');
        spans.forEach(span => {
            // Replace span with its text content
            const text = document.createTextNode(span.textContent);
            span.replaceWith(text);
        });
    });

    // 3. WeChat Tables: Fix nested structure in cells
    // Structure: td > section > span[leaf]
    const cells = doc.querySelectorAll('td, th');
    cells.forEach(cell => {
        // If cell has section/span structure, try to simplify
        if (cell.querySelector('section') || cell.getAttribute('style')) {
            // Simply grabbing textContent might lose some formatting, but for table cells, 
            // we usually just want the text or simple inline elements.
            // Let's try to unwrap sections specifically.
            const sections = cell.querySelectorAll('section');
            sections.forEach(sec => {
                const text = document.createTextNode(sec.textContent);
                sec.replaceWith(text);
            });
        }
    });
}
