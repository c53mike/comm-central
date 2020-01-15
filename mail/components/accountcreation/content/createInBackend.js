/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from emailWizard.js */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

/* eslint-disable complexity */
/**
 * Takes an |AccountConfig| JS object and creates that account in the
 * Thunderbird backend (which also writes it to prefs).
 *
 * @param {AccountConfig} config - The account to create
 * @return {nsIMsgAccount} - the newly created account
 */
function createAccountInBackend(config) {
  let uuidGen = Cc["@mozilla.org/uuid-generator;1"].getService(
    Ci.nsIUUIDGenerator
  );
  // incoming server
  let inServer = MailServices.accounts.createIncomingServer(
    config.incoming.username,
    config.incoming.hostname,
    config.incoming.type
  );
  inServer.port = config.incoming.port;
  inServer.authMethod = config.incoming.auth;
  inServer.password = config.incoming.password;
  // This new CLIENTID is for the outgoing server, and will be applied to the
  // incoming only if the incoming username and hostname match the outgoing.
  // We must generate this unconditionally because we cannot determine whether
  // the outgoing server has clientid enabled yet or not, and we need to do it
  // here in order to populate the incoming server if the outgoing matches.
  let newOutgoingClientid = uuidGen
    .generateUUID()
    .toString()
    .replace(/[{}]/g, "");
  // Grab the base domain of both incoming and outgoing hostname in order to
  // compare the two to detect if the base domain is the same.
  let incomingBaseDomain;
  let outgoingBaseDomain;
  try {
    incomingBaseDomain = Services.eTLD.getBaseDomainFromHost(
      config.incoming.hostname
    );
  } catch (e) {
    incomingBaseDomain = config.incoming.hostname;
  }
  try {
    outgoingBaseDomain = Services.eTLD.getBaseDomainFromHost(
      config.outgoing.hostname
    );
  } catch (e) {
    outgoingBaseDomain = config.outgoing.hostname;
  }
  if (
    config.incoming.username == config.outgoing.username &&
    incomingBaseDomain == outgoingBaseDomain
  ) {
    inServer.clientid = newOutgoingClientid;
  } else {
    // If the username/hostname are different then generate a new CLIENTID.
    inServer.clientid = uuidGen
      .generateUUID()
      .toString()
      .replace(/[{}]/g, "");
  }

  if (config.rememberPassword && config.incoming.password.length) {
    rememberPassword(inServer, config.incoming.password);
  }

  if (inServer.authMethod == Ci.nsMsgAuthMethod.OAuth2) {
    inServer.setCharValue("oauth2.scope", config.oauthSettings.scope);
    inServer.setCharValue("oauth2.issuer", config.oauthSettings.issuer);
  }

  // SSL
  if (config.incoming.socketType == 1) {
    // plain
    inServer.socketType = Ci.nsMsgSocketType.plain;
  } else if (config.incoming.socketType == 2) {
    // SSL / TLS
    inServer.socketType = Ci.nsMsgSocketType.SSL;
  } else if (config.incoming.socketType == 3) {
    // STARTTLS
    inServer.socketType = Ci.nsMsgSocketType.alwaysSTARTTLS;
  }
  // inServer.prettyName = config.displayName;
  inServer.prettyName = config.identity.emailAddress;

  inServer.doBiff = true;
  inServer.biffMinutes = config.incoming.checkInterval;
  inServer.setBoolValue("login_at_startup", config.incoming.loginAtStartup);
  if (config.incoming.type == "pop3") {
    inServer.setBoolValue(
      "leave_on_server",
      config.incoming.leaveMessagesOnServer
    );
    inServer.setIntValue(
      "num_days_to_leave_on_server",
      config.incoming.daysToLeaveMessagesOnServer
    );
    inServer.setBoolValue(
      "delete_mail_left_on_server",
      config.incoming.deleteOnServerWhenLocalDelete
    );
    inServer.setBoolValue(
      "delete_by_age_from_server",
      config.incoming.deleteByAgeFromServer
    );
    inServer.setBoolValue("download_on_biff", config.incoming.downloadOnBiff);
  }
  if (config.incoming.owaURL) {
    inServer.setUnicharValue("owa_url", config.incoming.owaURL);
  }
  if (config.incoming.ewsURL) {
    inServer.setUnicharValue("ews_url", config.incoming.ewsURL);
  }
  if (config.incoming.easURL) {
    inServer.setUnicharValue("eas_url", config.incoming.easURL);
  }
  inServer.valid = true;

  let username = config.outgoing.auth > 1 ? config.outgoing.username : null;
  let outServer = MailServices.smtp.findServer(
    username,
    config.outgoing.hostname
  );
  assert(
    config.outgoing.addThisServer ||
      config.outgoing.useGlobalPreferredServer ||
      config.outgoing.existingServerKey,
    "No SMTP server: inconsistent flags"
  );

  if (
    config.outgoing.addThisServer &&
    !outServer &&
    !config.incoming.useGlobalPreferredServer
  ) {
    outServer = MailServices.smtp.createServer();
    outServer.hostname = config.outgoing.hostname;
    outServer.port = config.outgoing.port;
    outServer.authMethod = config.outgoing.auth;
    // Populate the clientid if it is enabled for this outgoing server.
    if (outServer.clientidEnabled) {
      outServer.clientid = newOutgoingClientid;
    }
    if (config.outgoing.auth > 1) {
      outServer.username = username;
      outServer.password = config.incoming.password;
      if (config.rememberPassword && config.incoming.password.length) {
        rememberPassword(outServer, config.incoming.password);
      }
    }

    if (outServer.authMethod == Ci.nsMsgAuthMethod.OAuth2) {
      let prefBranch = "mail.smtpserver." + outServer.key + ".";
      Services.prefs.setCharPref(
        prefBranch + "oauth2.scope",
        config.oauthSettings.scope
      );
      Services.prefs.setCharPref(
        prefBranch + "oauth2.issuer",
        config.oauthSettings.issuer
      );
    }

    if (config.outgoing.socketType == 1) {
      // no SSL
      outServer.socketType = Ci.nsMsgSocketType.plain;
    } else if (config.outgoing.socketType == 2) {
      // SSL / TLS
      outServer.socketType = Ci.nsMsgSocketType.SSL;
    } else if (config.outgoing.socketType == 3) {
      // STARTTLS
      outServer.socketType = Ci.nsMsgSocketType.alwaysSTARTTLS;
    }

    // API problem: <http://mxr.mozilla.org/seamonkey/source/mailnews/compose/public/nsISmtpServer.idl#93>
    outServer.description = config.displayName;
    if (config.password) {
      outServer.password = config.outgoing.password;
    }

    // If this is the first SMTP server, set it as default
    if (
      !MailServices.smtp.defaultServer ||
      !MailServices.smtp.defaultServer.hostname
    ) {
      MailServices.smtp.defaultServer = outServer;
    }
  }

  // identity
  // TODO accounts without identity?
  let identity = MailServices.accounts.createIdentity();
  identity.fullName = config.identity.realname;
  identity.email = config.identity.emailAddress;

  // for new accounts, default to replies being positioned above the quote
  // if a default account is defined already, take its settings instead
  if (config.incoming.type == "imap" || config.incoming.type == "pop3") {
    identity.replyOnTop = 1;
    // identity.sigBottom = false; // don't set this until Bug 218346 is fixed

    if (
      MailServices.accounts.accounts.length &&
      MailServices.accounts.defaultAccount
    ) {
      let defAccount = MailServices.accounts.defaultAccount;
      let defIdentity = defAccount.defaultIdentity;
      if (
        defAccount.incomingServer.canBeDefaultServer &&
        defIdentity &&
        defIdentity.valid
      ) {
        identity.replyOnTop = defIdentity.replyOnTop;
        identity.sigBottom = defIdentity.sigBottom;
      }
    }
  }

  // due to accepted conventions, news accounts should default to plain text
  if (config.incoming.type == "nntp") {
    identity.composeHtml = false;
  }

  identity.valid = true;

  if (
    !config.outgoing.useGlobalPreferredServer &&
    !config.incoming.useGlobalPreferredServer
  ) {
    if (config.outgoing.existingServerKey) {
      identity.smtpServerKey = config.outgoing.existingServerKey;
    } else {
      identity.smtpServerKey = outServer.key;
    }
  }

  // account and hook up
  // Note: Setting incomingServer will cause the AccountManager to refresh
  // itself, which could be a problem if we came from it and we haven't set
  // the identity (see bug 521955), so make sure everything else on the
  // account is set up before you set the incomingServer.
  let account = MailServices.accounts.createAccount();
  account.addIdentity(identity);
  account.incomingServer = inServer;
  if (
    inServer.canBeDefaultServer &&
    (!MailServices.accounts.defaultAccount ||
      !MailServices.accounts.defaultAccount.incomingServer.canBeDefaultServer)
  ) {
    MailServices.accounts.defaultAccount = account;
  }

  verifyLocalFoldersAccount(MailServices.accounts);
  setFolders(identity, inServer);

  // save
  MailServices.accounts.saveAccountInfo();
  try {
    Services.prefs.savePrefFile(null);
  } catch (ex) {
    ddump("Could not write out prefs: " + ex);
  }
  return account;
}
/* eslint-enable complexity */

