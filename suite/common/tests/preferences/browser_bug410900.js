function test() {
  waitForExplicitFinish();

  // Setup a phony handler to ensure the app pane will be populated.
  var handler = Cc["@mozilla.org/uriloader/web-handler-app;1"]
                  .createInstance(Ci.nsIWebHandlerApp);
  handler.name = "App pane alive test";
  handler.uriTemplate = "http://test.mozilla.org/%s";

  var extps = Cc["@mozilla.org/uriloader/external-protocol-service;1"]
                .getService(Ci.nsIExternalProtocolService);
  var info = extps.getProtocolHandlerInfo("apppanetest");
  info.possibleApplicationHandlers.appendElement(handler);

  var hserv = Cc["@mozilla.org/uriloader/handler-service;1"]
                .getService(Ci.nsIHandlerService);
  hserv.store(info);

  var obs = Cc["@mozilla.org/observer-service;1"]
              .getService(Ci.nsIObserverService);

  function observer(win, topic, data) {
    if (topic != "app-handler-pane-loaded")
      return;

    obs.removeObserver(observer, "app-handler-pane-loaded");
    runTest(win);
  }
  obs.addObserver(observer, "app-handler-pane-loaded");

  openDialog("chrome://communicator/content/pref/preferences.xul",
             "PrefWindow", "chrome,titlebar,dialog=no,resizable",
             "applications_pane");
}

function runTest(win) {
  var sel = win.document.documentElement.getAttribute("lastSelected");
  ok(sel == "applications_pane", "Specified pane was opened");

  var rbox = win.document.getElementById("handlersView");
  ok(rbox, "handlersView is present");

  var items = rbox && rbox.getElementsByTagName("listitem");
  ok(items && items.length > 0, "App handler list populated");

  var handlerAdded = false;
  for (var i = 0; i < items.length; i++) {
    if (items[i].getAttribute("type") == "apppanetest")
      handlerAdded = true;
  }
  ok(handlerAdded, "apppanetest protocol handler was succesfully added");

  win.close();
  finish();
}
