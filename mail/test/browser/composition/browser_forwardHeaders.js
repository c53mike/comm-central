/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests that headers like References and X-Forwarded-Message-Id are
 * set properly when forwarding messages.
 */

"use strict";

var {
  assert_previous_text,
  get_compose_body,
  open_compose_with_forward,
  open_compose_with_forward_as_attachments,
} = ChromeUtils.import("resource://testing-common/mozmill/ComposeHelpers.jsm");
var {
  add_sets_to_folders,
  be_in_folder,
  create_folder,
  create_thread,
  get_special_folder,
  mc,
  press_delete,
  select_click_row,
  select_shift_click_row,
} = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);
var { to_mime_message } = ChromeUtils.import(
  "resource://testing-common/mozmill/MessageHelpers.jsm"
);
var {
  plan_for_modal_dialog,
  plan_for_window_close,
  wait_for_modal_dialog,
  wait_for_window_close,
} = ChromeUtils.import("resource://testing-common/mozmill/WindowHelpers.jsm");

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cwc = null; // compose window controller
var folder;
var gDrafts;

add_task(function setupModule(module) {
  folder = create_folder("Test");
  let thread1 = create_thread(10);
  add_sets_to_folders([folder], [thread1]);

  gDrafts = get_special_folder(Ci.nsMsgFolderFlags.Drafts, true);

  // Don't create paragraphs in the test.
  // The test checks for the first DOM node and expects a text and not
  // a paragraph.
  Services.prefs.setBoolPref("mail.compose.default_to_paragraph", false);
});

registerCleanupFunction(function teardownModule(module) {
  Services.prefs.clearUserPref("mail.compose.default_to_paragraph");
});

function forward_selected_messages_and_go_to_drafts_folder(f) {
  const kText = "Hey check out this megalol link";
  // opening a new compose window
  cwc = f(mc);
  cwc.type(cwc.eid("content-frame"), kText);

  let mailBody = get_compose_body(cwc);
  assert_previous_text(mailBody.firstChild, [kText]);

  plan_for_window_close(cwc);
  // mwc is modal window controller
  plan_for_modal_dialog("commonDialog", function click_save(mwc) {
    // accept saving
    mwc.window.document.documentElement.getButton("accept").doCommand();
  });

  // quit -> do you want to save ?
  cwc.window.goDoCommand("cmd_close");
  // wait for the modal dialog to return
  wait_for_modal_dialog();
  // Actually quit the window.
  wait_for_window_close();

  // Visit the existing Drafts folder.
  be_in_folder(gDrafts);
}

add_task(function test_forward_inline() {
  be_in_folder(folder);
  // original message header
  let oMsgHdr = select_click_row(0);

  forward_selected_messages_and_go_to_drafts_folder(open_compose_with_forward);

  // forwarded message header
  let fMsgHdr = select_click_row(0);

  Assert.ok(
    fMsgHdr.numReferences > 0,
    "No References Header in forwarded msg."
  );
  Assert.equal(
    fMsgHdr.getStringReference(0),
    oMsgHdr.messageId,
    "The forwarded message should have References: = Message-Id: of the original msg"
  );

  // test for x-forwarded-message id and exercise the js mime representation as
  // well
  to_mime_message(fMsgHdr, null, function(aMsgHdr, aMimeMsg) {
    Assert.equal(
      aMimeMsg.headers["x-forwarded-message-id"],
      "<" + oMsgHdr.messageId + ">"
    );
    Assert.equal(aMimeMsg.headers.references, "<" + oMsgHdr.messageId + ">");
  });
  press_delete(mc);
});

add_task(function test_forward_as_attachments() {
  be_in_folder(folder);
  // original message header
  let oMsgHdr0 = select_click_row(0);
  let oMsgHdr1 = select_click_row(1);
  select_shift_click_row(0);

  forward_selected_messages_and_go_to_drafts_folder(
    open_compose_with_forward_as_attachments
  );

  // forwarded message header
  let fMsgHdr = select_click_row(0);

  Assert.ok(
    fMsgHdr.numReferences > 0,
    "No References Header in forwarded msg."
  );
  Assert.ok(
    fMsgHdr.numReferences > 1,
    "Only one References Header in forwarded msg."
  );
  Assert.equal(
    fMsgHdr.getStringReference(1),
    oMsgHdr1.messageId,
    "The forwarded message should have References: = Message-Id: of the original msg#1"
  );
  Assert.equal(
    fMsgHdr.getStringReference(0),
    oMsgHdr0.messageId,
    "The forwarded message should have References: = Message-Id: of the original msg#0"
  );

  // test for x-forwarded-message id and exercise the js mime representation as
  // well
  to_mime_message(fMsgHdr, null, function(aMsgHdr, aMimeMsg) {
    Assert.equal(
      aMimeMsg.headers["x-forwarded-message-id"],
      "<" + oMsgHdr0.messageId + "> <" + oMsgHdr1.messageId + ">"
    );
    Assert.equal(
      aMimeMsg.headers.references,
      "<" + oMsgHdr0.messageId + "> <" + oMsgHdr1.messageId + ">"
    );
  });

  press_delete(mc);
});
