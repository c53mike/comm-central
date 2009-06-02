# -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Mozilla Communicator client code, released
# March 31, 1998.
#
# The Initial Developer of the Original Code is
# Netscape Communications Corporation.
# Portions created by the Initial Developer are Copyright (C) 1998-1999
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

/* This is where functions related to the standalone message window are kept */

// from MailNewsTypes.h
const nsMsgKey_None = 0xFFFFFFFF;
const nsMsgViewIndex_None = 0xFFFFFFFF;

/* globals for a particular window */

var gCurrentMessageUri;
var gCurrentFolderUri;
var gThreadPaneCommandUpdater = null;
var gNextMessageViewIndexAfterDelete = -2;
var gCurrentFolderToRerootForStandAlone;
var gRerootOnFolderLoadForStandAlone = false;
var gNextMessageAfterLoad = null;
var gMessageToLoad = nsMsgKey_None;

// the folderListener object
var folderListener = {
  OnItemAdded: function(parentItem, item) {},

  OnItemRemoved: function(parentItem, item) {},
  OnItemPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {
    if (item.URI == gCurrentFolderUri) {
      if (property.toString() == "TotalMessages" || property.toString() == "TotalUnreadMessages") {
        UpdateStandAloneMessageCounts();
      }
    }
  },
  OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue){},
  OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},

  OnItemEvent: function(folder, event) {
    var eventType = event.toString();

    if (eventType == "DeleteOrMoveMsgCompleted")
      HandleDeleteOrMoveMsgCompleted(folder);
    else if (eventType == "DeleteOrMoveMsgFailed")
      HandleDeleteOrMoveMsgFailed(folder);
    else if (eventType == "FolderLoaded") {
      if (folder) {
        var uri = folder.URI;
        if (uri == gCurrentFolderToRerootForStandAlone) {
          gCurrentFolderToRerootForStandAlone = null;
          folder.endFolderLoading();
          if (gRerootOnFolderLoadForStandAlone) {
            RerootFolderForStandAlone(uri);
          }
        }
      }
    }
    else if (eventType == "JunkStatusChanged") {
      HandleJunkStatusChanged(folder);
    }
  }
}

var messagepaneObserver = {

  canHandleMultipleItems: false,

  onDrop: function (aEvent, aData, aDragSession)
  {
    var sourceUri = aData.data;
    if (sourceUri != gCurrentMessageUri)
    {
      var msgHdr = GetMsgHdrFromUri(sourceUri);

      // Reset the window's message uri and folder uri vars, and
      // update the command handlers to what's going to be used.
      // This has to be done before the call to CreateView().
      gCurrentMessageUri = sourceUri;
      gCurrentFolderUri = msgHdr.folder.URI;
      UpdateMailToolbar('onDrop');

      // even if the folder uri's match, we can't use the existing view
      // (msgHdr.folder.URI == windowID.gCurrentFolderUri)
      // the reason is quick search and mail views.
      // see bug #187673
      CreateView(aDragSession.sourceNode.ownerDocument.defaultView.gDBView);
      LoadMessageByMsgKey(msgHdr.messageKey);
    }
  },

  onDragOver: function (aEvent, aFlavour, aDragSession)
  {
    var messagepanebox = document.getElementById("messagepanebox");
    messagepanebox.setAttribute("dragover", "true");
  },

  onDragExit: function (aEvent, aDragSession)
  {
    var messagepanebox = document.getElementById("messagepanebox");
    messagepanebox.removeAttribute("dragover");
  },

  canDrop: function(aEvent, aDragSession)  //allow drop from mail:3pane window only - 4xp
  {
    var doc = aDragSession.sourceNode.ownerDocument;
    var elem = doc.getElementById("messengerWindow");
    return (elem && (elem.getAttribute("windowtype") == "mail:3pane"));
  },

  getSupportedFlavours: function ()
  {
    var flavourSet = new FlavourSet();
    flavourSet.appendFlavour("text/x-moz-message");
    return flavourSet;
  }
};

function nsMsgDBViewCommandUpdater()
{}

function UpdateStandAloneMessageCounts()
{
  // hook for extra toolbar items
  var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  observerService.notifyObservers(window, "mail:updateStandAloneMessageCounts", "");
}

