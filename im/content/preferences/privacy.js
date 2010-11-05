/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Instantbird messenging client, released
 * 2010.
 *
 * The Initial Developer of the Original Code is
 * Benedikt P. <leeraccount@yahoo.de>.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var gPrivacyPane = {
  init: function ()
  {
    this.updateDisabledState();
  },

  updateDisabledState: function ()
  {
    let broadcaster = document.getElementById("idleReportingEnabled");
    if (document.getElementById("messenger.status.reportIdle").value) {
      broadcaster.removeAttribute("disabled");
      this.updateMessageDisabledState();
    }
    else
      broadcaster.setAttribute("disabled", "true");
  },

  updateMessageDisabledState: function ()
  {
    let textbox = document.getElementById("defaultIdleAwayMessage");
    if (document.getElementById("messenger.status.awayWhenIdle").value)
      textbox.removeAttribute("disabled");
    else
      textbox.setAttribute("disabled", "true");
  },

  openLogFolder: function ()
  {
    let Cc = Components.classes;
    let Ci = Components.interfaces;
    
    // Log folder is "'profile directory'/logs"
    var logFolder = Services.dirsvc.get("ProfD", Ci.nsILocalFile);
    logFolder.append("logs");

    try {
      logFolder.reveal();
    } catch (e) {
      // Adapted the workaround of Firefox' Download Manager for some *ix systems
      let parent = logFolder.parent.QueryInterface(Ci.nsILocalFile);
      if (!parent)
       return;

      try {
       // "Double click" the parent directory to show where the file should be
       parent.launch();
      } catch (e) {
       // If launch also fails (probably because it's not implemented), let the
       // OS handler try to open the parent
       let uri = Services.io.newFileURI(parent);
       let protocolSvc = Cc["@mozilla.org/uriloader/external-protocol-service;1"].
                         getService(Ci.nsIExternalProtocolService);
       protocolSvc.loadUrl(uri);
      }
    }
  }
};
