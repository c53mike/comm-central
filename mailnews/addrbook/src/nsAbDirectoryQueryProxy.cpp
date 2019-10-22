/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsAbDirectoryQuery.h"
#include "nsAbDirectoryQueryProxy.h"

NS_IMPL_ISUPPORTS(nsAbDirectoryQueryProxy, nsIAbDirectoryQueryProxy,
                  nsIAbDirectoryQuery)

nsAbDirectoryQueryProxy::nsAbDirectoryQueryProxy() : mInitiated(false) {}

nsAbDirectoryQueryProxy::~nsAbDirectoryQueryProxy() {}

/* void initiate (in nsIAbDirectory directory); */
NS_IMETHODIMP nsAbDirectoryQueryProxy::Initiate() {
  if (mInitiated) return NS_OK;

  mDirectoryQuery = new nsAbDirectoryQuery();

  mInitiated = true;

  return NS_OK;
}