nsMsgDBViewCommandUpdater.prototype =
{
  updateCommandStatus : function()
    {
      // the back end is smart and is only telling us to update command status
      // when the # of items in the selection has actually changed.
      UpdateMailToolbar("dbview, std alone window");
    },

  displayMessageChanged : function(aFolder, aSubject, aKeywords)
  {
    setTitleFromFolder(aFolder, aSubject);
    ClearPendingReadTimer(); // we are loading / selecting a new message so kill the mark as read timer for the currently viewed message
    gCurrentMessageUri = gDBView.URIForFirstSelectedMessage;
    UpdateStandAloneMessageCounts();
    goUpdateCommand("button_delete");
    goUpdateCommand("button_junk");
    goUpdateCommand("button_goBack");
    goUpdateCommand("button_goForward");
    goUpdateCommand("button_reply");
    goUpdateCommand("button_replyall");
    goUpdateCommand("button_replylist");
  },

  updateNextMessageAfterDelete : function()
  {
    SetNextMessageAfterDelete();
  },

  summarizeSelection : function() {return false},

  QueryInterface : function(iid)
  {
    if (iid.equals(Components.interfaces.nsIMsgDBViewCommandUpdater) ||
        iid.equals(Components.interfaces.nsISupports))
      return this;

    throw Components.results.NS_NOINTERFACE;
  }
}

function HandleDeleteOrMoveMsgCompleted(folder)
{
  if ((folder.URI == gCurrentFolderUri))
  {
    gDBView.onDeleteCompleted(true);
    if (gNextMessageViewIndexAfterDelete != nsMsgViewIndex_None)
    {
      var nextMstKey = gDBView.getKeyAt(gNextMessageViewIndexAfterDelete);

      if (pref.getBoolPref("mail.close_message_window.on_delete")) {
        // Tell the main window to select the next message since we
        // won't be viewing it automatically in the standalone window.
        var treeView = window.opener.document.getElementById("threadTree").view;
        if (gDBView.removeRowOnMoveOrDelete && gNextMessageViewIndexAfterDelete >= 0) {
          gDBView.suppressCommandUpdating = true;
          treeView.selection.select(gNextMessageViewIndexAfterDelete);
          treeView.selectionChanged();

          window.opener.EnsureRowInThreadTreeIsVisible(gNextMessageViewIndexAfterDelete);
          gDBView.suppressCommandUpdating = false;
        }

        window.close();
      }
      else if (nextMstKey != nsMsgKey_None) {
        LoadMessageByViewIndex(gNextMessageViewIndexAfterDelete);
      }
      else {
        window.close();
      }
    }
    else
    {
      // close the stand alone window because there are no more messages in the folder
      window.close();
    }
  }
}

function HandleDeleteOrMoveMsgFailed(folder)
{
  gDBView.onDeleteCompleted(false);
}

function IsCurrentLoadedFolder(folder)
{
  return (folder.URI == gCurrentFolderUri);
}


// we won't show the window until the onload() handler is finished
// so we do this trick (suggested by hyatt / blaker)
function OnLoadMessageWindow()
{
  setTimeout(delayedOnLoadMessageWindow, 0); // when debugging, set this to 5000, so you can see what happens after the window comes up.
}

function delayedOnLoadMessageWindow()
{
  HideMenus();
  ShowMenus();
  MailOfflineMgr.init();
  CreateMailWindowGlobals();
  verifyAccounts(null);

  InitMsgWindow();

  messenger.setWindow(window, msgWindow);
  // FIX ME - later we will be able to use onload from the overlay
  OnLoadMsgHeaderPane();

  var nsIFolderListener = Components.interfaces.nsIFolderListener;
  var notifyFlags = nsIFolderListener.removed | nsIFolderListener.event | nsIFolderListener.intPropertyChanged;
  Components.classes["@mozilla.org/messenger/services/session;1"]
            .getService(Components.interfaces.nsIMsgMailSession)
            .AddFolderListener(folderListener, notifyFlags);

  var originalView = null;
  var folder = null;
  var messageUri;
  var loadCustomMessage = false;       //set to true when either loading a message/rfc822 attachment or a .eml file
  if (window.arguments)
  {
    if (window.arguments[0])
    {
      try
      {
        messageUri = window.arguments[0];
        if (messageUri instanceof Components.interfaces.nsIURI)
        {
          loadCustomMessage = /type=application\/x-message-display/.test(messageUri.spec);
          gCurrentMessageUri = messageUri.spec;
          if (messageUri.folder && messageUri instanceof Components.interfaces.nsIMsgMailNewsUrl)
            folder = messageUri.folder;
        }
      }
      catch(ex)
      {
        folder = null;
        dump("## ex=" + ex + "\n");
      }

      if (!gCurrentMessageUri)
        gCurrentMessageUri = window.arguments[0];
    }
    else
      gCurrentMessageUri = null;

    if (window.arguments[1])
      gCurrentFolderUri = window.arguments[1];
    else
      gCurrentFolderUri = folder ? folder.URI : null;

    if (window.arguments[2])
      originalView = window.arguments[2];

  }

  CreateView(originalView);

  gPhishingDetector.init();

  // initialize the customizeDone method on the customizeable toolbar
  var toolbox = document.getElementById("mail-toolbox");
  toolbox.customizeDone = function(aEvent) { MailToolboxCustomizeDone(aEvent, "CustomizeMailToolbar"); };

  var toolbarset = document.getElementById('customToolbars');
  toolbox.toolbarset = toolbarset;

  setTimeout(OnLoadMessageWindowDelayed, 0, loadCustomMessage);

  SetupCommandUpdateHandlers();
}

