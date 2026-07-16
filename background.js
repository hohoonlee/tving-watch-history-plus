// TVING Watch History Plus - Background Script

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
	const url = new URL(details.url);
	if (url.pathname === '/my') {
		chrome.scripting.executeScript({
			target: { tabId: details.tabId },
			files: ['content.js']
		});
		chrome.scripting.insertCSS({
			target: { tabId: details.tabId },
			files: ['content.css']
		});
	}
}, { url: [{ hostSuffix: 'tving.com' }] });
