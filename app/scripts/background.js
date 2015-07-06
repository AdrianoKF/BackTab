'use strict';

// Mapping between tab ids and its opening tab
// Key/value format: id : int -> { id : int , url : string }
var referrers = {};

// Tabs that have been created by the extenion

// Every time a new tab is opened, remeber its opener
chrome.tabs.onCreated.addListener(function(tab) {
    var openerId = tab.openerTabId;
    if (!openerId) {
        return;
    }

    // Find the tab that opened our tab and remember it
    chrome.tabs.get(openerId, function(openerTab) {
        // Remember only the relevant attributes about the opener
        referrers[tab.id] = {
            id: openerId,
            url: openerTab.url,
            title: openerTab.title
        };
    });
});

chrome.tabs.onUpdated.addListener(function(tabId) {
    // Show the page action icon if there is a referrer entry
    if (referrers[tabId]) {
        chrome.pageAction.show(tabId);
        chrome.pageAction.setTitle({
            tabId: tabId,
            title: 'Go back to "' + referrers[tabId].title + '"'
        });
    }
});

chrome.pageAction.onClicked.addListener(function() {
    // Find the active tab in the current window to retrieve its opener
    chrome.tabs.query(
        {
            active: true,
            windowId: chrome.windows.WINDOW_ID_CURRENT
        },
        function(tabs) {
            if (tabs.length === 0) {
                return;
            }

            var tab = tabs[0];

            // Make sure we have previously recorded a referrer for this tab
            if (!referrers[tab.id]) {
                return;
            }

            var referrer = referrers[tab.id];
            // Find out if the referrer tab is still open...
            chrome.tabs.get(referrer.id, function() {
                if (chrome.runtime.lastError) {
                    // Otherwise a new tab with the referrer URL
                    console.log('Navigating to referrer', referrer.url);
                    chrome.tabs.create({ url: referrer.url }, function(newTab) {
	                    // Update the referrer mapping, so we can
	                    // navigate to the newly created tab later
	                    referrers[tab.id].id = newTab.id;
	                });
                } else {
                    // If referrer is open, just bring the tab to the front
                    console.log('Found open original referrer tab, jumping there');
                    chrome.tabs.update(referrer.id, { active: true });
                }
            });
        }
    );
});