function OnLoadMessageWindowDelayed(loadCustomMessage)
{
  if (loadCustomMessage)
  {
    gDBView.suppressMsgDisplay = false;
    gDBView.loadMessageByUrl(gCurrentMessageUri);
  }
  else
  {
    var msgKey = extractMsgKeyFromURI(gCurrentMessageUri);
    var viewIndex = gDBView.findIndexFromKey(msgKey, true);
    // the message may not appear in the view if loaded from a search dialog
    if (viewIndex != nsMsgViewIndex_None)
      LoadMessageByViewIndex(viewIndex);
    else
      messenger.openURL(gCurrentMessageUri);
  }
  gNextMessageViewIndexAfterDelete = gDBView.msgToSelectAfterDelete;
  UpdateStandAloneMessageCounts();

  // set focus to the message pane
  window.content.focus();

  // since we just changed the pane with focus we need to update the toolbar to reflect this
  // XXX TODO
  // can we optimize
  // and just update cmd_delete and button_delete?
  UpdateMailToolbar("focus");
}

function CreateView(originalView)
{
  var msgFolder = GetLoadedMsgFolder();

  // extract the sort type, the sort order,
  var sortType;
  var sortOrder;
  var viewFlags;
  var viewType;

  if (originalView)
  {
    viewType = originalView.viewType;
    viewFlags = originalView.viewFlags;
    sortType = originalView.sortType;
    sortOrder = originalView.sortOrder;
  }
  else if (msgFolder)
  {
    var msgDatabase = msgFolder.msgDatabase;
    if (msgDatabase)
    {
      var dbFolderInfo = msgDatabase.dBFolderInfo;
      sortType = dbFolderInfo.sortType;
      sortOrder = dbFolderInfo.sortOrder;
      viewFlags = dbFolderInfo.viewFlags;
      viewType = dbFolderInfo.viewType;
      msgDatabase = null;
      dbFolderInfo = null;
   }
  }
  else
  {
    // this is a hack to make opening a stand-alone msg window on a
    // .eml file work. We use a search view since its much more tolerant
    // of not having a folder.
    viewType = nsMsgViewType.eShowSearch;
  }

  // create a db view
  CreateBareDBView(originalView, msgFolder, viewType, viewFlags, sortType, sortOrder);

  var uri;
  if (gCurrentMessageUri)
    uri = gCurrentMessageUri;
  else if (gCurrentFolderUri)
    uri = gCurrentFolderUri;
  else
    uri = null;

  SetUpToolbarButtons(uri);

  // hook for extra toolbar items
  var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  observerService.notifyObservers(window, "mail:setupToolbarItems", uri);
}

function extractMsgKeyFromURI()
{
  var msgKey = -1;
  var msgHdr =   messenger.msgHdrFromURI(gCurrentMessageUri);
  if (msgHdr)
    msgKey = msgHdr.messageKey;
  return msgKey;
}

function ShowMenus()
{
  var openMail3Pane_menuitem = document.getElementById('tasksMenuMail');
  if (openMail3Pane_menuitem)
    openMail3Pane_menuitem.removeAttribute("hidden");
}