function setFolders(identity, server) {
  // TODO: support for local folders for global inbox (or use smart search
  // folder instead)

  var baseURI = server.serverURI + "/";

  // Names will be localized in UI, not in folder names on server/disk
  // TODO allow to override these names in the XML config file,
  // in case e.g. Google or AOL use different names?
  // Workaround: Let user fix it :)
  var fccName = "Sent";
  var draftName = "Drafts";
  var templatesName = "Templates";

  identity.draftFolder = baseURI + draftName;
  identity.stationeryFolder = baseURI + templatesName;
  identity.fccFolder = baseURI + fccName;

  identity.fccFolderPickerMode = 0;
  identity.draftsFolderPickerMode = 0;
  identity.tmplFolderPickerMode = 0;
}

function rememberPassword(server, password) {
  let passwordURI;
  if (server instanceof Ci.nsIMsgIncomingServer) {
    passwordURI = server.localStoreType + "://" + server.hostName;
  } else if (server instanceof Ci.nsISmtpServer) {
    passwordURI = "smtp://" + server.hostname;
  } else {
    throw new NotReached("Server type not supported");
  }

  let login = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(
    Ci.nsILoginInfo
  );
  login.init(passwordURI, null, passwordURI, server.username, password, "", "");
  try {
    Services.logins.addLogin(login);
  } catch (e) {
    if (e.message.includes("This login already exists")) {
      // TODO modify
    } else {
      throw e;
    }
  }
}

