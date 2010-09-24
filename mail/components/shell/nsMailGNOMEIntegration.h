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
 * The Original Code is the Mozilla GNOME integration code.
 *
 * The Initial Developer of the Original Code is
 * IBM Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Brian Ryner <bryner@brianryner.com>
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

#ifndef nsMailGNOMEIntegration_h_
#define nsMailGNOMEIntegration_h_

#include "nsIShellService.h"
#include "nsStringGlue.h"

#define NS_MAILGNOMEINTEGRATION_CID \
{0xbddef0f4, 0x5e2d, 0x4846, {0xbd, 0xec, 0x86, 0xd0, 0x78, 0x1d, 0x8d, 0xed}}

class nsMailGNOMEIntegration : public nsIShellService
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSISHELLSERVICE

  NS_HIDDEN_(nsresult) Init();
  nsMailGNOMEIntegration();

protected:
  virtual ~nsMailGNOMEIntegration() {};

  PRBool KeyMatchesAppName(const char *aKeyValue) const;
  PRBool checkDefault(const char* const *aProtocols, unsigned int aLength);
  nsresult MakeDefault(const char* const *aProtocols, unsigned int aLength);
private:
  PRBool GetAppPathFromLauncher();
  PRPackedBool mUseLocaleFilenames;
  PRPackedBool mCheckedThisSession;
  nsCString mAppPath;
  PRPackedBool mAppIsInPath;
};

#endif