function HideMenus()
{
  var message_menuitem=document.getElementById('menu_showMessage');
  if (message_menuitem)
    message_menuitem.setAttribute("hidden", "true");

  var showSearch_showMessage_Separator = document.getElementById('menu_showSearch_showMessage_Separator');
  if (showSearch_showMessage_Separator)
    showSearch_showMessage_Separator.setAttribute("hidden", "true");

  var expandOrCollapseMenu = document.getElementById('menu_expandOrCollapse');
  if (expandOrCollapseMenu)
    expandOrCollapseMenu.setAttribute("hidden", "true");

  var menuDeleteFolder = document.getElementById('menu_deleteFolder');
  if (menuDeleteFolder)
    menuDeleteFolder.hidden = true;

  var renameFolderMenu = document.getElementById('menu_renameFolder');
  if (renameFolderMenu)
    renameFolderMenu.setAttribute("hidden", "true");

  var viewLayoutMenu = document.getElementById("menu_MessagePaneLayout");
  if (viewLayoutMenu)
    viewLayoutMenu.setAttribute("hidden", "true");

  var viewFolderMenu = document.getElementById("menu_FolderViews");
  if (viewFolderMenu)
    viewFolderMenu.setAttribute("hidden", "true");

  var viewMessagesMenu = document.getElementById('viewMessagesMenu');
  if (viewMessagesMenu)
    viewMessagesMenu.setAttribute("hidden", "true");

  var viewMessageViewMenu = document.getElementById('viewMessageViewMenu');
  if (viewMessageViewMenu)
    viewMessageViewMenu.setAttribute("hidden", "true");

  var viewMessagesMenuSeparator = document.getElementById('viewMessagesMenuSeparator');
  if (viewMessagesMenuSeparator)
    viewMessagesMenuSeparator.setAttribute("hidden", "true");

  var openMessageMenu = document.getElementById('openMessageWindowMenuitem');
  if (openMessageMenu)
    openMessageMenu.setAttribute("hidden", "true");

  var viewSortMenuSeparator = document.getElementById('viewSortMenuSeparator');
  if (viewSortMenuSeparator)
    viewSortMenuSeparator.setAttribute("hidden", "true");

  var viewSortMenu = document.getElementById('viewSortMenu');
  if (viewSortMenu)
    viewSortMenu.setAttribute("hidden", "true");

  var emptryTrashMenu = document.getElementById('menu_emptyTrash');
  if (emptryTrashMenu)
    emptryTrashMenu.setAttribute("hidden", "true");

  var menuPropertiesSeparator = document.getElementById("editPropertiesSeparator");
  if (menuPropertiesSeparator)
    menuPropertiesSeparator.setAttribute("hidden", "true");

  var menuProperties = document.getElementById('menu_properties');
  if (menuProperties)
    menuProperties.setAttribute("hidden", "true");

  var favoriteFolder = document.getElementById('menu_favoriteFolder');
  if (favoriteFolder)
  {
    favoriteFolder.disabled = true;
    favoriteFolder.setAttribute("hidden", "true");
  }

  var compactFolderMenu = document.getElementById('menu_compactFolder');
  if (compactFolderMenu)
    compactFolderMenu.setAttribute("hidden", "true");

  var trashSeparator = document.getElementById('trashMenuSeparator');
  if (trashSeparator)
    trashSeparator.setAttribute("hidden", "true");

  var goStartPageSeparator = document.getElementById('goNextSeparator');
  if (goStartPageSeparator)
    goStartPageSeparator.hidden = true;

  var goStartPage = document.getElementById('goStartPage');
  if (goStartPage)
   goStartPage.hidden = true;

  var menuFileClose = document.getElementById('menu_close');
  var menuFileQuit = document.getElementById('menu_FileQuitItem');
  if (menuFileClose && menuFileQuit)
    menuFileQuit.parentNode.replaceChild(menuFileClose, menuFileQuit);
}

function OnUnloadMessageWindow()
{
  UnloadCommandUpdateHandlers();
  // FIX ME - later we will be able to use onunload from the overlay
  OnUnloadMsgHeaderPane();
  gPhishingDetector.shutdown();
  OnMailWindowUnload();
}

function GetSelectedMsgFolders()
{
  var folderArray = [];
  var msgFolder = GetLoadedMsgFolder();
  if (msgFolder)
    folderArray[0] = msgFolder;

  return folderArray;
}

function GetFirstSelectedMessage()
{
  return GetLoadedMessage();
}

function GetNumSelectedMessages()
{
  if (gCurrentMessageUri)
    return 1;
  else
    return 0;
}

function GetSelectedMessages()
{
  var messageArray = new Array(1);
  var message = GetLoadedMessage();
  if (message)
    messageArray[0] = message;

  return messageArray;
}

function GetSelectedIndices(dbView)
{
  try {
    return dbView.getIndicesForSelection({});
  }
  catch (ex) {
    dump("ex = " + ex + "\n");
    return null;
  }
}

function GetLoadedMsgFolder()
{
  return (gCurrentFolderUri) ? GetMsgFolderFromUri(gCurrentFolderUri) : null;
}

function GetSelectedFolderURI()
{
  return gCurrentFolderUri;
}

function GetLoadedMessage()
{
  return gCurrentMessageUri;
}

//Clear everything related to the current message. called after load start page.
function ClearMessageSelection()
{
  gCurrentMessageUri = null;
  gCurrentFolderUri = null;
  UpdateMailToolbar("clear msg, std alone window");
}

