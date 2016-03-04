"use strict";
// sfdcBody = normal Salesforce page
// ApexCSIPage = Developer Console
// auraLoadingBox = Lightning / Salesforce1
if (document.querySelector("body.sfdcBody, body.ApexCSIPage, #auraLoadingBox")) {
  // We are in a Salesforce org

  // When on a *.visual.force.com page, the session in the cookie does not have API access,
  // so we read the session from a cache stored in memory.
  // When visiting a *.salesforce.com page, we store the session cookie in the cache.
  // The first part of the session cookie is the OrgID,
  // which we use as key to support being logged in to multiple orgs at once.
  // http://salesforce.stackexchange.com/questions/23277/different-session-ids-in-different-contexts
  orgId = document.cookie.match(/(^|;\s*)sid=(.+?)!/)[2];
  if (location.hostname.includes(".salesforce.com")) {
    let session = {key: document.cookie.match(/(^|;\s*)sid=(.+?);/)[2], hostname: location.hostname};
    chrome.runtime.sendMessage({message: "putSession", orgId: orgId, session: session});
  }

  initButton(false);
}

function initButton(inInspector) {
  let rootEl = document.createElement("div");
  rootEl.id = "insext";
  let btn = document.createElement("div");
  btn.className = "insext-btn";
  btn.tabIndex = 0;
  btn.accessKey = "i";
  btn.title = "Show Salesforce details (Alt+I / Shift+Alt+I)";
  rootEl.appendChild(btn);
  let img = document.createElement("img");
  img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAPCAYAAADd/14OAAAA40lEQVQoz2P4//8/AzpWzGj6L59U/V8urgxMg/g4FUn6J/+X9E38LxWc8V8htR67IpCkuGfMfxCQjSpENRFFkXvk/1+/foGxQloDSD0DVkVfvnyBY7hCdEVv3rxBwXCFIIdKh2WDFT1+/BgDo1qd2fL/1q1bWDFcoW5xz3/Xppn/oycu/X/x4kUMDFeoWdD136R8wn+f9rlgxSdOnEDBKFajK96/fz8coyjEpnj79u1gjKEQXXFE/+L/Gzdu/G9WMfG/am4HZlzDFAf3LPwfOWEJWBPIwwzYUg9MsXXNFDAN4gMAmASShdkS4AcAAAAASUVORK5CYII=";
  btn.appendChild(img);
  document.body.appendChild(rootEl);
  btn.addEventListener("click", function clickListener() {
    btn.removeEventListener("click", clickListener);
    loadPopup();
  });

  function loadPopup() {
    btn.addEventListener("click", function() {
      if (!rootEl.classList.contains("insext-active")) {
        openPopup();
      } else {
        closePopup();
      }
    });

    let popupSrc = chrome.extension.getURL("data/popup.html");
    let popupEl = document.createElement("iframe");
    popupEl.className = "insext-popup";
    popupEl.src = popupSrc;
    addEventListener("message", function(e) {
      if (e.source == popupEl.contentWindow && e.data.insextInitRequest) {
        popupEl.contentWindow.postMessage({
          insextInitResponse: true,
          orgId: orgId,
          isDevConsole: !!document.querySelector("body.ApexCSIPage"),
          inAura: !!document.querySelector("#auraLoadingBox"),
          inInspector: inInspector
        }, popupSrc);
        openPopup();
      }
      if (e.source == popupEl.contentWindow && e.data.insextClosePopup) {
        closePopup();
      }
      if (e.source == popupEl.contentWindow && e.data.insextShowStdPageDetails) {
        showStdPageDetails(getRecordId())
          .then(
            () => {
              popupEl.contentWindow.postMessage({insextShowStdPageDetails: true, success: true}, popupSrc);
            },
            error => {
              console.error(error);
              // We stringify the error because postMessage cannot handle certain objects such as Error.
              popupEl.contentWindow.postMessage({insextShowStdPageDetails: true, success: false, error: "" + error}, popupSrc);
            }
          );
      }
    });
    rootEl.appendChild(popupEl);
    function openPopup() {
      popupEl.contentWindow.postMessage({insextUpdateRecordId: true, recordId: getRecordId()}, popupSrc);
      rootEl.classList.add("insext-active");
      // These event listeners are only enabled when the popup is active to avoid interfering with Salesforce when not using the inspector
      addEventListener("click", outsidePopupClick);
      popupEl.focus();
    }
    function closePopup() {
      rootEl.classList.remove("insext-active");
      removeEventListener("click", outsidePopupClick);
      popupEl.blur();
    }
    function outsidePopupClick(e) {
      // Close the popup when clicking outside it
      if (!rootEl.contains(e.target)) {
        closePopup();
      }
    }
    function getRecordId() {
      // Find record ID from URL
      let recordId = null;
      let match = document.location.search.match(/(\?|&)id=([a-zA-Z0-9]*)(&|$)/);
      if (match) {
        recordId = match[2];
      }
      if (!recordId && location.hostname.indexOf(".salesforce.com") > -1) {
        match = document.location.pathname.match(/\/([a-zA-Z0-9]*)(\/|$)/);
        if (match) {
          recordId = match[1];
        }
      }
      if (recordId && recordId.length != 3 && recordId.length != 15 && recordId.length != 18) {
        recordId = null;
      }
      if (!recordId && location.hostname.includes(".lightning.force.com")) {
        match = document.location.hash.match(/\/sObject\/([a-zA-Z0-9]*)(\/|$)/);
        if (match) {
          recordId = match[1];
        }
      }
      return recordId;
    }
  }

}
