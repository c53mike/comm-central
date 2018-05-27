/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var MODULE_NAME = "test-addons-mgr";

var RELATIVE_ROOT = "../shared-modules";
var MODULE_REQUIRES = ["folder-display-helpers", "content-tab-helpers"];

function setupModule(module) {
  for (let lib of MODULE_REQUIRES) {
    collector.getModule(lib).installInto(module);
  }
}

function test_open_addons_with_url() {
  mc.window.openAddonsMgr('addons://list/theme');
  mc.sleep(0);

  let tab = mc.tabmail.currentTabInfo;
  wait_for_content_tab_load(tab, 'about:addons', 10000);
  assert_true(content_tab_e(tab, 'category-theme').selected,
              "Themes category should be selected!");

  mc.tabmail.switchToTab(0); // switch to 3pane

  mc.window.openAddonsMgr('addons://list/plugin');
  mc.sleep(0);

  tab = mc.tabmail.currentTabInfo;
  wait_for_content_tab_load(tab, 'about:addons', 10000);
  assert_true(content_tab_e(tab, 'category-plugin').selected,
              "Plugins category should be selected!");

  mc.tabmail.closeTab(tab);
}

/**
 * Bug 1462923
 * Check if the "Tools->Add-on Options" menu item works and shows our add-on.
 * This relies on the MozMill extension having optionsURL defined in install.rdf,
 * however simplistic the preferences XUL document may be.
 */
function test_addon_prefs() {
  // Open Add-on Options.
  mc.click(mc.eid("tasksMenu"));
  let popups = mc.click_menus_in_sequence(mc.e("taskPopup"), [ { id: "addonsManager_prefs" } ], true);
  let foundAddon = false;
  // MozMill add-on should be somewhere in the list.
  for (let item of popups[popups.length-1].children) {
    if (item.tagName == "menuitem" && item.getAttribute("collapsed") != "true" &&
        item.label == "MozMill") {
      foundAddon = true;
      break;
    }
  }
  assert_true(foundAddon);
  mc.close_popup_sequence(popups);
}
// The test operates the main menu which is not accessible from MozMill on Mac.
test_addon_prefs.EXCLUDED_PLATFORMS = ["darwin"];