function SetNextMessageAfterDelete()
{
  gNextMessageViewIndexAfterDelete = gDBView.msgToSelectAfterDelete;
}

function SelectFolder(folderUri)
{
  if (folderUri == gCurrentFolderUri)
    return;

  var msgfolder = GetMsgFolderFromUri(folderUri)
  if (!msgfolder || msgfolder.isServer)
    return;

  // close old folder view
  var dbview = GetDBView();
  if (dbview)
    dbview.close();

  gCurrentFolderToRerootForStandAlone = folderUri;
  msgWindow.openFolder = msgfolder;

  if (msgfolder.manyHeadersToDownload)
  {
    gRerootOnFolderLoadForStandAlone = true;
    try
    {
      // accessing the db causes the folder loaded notification to get sent
      // for local folders.
      var db = msgfolder.msgDatabase;
      msgfolder.startFolderLoading();
      msgfolder.updateFolder(msgWindow);
    }
    catch(ex)
    {
      dump("Error loading with many headers to download: " + ex + "\n");
    }
  }
  else
  {
    RerootFolderForStandAlone(folderUri);
    gRerootOnFolderLoadForStandAlone = false;
    msgfolder.startFolderLoading();

    //Need to do this after rerooting folder.  Otherwise possibility of receiving folder loaded
    //notification before folder has actually changed.
    msgfolder.updateFolder(msgWindow);
  }
}

function RerootFolderForStandAlone(uri)
{
  gCurrentFolderUri = uri;

  // create new folder view
  CreateView(null);

  if (gMessageToLoad != nsMsgKey_None)
  {
    LoadMessageByMsgKey(gMessageToLoad);
    gMessageToLoad = nsMsgKey_None;
  }
  // now do the work to load the appropriate message
  else if (gNextMessageAfterLoad) {
    var type = gNextMessageAfterLoad;
    gNextMessageAfterLoad = null;
    LoadMessageByNavigationType(type);
  }

  SetUpToolbarButtons(gCurrentFolderUri);

  UpdateMailToolbar("reroot folder in stand alone window");

  // hook for extra toolbar items
  var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  observerService.notifyObservers(window, "mail:setupToolbarItems", uri);
}

function GetMsgHdrFromUri(messageUri)
{
  return messenger.msgHdrFromURI(messageUri);
}

function SelectMessage(messageUri)
{
  var msgHdr = GetMsgHdrFromUri(messageUri);
  LoadMessageByMsgKey(msgHdr.messageKey);
}

function ReloadMessage()
{
  gDBView.reloadMessage();
}

function MsgDeleteMessageFromMessageWindow(reallyDelete, fromToolbar)
{
  // if from the toolbar, return right away if this is a news message
  // only allow cancel from the menu:  "Edit | Cancel / Delete Message"
  if (fromToolbar)
  {
    if (isNewsURI(gCurrentFolderUri))
    {
        // if news, don't delete
        return;
    }
  }

  // before we delete
  SetNextMessageAfterDelete();

  if (reallyDelete)
      gDBView.doCommand(nsMsgViewCommandType.deleteNoTrash);
  else
      gDBView.doCommand(nsMsgViewCommandType.deleteMsg);
}

