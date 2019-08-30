/* -*- Mode: JavaScript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { AddonManager } = ChromeUtils.import(
  "resource://gre/modules/AddonManager.jsm"
);
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

document.addEventListener("dialogaccept", onOK);
document.addEventListener("dialogcancel", onCancel);
document.addEventListener("dialogextra1", () => window.close());

function restartApp() {
  Services.startup.quit(
    Services.startup.eForceQuit | Services.startup.eRestart
  );
}

function deleteLocalstore() {
  // Delete the xulstore file.
  let xulstoreFile = Services.dirsvc.get("ProfD", Ci.nsIFile);
  xulstoreFile.append("xulstore.json");
  if (xulstoreFile.exists()) {
    xulstoreFile.remove(false);
  }
}

function disableAddons() {
  AddonManager.getAllAddons(function(aAddons) {
    aAddons.forEach(function(aAddon) {
      if (aAddon.type == "theme") {
        // Setting userDisabled to false on the default theme activates it,
        // disables all other themes and deactivates the applied persona, if
        // any.
        const DEFAULT_THEME_ID = "{972ce4c6-7e08-4474-a285-3208198ce6fd}";
        if (aAddon.id == DEFAULT_THEME_ID) {
          aAddon.userDisabled = false;
        }
      } else {
        aAddon.userDisabled = true;
      }
    });

    restartApp();
  });
}

function onOK(event) {
  try {
    if (document.getElementById("resetToolbars").checked) {
      deleteLocalstore();
    }
    if (document.getElementById("disableAddons").checked) {
      disableAddons();
      // disableAddons will asynchronously restart the application
      event.preventDefault();
      return;
    }
  } catch (e) {}

  restartApp();
  event.preventDefault();
}

function onCancel() {
  Services.startup.quit(Services.startup.eForceQuit);
}

function onLoad() {
  document
    .getElementById("tasks")
    .addEventListener("CheckboxStateChange", updateOKButtonState);
}

function updateOKButtonState() {
  document.documentElement.getButton("accept").disabled =
    !document.getElementById("resetToolbars").checked &&
    !document.getElementById("disableAddons").checked;
}
