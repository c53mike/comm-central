/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailTrust"];

var l10n = new Localization(["messenger/openpgp/enigmail.ftl"], true);

// trust flags according to GPG documentation:
// - https://www.gnupg.org/documentation/manuals/gnupg.pdf
// - sources: doc/DETAILS
// In the order of trustworthy:
//  ---------------------------------------------------------
//  i = The key is invalid (e.g. due to a missing self-signature)
//  n = The key is not valid / Never trust this key
//  d/D = The key has been disabled
//  r = The key has been revoked
//  e = The key has expired
//  g = group (???)
//  ---------------------------------------------------------
//  ? = INTERNAL VALUE to separate invalid from unknown keys
//      see validKeysForAllRecipients() in enigmailMsgComposeHelper.js
//  ---------------------------------------------------------
//  o = Unknown (this key is new to the system)
//  - = Unknown validity (i.e. no value assigned)
//  q = Undefined validity (Not enough information for calculation)
//      '-' and 'q' may safely be treated as the same value for most purposes
//  ---------------------------------------------------------
//  m = Marginally trusted
//  ---------------------------------------------------------
//  f = Fully trusted / valid key
//  u = Ultimately trusted
//  ---------------------------------------------------------
const TRUSTLEVELS_SORTED = "indDreg?o-qmfu";
const TRUSTLEVELS_SORTED_IDX_UNKNOWN = 7; // index of '?'

var EnigmailTrust = {
  /**
   * @return - |string| containing the order of trust/validity values
   */
  trustLevelsSorted() {
    return TRUSTLEVELS_SORTED;
  },

  /**
   * @return - |boolean| whether the flag is invalid (neither unknown nor valid)
   */
  isInvalid(flag) {
    return TRUSTLEVELS_SORTED.indexOf(flag) < TRUSTLEVELS_SORTED_IDX_UNKNOWN;
  },

  /**
   * return a merged value of trust level "key disabled"
   *
   * @keyObj - |object| containing the key data
   *
   * @return - |string| containing the trust value or "D" for disabled keys
   */
  getTrustCode(keyObj) {
    if (keyObj.keyUseFor.includes("D")) {
      return "D";
    }

    return keyObj.keyTrust;
  },

  getTrustLabel(trustCode) {
    let keyTrust;
    switch (trustCode) {
      case "q":
        return l10n.formatValueSync("key-valid-unknown");
      case "i":
        return l10n.formatValueSync("key-valid-invalid");
      case "d":
      case "D":
        return l10n.formatValueSync("key-valid-disabled");
      case "r":
        return l10n.formatValueSync("key-valid-revoked");
      case "e":
        return l10n.formatValueSync("key-valid-expired");
      case "n":
        return l10n.formatValueSync("key-trust-untrusted");
      case "m":
        return l10n.formatValueSync("key-trust-marginal");
      case "f":
        return l10n.formatValueSync("key-trust-full");
      case "u":
        return l10n.formatValueSync("key-trust-ultimate");
      case "g":
        return l10n.formatValueSync("key-trust-group");
      case "-":
        keyTrust = "-";
        break;
      default:
        keyTrust = "";
    }
    return keyTrust;
  },
};