// MessageWindowController object (handles commands when one of the trees does not have focus)
var MessageWindowController =
{
   supportsCommand: function(command)
  {
    switch ( command )
    {
      case "cmd_delete":
      case "cmd_undo":
      case "cmd_redo":
      case "cmd_killThread":
      case "cmd_killSubthread":
      case "cmd_watchThread":
      case "button_delete":
      case "button_junk":
      case "cmd_shiftDelete":
      case "cmd_saveAsFile":
      case "cmd_saveAsTemplate":
      case "cmd_viewPageSource":
      case "cmd_getMsgsForAuthAccounts":
      case "cmd_tag":
      case "button_mark":
      case "cmd_markAsRead":
      case "cmd_markAllRead":
      case "cmd_markThreadAsRead":
      case "cmd_markReadByDate":
      case "cmd_markAsFlagged":
      case "button_file":
      case "cmd_file":
      case "cmd_markAsJunk":
      case "cmd_markAsNotJunk":
      case "cmd_recalculateJunkScore":
      case "cmd_applyFiltersToSelection":
      case "cmd_applyFilters":
      case "cmd_runJunkControls":
      case "cmd_deleteJunk":
      case "cmd_nextMsg":
      case "button_next":
      case "button_previous":
      case "cmd_nextUnreadMsg":
      case "cmd_nextFlaggedMsg":
      case "cmd_nextUnreadThread":
      case "cmd_previousMsg":
      case "cmd_previousUnreadMsg":
      case "cmd_previousFlaggedMsg":
      case "cmd_goForward":
      case "cmd_goBack":
      case "button_goForward":
      case "button_goBack":
        return !(gDBView.keyForFirstSelectedMessage == nsMsgKey_None);

      case "cmd_reply":
      case "button_reply":
      case "cmd_replySender":
      case "cmd_replyGroup":
      case "cmd_replyall":
      case "button_replyall":
      case "cmd_replylist":
      case "button_replylist":
      case "cmd_archive":
      case "button_archive":
      case "cmd_forward":
      case "button_forward":
      case "cmd_forwardInline":
      case "cmd_forwardAttachment":
      case "cmd_editAsNew":
      case "cmd_getNextNMessages":
      case "cmd_find":
      case "cmd_findAgain":
      case "cmd_findPrevious":
      case "cmd_search":
      case "cmd_reload":
      case "cmd_getNewMessages":
      case "button_getNewMessages":
      case "button_print":
      case "cmd_print":
      case "cmd_printpreview":
      case "cmd_printSetup":
      case "cmd_settingsOffline":
      case "cmd_createFilterFromPopup":
      case "cmd_createFilterFromMenu":
      case "cmd_moveToFolderAgain":
        return true;
      case "cmd_synchronizeOffline":
      case "cmd_downloadFlagged":
      case "cmd_downloadSelected":
        return MailOfflineMgr.isOnline();
      default:
        return false;
    }
  },

  isCommandEnabled: function(command)
  {
    switch ( command )
    {
      case "cmd_createFilterFromPopup":
      case "cmd_createFilterFromMenu":
        var loadedFolder = GetLoadedMsgFolder();
        if (!(loadedFolder && loadedFolder.server.canHaveFilters))
          return false;
      case "cmd_delete":
        UpdateDeleteCommand();
        // fall through
      case "button_delete":
        UpdateDeleteToolbarButton();
        // fall through
      case "cmd_shiftDelete":
        var loadedFolder = GetLoadedMsgFolder();
        return gCurrentMessageUri && loadedFolder && (loadedFolder.canDeleteMessages || isNewsURI(gCurrentFolderUri));
      case "button_junk":
        UpdateJunkToolbarButton();
        // fall through
      case "cmd_markAsJunk":
      case "cmd_markAsNotJunk":
      case "cmd_recalculateJunkScore":
        // can't do junk on news yet
        return (!isNewsURI(gCurrentFolderUri));
      case "button_archive":
        var folder = GetLoadedMsgFolder();
        return folder &&
          !(IsSpecialFolder(folder, Components.interfaces.nsMsgFolderFlags.Archive,
                            true));
      case "cmd_archive":
      case "cmd_reply":
      case "button_reply":
      case "cmd_replySender":
      case "cmd_replyGroup":
      case "cmd_replyall":
      case "button_replyall":
      case "cmd_replylist":
      case "button_replylist":
      case "cmd_forward":
      case "button_forward":
      case "cmd_forwardInline":
      case "cmd_forwardAttachment":
      case "cmd_editAsNew":
      case "cmd_print":
      case "cmd_printpreview":
      case "button_print":
      case "cmd_saveAsFile":
      case "cmd_saveAsTemplate":
      case "cmd_viewPageSource":
      case "cmd_reload":
      case "cmd_find":
      case "cmd_tag":
      case "button_mark":
      case "cmd_markAsRead":
      case "cmd_markAllRead":
      case "cmd_markThreadAsRead":
      case "cmd_markReadByDate":
        return(true);
      case "cmd_markAsFlagged":
      case "button_file":
      case "cmd_file":
        return ( gCurrentMessageUri != null);
      case "cmd_printSetup":
        return true;
      case "cmd_getNewMessages":
      case "button_getNewMessages":
      case "cmd_getMsgsForAuthAccounts":
        // GetMsgs should always be enabled, see bugs 89404 and 111102.
        return true;
      case "cmd_getNextNMessages":
        return IsGetNextNMessagesEnabled();
      case "cmd_downloadFlagged":
      case "cmd_downloadSelected":
      case "cmd_synchronizeOffline":
        return MailOfflineMgr.isOnline();
      case "cmd_settingsOffline":
        return IsAccountOfflineEnabled();
      case "cmd_nextMsg":
      case "button_next":
      case "cmd_nextUnreadMsg":
      case "cmd_nextFlaggedMsg":
      case "cmd_nextUnreadThread":
      case "button_previous":
      case "cmd_previousMsg":
      case "cmd_previousUnreadMsg":
      case "cmd_previousFlaggedMsg":
      case "cmd_findAgain":
      case "cmd_findPrevious":
      case "cmd_goForward":
      case "cmd_goBack":
      case "cmd_applyFiltersToSelection":
        return true;
      case "button_goForward":
      case "button_goBack":
      case "cmd_goForward":
      case "cmd_goBack":
        return gDBView &&
            gDBView.navigateStatus((command == "cmd_goBack" ||
                                    command == "button_goBack")
                                    ? nsMsgNavigationType.back : nsMsgNavigationType.forward);
      case "cmd_search":
        var loadedFolder = GetLoadedMsgFolder();
        if (!loadedFolder)
          return false;
        return loadedFolder.server.canSearchMessages;
      case "cmd_undo":
      case "cmd_redo":
        return SetupUndoRedoCommand(command);
      case "cmd_moveToFolderAgain":
        var loadedFolder = GetLoadedMsgFolder();
        if (!loadedFolder || (pref.getBoolPref("mail.last_msg_movecopy_was_move") &&
            !loadedFolder.canDeleteMessages))
          return false;
        return pref.getCharPref("mail.last_msg_movecopy_target_uri");
      case "cmd_applyFilters":
      case "cmd_runJunkControls":
      case "cmd_deleteJunk":
        return false;
      default:
        return false;
    }
  },

  doCommand: function(command)
  {
    // if the user invoked a key short cut then it is possible that we got here for a command which is
    // really disabled. kick out if the command should be disabled.
    if (!this.isCommandEnabled(command)) return;

    var navigationType = nsMsgNavigationType.nextUnreadMessage;

  switch ( command )
  {
    case "cmd_getNewMessages":
      MsgGetMessage();
      break;
        case "cmd_undo":
            messenger.undo(msgWindow);
            break;
        case "cmd_redo":
            messenger.redo(msgWindow);
            break;
        case "cmd_getMsgsForAuthAccounts":
          MsgGetMessagesForAllAuthenticatedAccounts();
          break;
        case "cmd_getNextNMessages":
        MsgGetNextNMessages();
        break;
      case "cmd_archive":
        MsgArchiveSelectedMessages(null);
        break;
      case "cmd_reply":
        MsgReplyMessage(null);
        break;
      case "cmd_replySender":
        MsgReplySender(null);
        break;
      case "cmd_replyGroup":
        MsgReplyGroup(null);
        break;
      case "cmd_replyall":
        MsgReplyToAllMessage(null);
        break;
      case "cmd_replylist":
        MsgReplyToListMessage(null);
        break;
      case "cmd_forward":
        MsgForwardMessage(null);
        break;
      case "cmd_forwardInline":
        MsgForwardAsInline(null);
        break;
      case "cmd_forwardAttachment":
        MsgForwardAsAttachment(null);
        break;
      case "cmd_editAsNew":
        MsgEditMessageAsNew();
        break;
      case "cmd_moveToFolderAgain":
        var folderId = pref.getCharPref("mail.last_msg_movecopy_target_uri");
        if (pref.getBoolPref("mail.last_msg_movecopy_was_move"))
          MsgMoveMessage(GetMsgFolderFromUri(folderId));
        else
          MsgCopyMessage(GetMsgFolderFromUri(folderId));
        break;
      case "cmd_createFilterFromPopup":
        break;// This does nothing because the createfilter is invoked from the popupnode oncommand.
      case "cmd_createFilterFromMenu":
        MsgCreateFilter();
        break;
      case "cmd_delete":
        MsgDeleteMessageFromMessageWindow(false, false);
        break;
      case "cmd_shiftDelete":
        MsgDeleteMessageFromMessageWindow(true, false);
        break;
      case "button_junk":
        MsgJunk();
        break;
      case "button_delete":
        MsgDeleteMessageFromMessageWindow(false, true);
        break;
      case "cmd_printSetup":
        PrintUtils.showPageSetup();
        break;
      case "cmd_print":
        PrintEnginePrint();
        break;
      case "cmd_printpreview":
        PrintEnginePrintPreview();
        break;
      case "cmd_saveAsFile":
        MsgSaveAsFile();
        break;
      case "cmd_saveAsTemplate":
        MsgSaveAsTemplate();
        break;
      case "cmd_viewPageSource":
        ViewPageSource(GetSelectedMessages());
        break;
      case "cmd_reload":
        ReloadMessage();
        break;
      case "cmd_find":
        document.getElementById("FindToolbar").onFindCommand();
        break;
      case "cmd_findAgain":
        document.getElementById("FindToolbar").onFindAgainCommand(false)
        break;
      case "cmd_findPrevious":
        document.getElementById("FindToolbar").onFindAgainCommand(true)
        break;
      case "cmd_search":
        MsgSearchMessages();
        break;
      case "button_mark":
      case "cmd_markAsRead":
        MsgMarkMsgAsRead();
        return;
      case "cmd_markThreadAsRead":
        ClearPendingReadTimer();
        gDBView.doCommand(nsMsgViewCommandType.markThreadRead);
        return;
      case "cmd_markAllRead":
        MsgMarkAllRead();
        return;
      case "cmd_markReadByDate":
        MsgMarkReadByDate();
        return;
      case "cmd_markAsFlagged":
        MsgMarkAsFlagged();
        return;
      case "cmd_markAsJunk":
        JunkSelectedMessages(true);
        return;
      case "cmd_markAsNotJunk":
        JunkSelectedMessages(false);
        return;
      case "cmd_recalculateJunkScore":
        analyzeMessagesForJunk();
        return;
      case "cmd_downloadFlagged":
        gDBView.doCommand(nsMsgViewCommandType.downloadFlaggedForOffline);
        return;
      case "cmd_downloadSelected":
        gDBView.doCommand(nsMsgViewCommandType.downloadSelectedForOffline);
        return;
      case "cmd_synchronizeOffline":
        MsgSynchronizeOffline();
        return;
      case "cmd_settingsOffline":
        MailOfflineMgr.openOfflineAccountSettings();
        return;
      case "cmd_nextUnreadMsg":
      case "button_next":
        performNavigation(nsMsgNavigationType.nextUnreadMessage);
        break;
      case "cmd_nextUnreadThread":
        performNavigation(nsMsgNavigationType.nextUnreadThread);
        break;
      case "cmd_nextMsg":
        performNavigation(nsMsgNavigationType.nextMessage);
        break;
      case "cmd_nextFlaggedMsg":
        performNavigation(nsMsgNavigationType.nextFlagged);
        break;
      case "cmd_previousMsg":
        performNavigation(nsMsgNavigationType.previousMessage);
        break;
      case "button_previous":
      case "cmd_previousUnreadMsg":
        performNavigation(nsMsgNavigationType.previousUnreadMessage);
    break;
      case "cmd_previousFlaggedMsg":
        performNavigation(nsMsgNavigationType.previousFlagged);
        break;
      case "cmd_goForward":
        performNavigation(nsMsgNavigationType.forward);
        break;
      case "cmd_goBack":
        performNavigation(nsMsgNavigationType.back);
        break;
      case "cmd_applyFiltersToSelection":
        MsgApplyFiltersToSelection();
        break;
      }
  },

  onEvent: function(event)
  {
  }
};

