/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function browserWindowsCount() {
  let count = 0;
  let e = Services.wm.getEnumerator("navigator:browser");
  while (e.hasMoreElements()) {
    if (!e.getNext().closed)
      ++count;
  }
  return count;
}

function test() {
  /** Test for Bug 493467, ported by Bug 524365 **/

  is(browserWindowsCount(), 1, "Only one browser window should be open initially");

  let tab = getBrowser().addTab();
  tab.linkedBrowser.stop();
  let tabState = JSON.parse(ss.getTabState(tab));
  is(tabState.disallow || "", "", "Everything is allowed per default");

  // collect all permissions that can be set on a docShell (i.e. all
  // attributes starting with "allow" such as "allowJavascript") and
  // disallow them all, as SessionStore only remembers disallowed ones
  let permissions = [];
  let docShell = tab.linkedBrowser.docShell;
  for (let attribute in docShell) {
    if (/^allow([A-Z].*)/.test(attribute)) {
      permissions.push(RegExp.$1);
      docShell[attribute] = false;
    }
  }
  
  // make sure that all available permissions have been remembered
  tabState = JSON.parse(ss.getTabState(tab));
  let disallow = tabState.disallow.split(",");
  permissions.forEach(function(aName) {
    ok(disallow.indexOf(aName) > -1, "Saved state of allow" + aName);
  });
  // IF A TEST FAILS, please add the missing permission's name (without the
  // leading "allow") to nsSessionStore.js's CAPABILITIES array. Thanks.
  
  getBrowser().removeTab(tab);
  is(browserWindowsCount(), 1, "Only one browser window should be open eventually");
}
