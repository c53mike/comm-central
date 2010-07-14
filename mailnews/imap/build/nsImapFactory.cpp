/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Pierre Phaneuf <pp@ludusdesign.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
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

#include "msgCore.h" // for pre-compiled headers...
#include "nsCOMPtr.h"
#include "mozilla/ModuleUtils.h"

#include "nsIMAPHostSessionList.h"
#include "nsImapIncomingServer.h"
#include "nsImapService.h"
#include "nsImapMailFolder.h"
#include "nsImapUrl.h"
#include "nsImapProtocol.h"
#include "nsMsgImapCID.h"
#include "nsCURILoader.h"
#include "nsAutoSyncManager.h"

// private factory declarations for each component we know how to produce
NS_GENERIC_FACTORY_CONSTRUCTOR(nsImapUrl)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsImapProtocol)
NS_GENERIC_FACTORY_CONSTRUCTOR_INIT(nsIMAPHostSessionList, Init)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsImapIncomingServer)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsImapService)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsImapMailFolder)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsImapMockChannel)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsAutoSyncManager)

NS_DEFINE_NAMED_CID(NS_IMAPURL_CID);
NS_DEFINE_NAMED_CID(NS_IMAPPROTOCOL_CID);
NS_DEFINE_NAMED_CID(NS_IMAPMOCKCHANNEL_CID);
NS_DEFINE_NAMED_CID(NS_IIMAPHOSTSESSIONLIST_CID);
NS_DEFINE_NAMED_CID(NS_IMAPINCOMINGSERVER_CID);
NS_DEFINE_NAMED_CID(NS_IMAPRESOURCE_CID);
NS_DEFINE_NAMED_CID(NS_IMAPSERVICE_CID);
NS_DEFINE_NAMED_CID(NS_AUTOSYNCMANAGER_CID);

const mozilla::Module::CIDEntry kIMAPCIDs[] = {
  { &kNS_IMAPURL_CID, false, NULL, nsImapUrlConstructor },
  { &kNS_IMAPPROTOCOL_CID, false, nsnull, nsImapProtocolConstructor },
  { &kNS_IMAPMOCKCHANNEL_CID, false, nsnull, nsImapMockChannelConstructor },
  { &kNS_IIMAPHOSTSESSIONLIST_CID, false, nsnull, nsIMAPHostSessionListConstructor },
  { &kNS_IMAPINCOMINGSERVER_CID, false, nsnull, nsImapIncomingServerConstructor },
  { &kNS_IMAPRESOURCE_CID, false, nsnull, nsImapMailFolderConstructor },
  { &kNS_IMAPSERVICE_CID, false, nsnull, nsImapServiceConstructor },
  { &kNS_AUTOSYNCMANAGER_CID, false, nsnull, nsAutoSyncManagerConstructor },
  { NULL }
};

const mozilla::Module::ContractIDEntry kIMAPContracts[] = {
  { NS_IMAPINCOMINGSERVER_CONTRACTID, &kNS_IMAPINCOMINGSERVER_CID },
  { NS_RDF_RESOURCE_FACTORY_CONTRACTID_PREFIX "imap", &kNS_IMAPRESOURCE_CID },
  { "@mozilla.org/messenger/messageservice;1?type=imap-message", &kNS_IMAPSERVICE_CID },
  { "@mozilla.org/messenger/messageservice;1?type=imap", &kNS_IMAPSERVICE_CID },
  { NS_IMAPSERVICE_CONTRACTID, &kNS_IMAPSERVICE_CID },
  { NS_NETWORK_PROTOCOL_CONTRACTID_PREFIX "imap", &kNS_IMAPSERVICE_CID },
  { NS_IMAPPROTOCOLINFO_CONTRACTID, &kNS_IMAPSERVICE_CID },
  { NS_CONTENT_HANDLER_CONTRACTID_PREFIX "x-application-imapfolder", &kNS_IMAPSERVICE_CID },
  { NS_AUTOSYNCMANAGER_CONTRACTID, &kNS_AUTOSYNCMANAGER_CID },
  { NULL }
};

/////////////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////////////////////////////////////////////

static const mozilla::Module kIMAPModule = {
    mozilla::Module::kVersion,
    kIMAPCIDs,
    kIMAPContracts
};

NSMODULE_DEFN(imap) = &kIMAPModule;
