/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["Core"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource:///modules/imServices.jsm");
Cu.import("resource:///modules/imWindows.jsm");
Cu.import("resource:///modules/ibNotifications.jsm");
Cu.import("resource:///modules/ibSounds.jsm");
Cu.import("resource:///modules/imXPCOMUtils.jsm");

var Core = {
  _events: [
    "account-disconnected",
    "browser-request",
    "quit-application-requested"
  ],

  get bundle() l10nHelper("chrome://instantbird/locale/core.properties"),

  initLibpurpleOverrides: function() {
    let forcePurple = Services.prefs.getCharPref("chat.prpls.forcePurple")
                              .split(",")
                              .map(String.trim)
                              .filter(function(aPrplId) !!aPrplId);
    if (!forcePurple.length)
      return;

    let catMan =
      Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
    for (let prplId of forcePurple) {
      catMan.addCategoryEntry("im-protocol-plugin", prplId,
                              "@instantbird.org/purple/protocol;1",
                              false, true);
    }
  },

  init: function() {
    try {
      // Set the Vendor for breakpad only
      if ("nsICrashReporter" in Ci) {
        Components.classes["@mozilla.org/xre/app-info;1"]
                  .getService(Ci.nsICrashReporter)
                  .annotateCrashReport("Vendor", "Instantbird");
      }
    } catch(e) {
      // This can fail if breakpad isn't enabled,
      // don't worry too much about this exception.
    }

    if (!Ci.imICoreService) {
      this._promptError("startupFailure.purplexpcomFileError");
      return false;
    }

    if (!Components.classes["@mozilla.org/chat/core-service;1"]) {
      this._promptError("startupFailure.xpcomRegistrationError");
      return false;
    }

    this.initLibpurpleOverrides();

    try {
      Services.core.init();
    }
    catch (e) {
      this._promptError("startupFailure.purplexpcomInitError", e);
      return false;
    }

    Conversations.init();
    Notifications.init();
    Sounds.init();
#ifdef XP_WIN
    // For windows seven, initialize the jump list module.
    const WINTASKBAR_CONTRACTID = "@mozilla.org/windows-taskbar;1";
    if (WINTASKBAR_CONTRACTID in Cc &&
        Cc[WINTASKBAR_CONTRACTID].getService(Ci.nsIWinTaskbar).available) {
      let temp = {};
      Cu.import("resource:///modules/ibWinJumpList.jsm", temp);
      temp.WinJumpList.init();
    }
#endif

    this._events.forEach(function (aTopic) {
      Services.obs.addObserver(Core, aTopic, false);
    });

    let self = this;
    Services.cmd.registerCommand({
      name: "about",
      get helpString() self.bundle("aboutCommand.help"),
      usageContext: Ci.imICommand.CMD_CONTEXT_ALL,
      priority: Ci.imICommand.CMD_PRIORITY_DEFAULT,
      run: function(aMsg, aConv) {
        let page = aMsg.replace(/^about:/, "");
        let url = "about:" + page;
        // If the page doesn't exist, we avoid opening a tab.
        try {
          Services.io.newChannelFromURI(Services.io.newURI(url, null, null));
        } catch(e) {
          if (e.result == Components.results.NS_ERROR_MALFORMED_URI) {
            Services.conversations.getUIConversation(aConv).systemMessage(
              self.bundle("aboutCommand.invalidPageMessage", page));
            return true;
          }
          Components.utils.reportError(e); // Log unexpected errors.
          return false;
        }
        // Try to get the most recent conversation window. If no such window exists,
        // win will be null.
        let win = Services.wm.getMostRecentWindow("Messenger:convs");
        // Tries to open an aboutPanel in the specified window.
        let showPage = function(aWindow, aPage) {
          // Return false if the window doesn't exist.
          if (!aWindow)
            return false;
          let panel = aWindow.document.createElementNS(
            "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
            "aboutPanel");
          // Try to add the panel, and return false if the window couldn't accept
          // it (e.g. tabbed conversations are disabled).
          if (!aWindow.getTabBrowser().addPanel(panel))
            return false;
          panel.showAboutPage(aPage);
          aWindow.getTabBrowser().selectPanel(panel);
          return true;
        }
        // Try to show the page in win, and open a new window if it didn't work.
        if (!showPage(win, page)) {
          win = Services.ww.openWindow(null, "chrome://instantbird/content/instantbird.xul",
                                       "_blank", "chrome,toolbar,resizable", null);
          win.addEventListener("load", showPage.bind(null, win, page));
          return true;
        }
        return true;
      }
    });

    this._showAccountManagerIfNeeded(true);
    return true;
  },

  showWindow: function(aWindowType, aUrl, aName, aFeatures) {
    var win = Services.wm.getMostRecentWindow(aWindowType);
    if (win)
      win.focus();
    else
      win = Services.ww.openWindow(null, aUrl, aName, aFeatures, null);
    return win;
  },

  showAccounts: function() {
    this.showWindow("Messenger:Accounts",
                    "chrome://instantbird/content/accounts.xul", "Accounts",
                    "chrome,resizable,centerscreen");
  },
  showAddons: function() {
    this.showWindow("Addons:Manager",
                    "chrome://instantbird/content/extensions.xul", "Addons",
                    "chrome,menubar,extrachrome,toolbar,dialog=no,resizable,centerscreen");
  },
  showContacts: function() {
    this.showWindow("Messenger:blist",
                    "chrome://instantbird/content/blist.xul", "Contacts",
                    "chrome,dialog=no,all");
  },
  showPreferences: function() {
    this.showWindow("Messenger:Preferences",
                    "chrome://instantbird/content/preferences/preferences.xul",
                    "Preferences",
                    "chrome,titlebar,toolbar,centerscreen,dialog=no");
  },
  showUpdates: function() {
    // copied from checkForUpdates in mozilla/browser/base/content/utilityOverlay.js
    var um =
      Components.classes["@mozilla.org/updates/update-manager;1"]
                .getService(Components.interfaces.nsIUpdateManager);
    var prompter =
      Components.classes["@mozilla.org/updates/update-prompt;1"]
                .createInstance(Components.interfaces.nsIUpdatePrompt);

    // If there's an update ready to be applied, show the "Update Downloaded"
    // UI instead and let the user know they have to restart the browser for
    // the changes to be applied.
    if (um.activeUpdate && um.activeUpdate.state == "pending")
      prompter.showUpdateDownloaded(um.activeUpdate);
    else
      prompter.checkForUpdates();
  },

  getIter: function(aEnumerator) {
    while (aEnumerator.hasMoreElements())
      yield aEnumerator.getNext();
  },
  getAccounts: function() this.getIter(Services.accounts.getAccounts()),

  /* This function pops up the account manager if no account is
   * connected or connecting.
   * When called during startup (aIsStarting == true), it will also
   * look for crashed accounts.
   */
  _showAccountManagerIfNeeded: function (aIsStarting) {
    // If the current status is offline, we don't need the account manager
    let isOffline =
      Services.core.globalUserStatus.statusType == Ci.imIStatusInfo.STATUS_OFFLINE;
    if (isOffline && !aIsStarting)
      return;

    let hasActiveAccount = false;
    let hasCrashedAccount = false;
    for (let acc in this.getAccounts()) {
      if (acc.connected || acc.connecting)
        hasActiveAccount = true;

      // We only check for crashed accounts on startup.
      if (aIsStarting && acc.autoLogin &&
          acc.firstConnectionState == acc.FIRST_CONNECTION_CRASHED)
        hasCrashedAccount = true;
    }

    /* We only display the account manager on startup if an account has crashed
       or if all accounts are disconnected
       In case of connection failure after an automatic reconnection attempt,
       we don't want to popup the account manager */
    if ((!hasActiveAccount && !isOffline) || (aIsStarting && hasCrashedAccount))
      this.showAccounts();
  },

  observe: function(aSubject, aTopic, aMsg) {
    if (aTopic == "account-disconnected") {
      let account = aSubject.QueryInterface(Ci.imIAccount);
      if (!account.reconnectAttempt)
        this._showAccountManagerIfNeeded(false);
      return;
    }

    if (aTopic == "browser-request") {
      Services.ww.openWindow(null,
                             "chrome://chat/content/browserRequest.xul",
                             null, "chrome", aSubject);
      return;
    }

    if (aTopic == "quit-application-requested") {
      this._onQuitRequest(aSubject, aMsg);
      return;
    }
  },

  _onQuitRequest: function (aCancelQuit, aQuitType) {
    // The request has already been canceled somewhere else
    if ((aCancelQuit instanceof Components.interfaces.nsISupportsPRBool)
         && aCancelQuit.data)
      return;

    if (!Services.prefs.getBoolPref("messenger.warnOnQuit"))
      return;

    let unreadConvsCount =
      Services.conversations.getUIConversations()
              .filter(function(c) c.unreadTargetedMessageCount)
              .length;
    if (unreadConvsCount == 0)
      return;

    let bundle =
      Services.strings.createBundle("chrome://instantbird/locale/quitDialog.properties");
    let promptTitle    = bundle.GetStringFromName("dialogTitle");
    let promptMessage  = bundle.GetStringFromName("message");
    let promptCheckbox = bundle.GetStringFromName("checkbox");
    let action         = aQuitType == "restart" ? "restart" : "quit";
    let button         = bundle.GetStringFromName(action + "Button");

    Components.utils.import("resource://gre/modules/PluralForm.jsm");
    promptMessage = PluralForm.get(unreadConvsCount, promptMessage)
                              .replace("#1", unreadConvsCount);

    let prompts = Services.prompt;
    let flags = prompts.BUTTON_TITLE_IS_STRING * prompts.BUTTON_POS_0 +
                prompts.BUTTON_TITLE_CANCEL * prompts.BUTTON_POS_1 +
                prompts.BUTTON_POS_1_DEFAULT;
    let checkbox = {value: false};
    let parentWindow = Services.wm.getMostRecentWindow("Messenger:convs") ||
                       Services.wm.getMostRecentWindow("Messenger:blist");
    if (parentWindow)
      parentWindow.focus();
    if (prompts.confirmEx(parentWindow, promptTitle, promptMessage, flags,
                          button, null, null, promptCheckbox, checkbox)) {
      aCancelQuit.data = true;
      return;
    }

    if (checkbox.value)
      Services.prefs.setBoolPref("messenger.warnOnQuit", false);
  },

  _promptError: function(aKeyString, aMessage) {
    var bundle = this.bundle;

    var title = bundle("startupFailure.title");
    var message = bundle("startupFailure.apologize") + "\n\n" +
      (aMessage ? bundle(aKeyString, aMessage)
                : bundle(aKeyString) + "\n\n" + bundle("startupFailure.update"));
    const nsIPromptService = Components.interfaces.nsIPromptService;
    const flags =
      nsIPromptService.BUTTON_POS_1 * nsIPromptService.BUTTON_TITLE_IS_STRING +
      nsIPromptService.BUTTON_POS_0 * nsIPromptService.BUTTON_TITLE_IS_STRING;

    var prompts = Services.prompt;
    if (!prompts.confirmEx(null, title, message, flags,
                           bundle("startupFailure.buttonUpdate"),
                           bundle("startupFailure.buttonClose"),
                           null, null, {}))
      this.showUpdates();
  }
};
