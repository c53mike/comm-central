/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test that the IMIP bar behaves properly for eml files.
 */

var os = ChromeUtils.import("chrome://mozmill/content/stdlib/os.jsm");

var { open_message_from_file } = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { close_window } = ChromeUtils.import("resource://testing-common/mozmill/WindowHelpers.jsm");

/**
 * Test that when opening a message containing an event, the IMIP bar shows.
 */
function test_event_from_eml() {
  let thisFilePath = os.getFileForPath(__file__);
  let file = os.getFileForPath(os.abspath("./message-containing-event.eml", thisFilePath));

  let msgc = open_message_from_file(file);

  msgc.waitFor(() => {
    let bar = msgc.window.document.getElementById("imip-bar");
    if (!bar) {
      throw new Error("Couldn't find imip-bar in DOM.");
    }
    return bar.collapsed === false;
  }, "Timed out waiting for IMIP bar to show");

  close_window(msgc);
}