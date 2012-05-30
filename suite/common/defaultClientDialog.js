/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// this dialog can only be opened if we have a shell service
const nsIShellService = Components.interfaces.nsIShellService;
const nsIPrefBranch = Components.interfaces.nsIPrefBranch;

function onLoad()
{
  var shellSvc = Components.classes["@mozilla.org/suite/shell-service;1"]
                           .getService(nsIShellService);
  var defaultList = document.getElementById("defaultList");
  var appTypes = shellSvc.shouldBeDefaultClientFor;
  /* Iterate through the list of possible default client types and check for
     each list item if we want to be the default for that type using the AND
     conjunction */
  for (var i = 0; i < defaultList.getRowCount(); i++) {
    var currentItem = defaultList.getItemAtIndex(i);
    if (nsIShellService[currentItem.value] & appTypes)
      currentItem.checked = true;

    if (shellSvc.isDefaultClient(false, nsIShellService[currentItem.value]))
      currentItem.disabled = true;
  }
}

function onAccept()
{
  // for each checked item, if we aren't already the default, make us the default.
  var shellSvc = Components.classes["@mozilla.org/suite/shell-service;1"]
                           .getService(nsIShellService);
  var pref = Components.classes["@mozilla.org/preferences-service;1"]
                       .getService(nsIPrefBranch);
  var appTypes = 0;
  var appTypesCheck = 0;
  var defaultList = document.getElementById("defaultList");

  for (var i = 0; i < defaultList.getRowCount(); i++) {
    var currentItem = defaultList.getItemAtIndex(i);
    var currentAppType = nsIShellService[currentItem.value];
    
    if (currentItem.checked) {
      appTypesCheck |= currentAppType;
      
      if (!currentItem.disabled)
        appTypes |= currentAppType;
    }
  }
 
  if (appTypes)
    shellSvc.setDefaultClient(false, true, appTypes);

  // Update the pref for which app types we should check if we are the default app
  shellSvc.shouldBeDefaultClientFor = appTypesCheck;

  shellSvc.shouldCheckDefaultClient = document.getElementById('checkOnStartup').checked;
}
