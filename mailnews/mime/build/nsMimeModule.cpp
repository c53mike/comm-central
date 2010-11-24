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

#include "mozilla/ModuleUtils.h"
#include "nsMsgMimeCID.h"
#include "nsCOMPtr.h"

// include files for components this factory creates...
#include "nsStreamConverter.h"
#include "nsMimeObjectClassAccess.h"
#include "nsMimeConverter.h"
#include "nsMsgHeaderParser.h"
#include "nsMimeHeaders.h"

// private factory declarations for each component we know how to produce

NS_GENERIC_FACTORY_CONSTRUCTOR(nsMimeObjectClassAccess)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsMimeConverter)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsStreamConverter)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsMsgHeaderParser)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsMimeHeaders)

NS_DEFINE_NAMED_CID(NS_MIME_OBJECT_CLASS_ACCESS_CID);
NS_DEFINE_NAMED_CID(NS_MIME_CONVERTER_CID);
NS_DEFINE_NAMED_CID(NS_MSGHEADERPARSER_CID);
NS_DEFINE_NAMED_CID(NS_MAILNEWS_MIME_STREAM_CONVERTER_CID);
NS_DEFINE_NAMED_CID(NS_IMIMEHEADERS_CID);

const mozilla::Module::CIDEntry kMimeCIDs[] = {
  { &kNS_MIME_OBJECT_CLASS_ACCESS_CID, false, NULL, nsMimeObjectClassAccessConstructor },
  { &kNS_MIME_CONVERTER_CID, false, NULL, nsMimeConverterConstructor },
  { &kNS_MSGHEADERPARSER_CID, false, NULL, nsMsgHeaderParserConstructor },
  { &kNS_MAILNEWS_MIME_STREAM_CONVERTER_CID, false, NULL, nsStreamConverterConstructor },
  { &kNS_IMIMEHEADERS_CID, false, NULL, nsMimeHeadersConstructor },
  { NULL }
};

const mozilla::Module::ContractIDEntry kMimeContracts[] = {
  { NS_MIME_OBJECT_CONTRACTID, &kNS_MIME_OBJECT_CLASS_ACCESS_CID },
  { NS_MIME_CONVERTER_CONTRACTID, &kNS_MIME_CONVERTER_CID },
  { NS_MAILNEWS_MIME_HEADER_PARSER_CONTRACTID, &kNS_MSGHEADERPARSER_CID },
  { NS_MAILNEWS_MIME_STREAM_CONVERTER_CONTRACTID, &kNS_MAILNEWS_MIME_STREAM_CONVERTER_CID },
  { NS_MAILNEWS_MIME_STREAM_CONVERTER_CONTRACTID1, &kNS_MAILNEWS_MIME_STREAM_CONVERTER_CID },
  { NS_MAILNEWS_MIME_STREAM_CONVERTER_CONTRACTID2, &kNS_MAILNEWS_MIME_STREAM_CONVERTER_CID },
  { NS_IMIMEHEADERS_CONTRACTID, &kNS_IMIMEHEADERS_CID },
  { NULL }
};

static const mozilla::Module kMimeModule = {
    mozilla::Module::kVersion,
    kMimeCIDs,
    kMimeContracts
};

NSMODULE_DEFN(mime) = &kMimeModule;
