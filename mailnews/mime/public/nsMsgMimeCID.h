/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsMessageMimeCID_h__
#define nsMessageMimeCID_h__

#define NS_MAILNEWS_MIME_STREAM_CONVERTER_CONTRACTID \
  NS_ISTREAMCONVERTER_KEY                            \
  "?from=message/rfc822&to=application/xhtml+xml"

#define NS_MAILNEWS_MIME_STREAM_CONVERTER_CONTRACTID1 \
  NS_ISTREAMCONVERTER_KEY "?from=message/rfc822&to=text/html"

#define NS_MAILNEWS_MIME_STREAM_CONVERTER_CONTRACTID2 \
  NS_ISTREAMCONVERTER_KEY "?from=message/rfc822&to=*/*"

#define NS_MAILNEWS_MIME_STREAM_CONVERTER_CID     \
  { /* FAF4F9A6-60AD-11d3-989A-001083010E9B */    \
    0xfaf4f9a6, 0x60ad, 0x11d3, {                 \
      0x98, 0x9a, 0x0, 0x10, 0x83, 0x1, 0xe, 0x9b \
    }                                             \
  }

#define NS_MIME_CONVERTER_CONTRACTID "@mozilla.org/messenger/mimeconverter;1"

// {403B0540-B7C3-11d2-B35E-525400E2D63A}
#define NS_MIME_OBJECT_CLASS_ACCESS_CID             \
  {                                                 \
    0x403b0540, 0xb7c3, 0x11d2, {                   \
      0xb3, 0x5e, 0x52, 0x54, 0x0, 0xe2, 0xd6, 0x3a \
    }                                               \
  }

#define NS_MIME_OBJECT_CONTRACTID "@mozilla.org/messenger/mimeobject;1"

#endif  // nsMessageMimeCID_h__
