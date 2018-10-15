/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/**
 * Authentication tests for NNTP (based on RFC4643) - checks for servers whose
 * details have changed (e.g. realhostname is different from hostname).
 *
 * Note: Logins for newsgroup servers for 1.8 were stored with either the
 * default port or the SSL default port. Nothing else!
 */

ChromeUtils.import("resource:///modules/MailServices.jsm");

load("../../../resources/passwordStorage.js");

// The basic daemon to use for testing nntpd.js implementations
var daemon = setupNNTPDaemon();

// Define these up here for checking with the transaction
var test = null;

add_task(async function () {
  let server = makeServer(NNTP_RFC4643_extension, daemon);
  server.start();

  // These preferences set up a local news server that has had its hostname
  // and username changed from the original settings. We can't do this by
  // function calls for this test as they would cause the password to be
  // forgotten when changing the hostname/username and this breaks the test.
  Services.prefs.setCharPref("mail.account.account1.server", "server1");
  Services.prefs.setCharPref("mail.account.account2.server", "server2");
  Services.prefs.setCharPref("mail.account.account2.identities", "id1");
  Services.prefs.setCharPref("mail.accountmanager.accounts",
                             "account1,account2");
  Services.prefs.setCharPref("mail.accountmanager.localfoldersserver",
                             "server1");
  Services.prefs.setCharPref("mail.accountmanager.defaultaccount",
                             "account2");
  Services.prefs.setCharPref("mail.identity.id1.fullName", "testnntp");
  Services.prefs.setCharPref("mail.identity.id1.useremail",
                             "testnntp@localhost");
  Services.prefs.setBoolPref("mail.identity.id1.valid", true);
  Services.prefs.setCharPref("mail.server.server1.hostname",
                             "Local Folders");
  Services.prefs.setCharPref("mail.server.server1.name", "Local Folders");
  Services.prefs.setCharPref("mail.server.server1.type", "none");
  Services.prefs.setCharPref("mail.server.server1.userName", "nobody");
  Services.prefs.setCharPref("mail.server.server2.hostname", "invalid");
  Services.prefs.setCharPref("mail.server.server2.name",
                             "testnntp on localhost");
  Services.prefs.setIntPref("mail.server.server2.port", server.port);
  Services.prefs.setCharPref("mail.server.server2.realhostname",
                             "localhost");
  Services.prefs.setCharPref("mail.server.server2.type", "nntp");

  // Prepare files for passwords (generated by a script in bug 1018624).
  await setupForPassword("signons-mailnews1.8-alt.json");

  try {
    // Note, the uri is for hostname "invalid" which is the original uri. See
    // setupProtocolTest parameters.
    var prefix = "news://invalid:" + server.port + "/";

    // Test - group subscribe listing
    test = "news:*";

    // Get the existing incoming server
    MailServices.accounts.LoadAccounts();

    // Create the incoming server with "original" details.
    var incomingServer = MailServices.accounts.getIncomingServer("server2");

    subscribeServer(incomingServer);

    // Now set up and run the tests
    setupProtocolTest(server.port, prefix+"*", incomingServer);
    server.performTest();
    var transaction = server.playTransaction();
    do_check_transaction(transaction, ["MODE READER", "LIST",
                                       "AUTHINFO user testnews",
                                       "AUTHINFO pass newstest", "LIST"]);
    incomingServer.QueryInterface(Ci.nsISubscribableServer)
                  .subscribeCleanup();

  } catch (e) {
    dump("NNTP Protocol test "+test+" failed for type RFC 977:\n");
    try {
      var trans = server.playTransaction();
     if (trans)
        dump("Commands called: "+trans.them+"\n");
    } catch (exp) {}
    do_throw(e);
  }
  server.stop();

  var thread = gThreadManager.currentThread;
  while (thread.hasPendingEvents())
    thread.processNextEvent(true);
});

function run_test() {
  run_next_test();
}
