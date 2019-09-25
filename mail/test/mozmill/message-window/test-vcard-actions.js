/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests for attached vcards.
 */

"use strict";

var os = ChromeUtils.import("chrome://mozmill/content/stdlib/os.jsm");

var { get_cards_in_all_address_books_for_email } = ChromeUtils.import(
  "resource://testing-common/mozmill/AddressBookHelpers.jsm"
);
var { assert_equals, open_message_from_file } = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var {
  close_window,
  plan_for_modal_dialog,
  wait_for_modal_dialog,
} = ChromeUtils.import("resource://testing-common/mozmill/WindowHelpers.jsm");

/**
 * Bug 1374779
 * Check if clicking attached vcard image opens new card dialog and adds a contact.
 */
function test_check_vcard_icon() {
  let file = os.getFileForPath(
    os.abspath("./test-vcard-icon.eml", os.getFileForPath(__file__))
  );
  let msgc = open_message_from_file(file);

  let newcards = get_cards_in_all_address_books_for_email(
    "meister@example.com"
  );
  assert_equals(newcards.length, 0);

  function subtest_check_card(cardc) {
    // Check new card is properly prefilled.
    let emailField = cardc.e("PrimaryEmail");
    assert_equals(emailField.value, "meister@example.com");
    cardc.window.document.documentElement.acceptDialog();
  }

  // Click icon on the vcard block.
  let vcard = msgc
    .e("messagepane")
    .contentDocument.querySelector(".moz-vcard-badge");
  // Check new card dialog opens.
  plan_for_modal_dialog("mailnews:newcarddialog", subtest_check_card);
  msgc.click(new elementslib.Elem(vcard));
  wait_for_modal_dialog("mailnews:newcarddialog");

  // Check new card was created from the vcard.
  newcards = get_cards_in_all_address_books_for_email("meister@example.com");
  assert_equals(newcards.length, 1);

  close_window(msgc);
}