function LoadMessageByNavigationType(type)
{
  var resultId = new Object;
  var resultIndex = new Object;
  var threadIndex = new Object;

  gDBView.viewNavigate(type, resultId, resultIndex, threadIndex, true /* wrap */);

  // if we found something....display it.
  if ((resultId.value != nsMsgKey_None) && (resultIndex.value != nsMsgKey_None))
  {
    // load the message key
    LoadMessageByMsgKey(resultId.value);
    // if we changed folders, the message counts changed.
    UpdateStandAloneMessageCounts();

    // new message has been loaded
    return true;
  }

  // no message found to load
  return false;
}

function performNavigation(type)
{
  // Try to load a message by navigation type if we can find
  // the message in the same folder.
  if (LoadMessageByNavigationType(type))
    return;

  CrossFolderNavigation(type);
}

function SetupCommandUpdateHandlers()
{
  top.controllers.insertControllerAt(0, MessageWindowController);
}

function UnloadCommandUpdateHandlers()
{
  top.controllers.removeController(MessageWindowController);
}

function GetDBView()
{
  return gDBView;
}

function LoadMessageByMsgKey(messageKey)
{
  LoadMessageByViewIndex(gDBView.findIndexFromKey(messageKey, true));
}

function LoadMessageByViewIndex(viewIndex)
{
  gDBView.loadMessageByViewIndex(viewIndex);
  // we only want to update the toolbar if there was no previous selected message.
  if (nsMsgKey_None == gDBView.keyForFirstSelectedMessage)
    UpdateMailToolbar("update toolbar for message Window");
}

function LoadNavigatedToMessage(msgHdr, folder, folderUri)
{
  if (IsCurrentLoadedFolder(folder))
  {
    LoadMessageByMsgKey(msgHdr.messageKey);
  }
  else
  {
    gMessageToLoad = msgHdr.messageKey;
    SelectFolder(folderUri);
  }
}

function getMailToolbox ()
{
  return document.getElementById("mail-toolbox");
}

function RestoreFocusAfterHdrButton()
{
  // set focus to the message pane
  window.content.focus();
}
