function test() {
  for (let i = 0; i < 9; i++)
    gBrowser.addTab();

/* This part tests accel keys, which are not implemented in Seamonkey yet.
 * Commenting out for now ...
 * var isLinux = AppConstants.platform == "linux";
 * for (let i = 9; i >= 1; i--) {
 *   EventUtils.synthesizeKey(i.toString(), { altKey: isLinux, accelKey: !isLinux });
 *
 *   is(gBrowser.tabContainer.selectedIndex, (i == 9 ? gBrowser.tabs.length : i) - 1,
 *      (isLinux ? "Alt" : "Accel") + "+" + i + " selects expected tab");
 * }
 */

  gBrowser.selectTabAtIndex(-3);
  is(gBrowser.tabContainer.selectedIndex, gBrowser.tabs.length - 3,
     "gBrowser.selectTabAtIndex(-3) selects expected tab");

  for (let i = 0; i < 9; i++)
    gBrowser.removeCurrentTab();
}
