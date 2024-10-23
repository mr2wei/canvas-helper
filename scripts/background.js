// background.js
console.log('Background service worker loaded');
// chrome.action.onClicked.addListener(function() {
//     chrome.tabs.create({url: chrome.runtime.getURL('index.html')});
// });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'getLocalStorage') {
      chrome.storage.local.get(request.key, (result) => {
        sendResponse({ data: result[request.key] });
      });
      return true; // Indicates that sendResponse will be called asynchronously
    }
});