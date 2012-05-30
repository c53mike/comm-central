/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function OpenCertManager()
{
    document.documentElement
            .openWindow("mozilla:certmanager", 
                        "chrome://pippki/content/certManager.xul",
                        "", null);
}

function OpenDeviceManager()
{
    document.documentElement
            .openWindow("mozilla:devicemanager", 
                        "chrome://pippki/content/device_manager.xul",
                        "", null);
}
