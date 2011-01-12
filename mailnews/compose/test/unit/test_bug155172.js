/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/**
 * Authentication tests for SMTP.
 */

load("../../../resources/alertTestUtils.js");
load("../../../resources/passwordStorage.js");

Components.utils.import("resource:///modules/mailServices.js");

var gNewPassword = null;

function confirmEx(aDialogTitle, aText, aButtonFlags, aButton0Title,
                   aButton1Title, aButton2Title, aCheckMsg, aCheckState) {
  // Just return 2 which will is pressing button 2 - enter a new password.
  return 2;
}

function promptPasswordPS(aParent, aDialogTitle, aText, aPassword,
                          aCheckMsg, aCheckState) {
  aPassword.value = gNewPassword;
  return true;
}

var server;

var kSender = "from@foo.invalid";
var kTo = "to@foo.invalid";
var kUsername = "test.smtp@fakeserver";
// kPassword 2 is the one defined in signons-smtp.json, the other one
// is intentionally wrong.
var kPassword1 = "wrong";
var kPassword2 = "smtptest";

add_task(function *() {
  registerAlertTestUtils();

  function createHandler(d) {
    var handler = new SMTP_RFC2821_handler(d);
    // Username needs to match the login information stored in the signons json
    // file.
    handler.kUsername = kUsername;
    handler.kPassword = kPassword1;
    handler.kAuthRequired = true;
    handler.kAuthSchemes = [ "PLAIN", "LOGIN" ]; // make match expected transaction below
    return handler;
  }

  server = setupServerDaemon(createHandler);
  server.setDebugLevel(fsDebugAll);

  // Prepare files for passwords (generated by a script in bug 1018624).
  yield setupForPassword("signons-smtp.json");

  // Test file
  var testFile = do_get_file("data/message1.eml");

  // Ensure we have at least one mail account
  localAccountUtils.loadLocalMailAccount();

  // Handle the server in a try/catch/finally loop so that we always will stop
  // the server if something fails.
  try {
    // Start the fake SMTP server
    server.start();
    var smtpServer = getBasicSmtpServer(server.port);
    var identity = getSmtpIdentity(kSender, smtpServer);

    // This time with auth
    test = "Auth sendMailMessage";

    smtpServer.authMethod = Ci.nsMsgAuthMethod.passwordCleartext;
    smtpServer.socketType = Ci.nsMsgSocketType.plain;
    smtpServer.username = kUsername;

    MailServices.smtp.sendMailMessage(testFile, kTo, identity,
                                      null, null, null, null,
                                      false, {}, {});

    // Set the new password for when we get a prompt
    gNewPassword = kPassword1;

    server.performTest();

    var transaction = server.playTransaction();
    do_check_transaction(transaction, ["EHLO test",
                                       "AUTH PLAIN " + AuthPLAIN.encodeLine(kUsername, kPassword2),
                                       "AUTH LOGIN",
                                       "AUTH PLAIN " + AuthPLAIN.encodeLine(kUsername, kPassword1),
                                       "MAIL FROM:<" + kSender + "> BODY=8BITMIME SIZE=155",
                                       "RCPT TO:<" + kTo + ">",
                                       "DATA"]);

  } catch (e) {
    do_throw(e);
  } finally {
    server.stop();
  
    var thread = gThreadManager.currentThread;
    while (thread.hasPendingEvents())
      thread.processNextEvent(true);
  }
});

function run_test() {
  run_next_test();
}