/**
 * Check whether the user's setup already has an incoming server
 * which matches (hostname, port, username) the primary one
 * in the config.
 * (We also check the email address as username.)
 *
 * @param config {AccountConfig} filled in (no placeholders)
 * @return {nsIMsgIncomingServer} If it already exists, the server
 *     object is returned.
 *     If it's a new server, |null| is returned.
 */
function checkIncomingServerAlreadyExists(config) {
  assert(config instanceof AccountConfig);
  let incoming = config.incoming;
  let existing = MailServices.accounts.findRealServer(
    incoming.username,
    incoming.hostname,
    incoming.type,
    incoming.port
  );

  // if username does not have an '@', also check the e-mail
  // address form of the name.
  if (!existing && !incoming.username.includes("@")) {
    existing = MailServices.accounts.findRealServer(
      config.identity.emailAddress,
      incoming.hostname,
      incoming.type,
      incoming.port
    );
  }
  return existing;
}

/**
 * Check whether the user's setup already has an outgoing server
 * which matches (hostname, port, username) the primary one
 * in the config.
 *
 * @param config {AccountConfig} filled in (no placeholders)
 * @return {nsISmtpServer} If it already exists, the server
 *     object is returned.
 *     If it's a new server, |null| is returned.
 */
function checkOutgoingServerAlreadyExists(config) {
  assert(config instanceof AccountConfig);
  for (let existingServer of MailServices.smtp.servers) {
    // TODO check username with full email address, too, like for incoming
    if (
      existingServer.hostname == config.outgoing.hostname &&
      existingServer.port == config.outgoing.port &&
      existingServer.username == config.outgoing.username
    ) {
      return existingServer;
    }
  }
  return null;
}

/**
 * Check if there already is a "Local Folders". If not, create it.
 * Copied from AccountWizard.js with minor updates.
 */
function verifyLocalFoldersAccount(am) {
  let localMailServer;
  try {
    localMailServer = am.localFoldersServer;
  } catch (ex) {
    localMailServer = null;
  }

  try {
    if (!localMailServer) {
      // creates a copy of the identity you pass in
      am.createLocalMailAccount();
      try {
        localMailServer = am.localFoldersServer;
      } catch (ex) {
        ddump(
          "Error! we should have found the local mail server " +
            "after we created it."
        );
      }
    }
  } catch (ex) {
    ddump("Error in verifyLocalFoldersAccount " + ex);
  }
}
