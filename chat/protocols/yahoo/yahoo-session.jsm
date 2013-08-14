/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["YahooSession"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource:///modules/ArrayBufferUtils.jsm");
Cu.import("resource:///modules/http.jsm");
Cu.import("resource:///modules/imServices.jsm");
Cu.import("resource:///modules/imXPCOMUtils.jsm");
Cu.import("resource:///modules/socket.jsm");

XPCOMUtils.defineLazyGetter(this, "_", function()
  l10nHelper("chrome://chat/locale/yahoo.properties")
);

const kProtocolVersion = 16;
const kVendorId = 0;

const kPacketDataDelimiter = "\xC0\x80";
const kPacketIdentifier = "YMSG";
const kPacketHeaderSize = 20;

const kPacketType = {
  // Sent by a client when logging off of the Yahoo! network.
  Logoff:         0x02,
  // Sent by a client when a message is sent to a buddy.
  Message:        0x06,
  // Used for inviting others to a conference.
  ConfInvite:     0x18,
  // Used as a notification when you or someone else joins a conference room.
  ConfLogon:      0x19,
  // Used as a notification when you or someone else leaves a conference room.
  ConfLogoff:     0x1b,
  // This is sent by the client when additional users are invited to the
  // conference, but it can be sent as the first invite as well.
  ConfAddInvite:  0x1c,
  // Broadcast to all users in a conference room when someone posts a message.
  ConfMessage:    0x1d,
  // Used for typing notifications.
  Notify:         0x4b,
  // These two are used during initial authentication with the pager server.
  AuthResponse:   0x54,
  Auth:           0x57,
  // Buddy list controls.
  AddBuddy:       0x83,
  RemoveBuddy:    0x84,
  // This is sent when you reject a Yahoo! user's buddy request.
  BuddyReqReject: 0x86,
  // This is sent whenever a buddy changes their status.
  StatusUpdate:   0xc6,
  // This is sent when someone wishes to become your buddy.
  BuddyAuth:      0xd6,
  // Holds the initial status of all buddies when a user first logs in.
  StatusInitial:  0xf0,
  // Contains the buddy list sent from the server.
  List:           0xf1,
  // Sent back to the pager server after each received message. Sending this
  // prevents echoed messages when chatting with the official Yahoo! client.
  MessageAck:     0xfb
};

const kPacketStatuses = {
  ServerAck: 0x1,
  Typing: 0x16
};

// Each Yahoo! error code is mapped to a two-element array. The first element
// contains the last part of the name of its localized string. This is appended
// to "login.error." to obtain the string. The second element is the
// Instantbird error that is given to the error handler.
const kLoginStatusErrors = {
  "1212" : ["badCredentials",
            Ci.prplIAccount.ERROR_AUTHENTICATION_FAILED],
  "1213" : ["accountLockedFailed",
            Ci.prplIAccount.ERROR_AUTHENTICATION_FAILED],
  "1218" : ["accountDeactivated",
            Ci.prplIAccount.ERROR_AUTHENTICATION_FAILED],
  "1235" : ["usernameNotExist",
            Ci.prplIAccount.ERROR_INVALID_USERNAME],
  "1236" : ["accountLockedGeneral",
            Ci.prplIAccount.ERROR_AUTHENTICATION_FAILED]
};

// These are the status codes that buddies can send us.
const kBuddyStatuses = {
  // Available.
  "0"   : Ci.imIStatusInfo.STATUS_AVAILABLE,
  // Be right back.
  "1"   : Ci.imIStatusInfo.STATUS_AWAY,
  // Busy.
  "2"   : Ci.imIStatusInfo.STATUS_UNAVAILABLE,
    // Not at home.
  "3"   : Ci.imIStatusInfo.STATUS_AWAY,
  // Not at desk.
  "4"   : Ci.imIStatusInfo.STATUS_AWAY,
  // Not in office.
  "5"   : Ci.imIStatusInfo.STATUS_AWAY,
  // On phone.
  "6"   : Ci.imIStatusInfo.STATUS_AWAY,
  // On vacation.
  "7"   : Ci.imIStatusInfo.STATUS_AWAY,
  // Out to lunch.
  "8"   : Ci.imIStatusInfo.STATUS_AWAY,
  // Stepped out.
  "9"   : Ci.imIStatusInfo.STATUS_AWAY,
    // Invisible.
  "12"  : Ci.imIStatusInfo.STATUS_INVISIBLE,
  // Custom status.
  "99"  : Ci.imIStatusInfo.STATUS_AWAY,
  // Idle.
  "999" : Ci.imIStatusInfo.STATUS_IDLE
};

/* The purpose of the YahooSession object is to serve as a gateway between the
 * protocol plug-in and the Yahoo! Messenger servers. Anytime an object outside
 * of this file wishes to communicate with the servers, it should do it through
 * one of the methods provided by YahooSession. By centralizing such network
 * access, we can easily catch errors, and ensure that communication is handled
 * correctly. */
function YahooSession(aAccount)
{
  this._account = aAccount;
  this.binaryMode = true;
}
YahooSession.prototype = {
  __proto__: Socket,
  _account: null,
  _socket: null,
  _username: null,
  // This is the IPv4 address to the pager server which is the gateway into the
  // Yahoo! Messenger network.
  pagerAddress: null,
  // The session ID is obtained during the login process and is maintained
  // throughout the session. This helps the pager server identify the client.
  sessionId: null,

  // Public methods.
  login: function() {
    this._account.reportConnecting();
    new YahooLoginHelper(this).login(this._account);
  },

  addBuddyToServer: function(aBuddy) {
    let packet = new YahooPacket(kPacketType.AddBuddy, 0, this.sessionId);
    packet.addValue(14, _("buddy.invite.message"));
    packet.addValue(65, aBuddy.tag.name);
    packet.addValue(97, "1"); // UTF-8 encoding.
    packet.addValue(1, this._account.cleanUsername);
    // The purpose of these two values are unknown.
    packet.addValue(302, "319");
    packet.addValue(300, "319");
    packet.addValue(7, aBuddy.userName);
    // The purpose of these three values are also unknown.
    packet.addValue(334, "0");
    packet.addValue(301, "319");
    packet.addValue(303, "319");
    this.sendBinaryData(packet.toArrayBuffer());
  },

  removeBuddyFromServer: function(aBuddy) {
    let packet = new YahooPacket(kPacketType.RemoveBuddy, 0, this.sessionId);
    packet.addValue(1, this._account.cleanUsername);
    packet.addValue(7, aBuddy.userName);
    packet.addValue(65, aBuddy.tag.name);
    this.sendBinaryData(packet.toArrayBuffer());
  },

  setStatus: function(aStatus, aMessage) {
    let packet = new YahooPacket(kPacketType.StatusUpdate, 0, this.sessionId);

    // When a custom status message is used, key 10 is set to 99, and key 97
    // is set to 1. Otherwise, key 10 is set to our current status code.
    if (aMessage && aMessage.length > 0) {
      packet.addValue(10, "99");
      packet.addValue(97, "1");
    } else {
      let statusCode;
      switch(aStatus) {
        // Available
        case Ci.imIStatusInfo.STATUS_AVAILABLE:
        case Ci.imIStatusInfo.STATUS_MOBILE:
          statusCode = "0";
          break;
        // Away
        case Ci.imIStatusInfo.STATUS_AWAY:
          statusCode = "1";
          break;
        // Busy
        case Ci.imIStatusInfo.STATUS_UNAVAILABLE:
          statusCode = "2";
          break;
        // Invisible
        case Ci.imIStatusInfo.STATUS_INVISIBLE:
          statusCode = "12";
          break;
        // Idle
        case Ci.imIStatusInfo.STATUS_IDLE:
          statusCode = "999";
          break;
      }
      packet.addValue(10, statusCode);
    }

    // Key 19 is always set as the status messgae, even when the message is
    // empty. If key 10 is set to 99, the message is used.
    packet.addValue(19, aMessage);

    // Key 47 is always set to either 0, if we are available, or 1, if we are
    // not available. The value is used by the server if key 10 is set to 99.
    // Otherwise, the value of key 10 is used to determine our status.
    packet.addValue(47, (aStatus == Ci.imIStatusInfo.STATUS_AVAILABLE) ?
                    "0" : "1");
    this.sendBinaryData(packet.toArrayBuffer());
  },

  sendChatMessage: function(aName, aMessage) {
    let packet = new YahooPacket(kPacketType.Message, 0, this.sessionId);
    // XXX Key 0 is the user ID, and key 1 is the active ID. We need to find
    // the difference between these two. Alias maybe?
    packet.addValue(0, this._account.cleanUsername);
    packet.addValue(1, this._account.cleanUsername);
    packet.addValue(5, aName);
    packet.addValue(14, aMessage);
    this.sendBinaryData(packet.toArrayBuffer());
  },

  sendConferenceMessage: function(aRecipients, aRoom, aMessage) {
    let packet = new YahooPacket(kPacketType.ConfMessage, 0, this.sessionId);
    packet.addValue(1, this._account.cleanUsername);
    packet.addValues(53, aRecipients);
    packet.addValue(57, aRoom);
    packet.addValue(14, aMessage);
    packet.addValue(97, "1"); // Use UTF-8 encoding.
    this.sendBinaryData(packet.toArrayBuffer());
  },

  sendTypingStatus: function(aBuddyName, aIsTyping) {
    let packet = new YahooPacket(kPacketType.Notify, kPacketStatuses.Typing,
                                 this.sessionId);
    packet.addValue(1, this._account.cleanUsername);
    packet.addValue(5, aBuddyName);
    packet.addValue(13, aIsTyping ? "1" : "0");
    packet.addValue(14, " "); // Key 14 contains a single space.
    packet.addValue(49, "TYPING");
    this.sendBinaryData(packet.toArrayBuffer());
  },

  acceptConferenceInvite: function(aOwner, aRoom, aParticipants) {
    let packet = new YahooPacket(kPacketType.ConfLogon, 0, this.sessionId);
    packet.addValue(1, this._account.cleanUsername);
    packet.addValue(3, this._account.cleanUsername);
    packet.addValue(57, aRoom);
    packet.addValues(3, aParticipants);
    this.sendBinaryData(packet.toArrayBuffer());
  },

  createConference: function(aRoom) {
    let packet = new YahooPacket(kPacketType.ConfLogon, 0, this.sessionId);
    packet.addValue(1, this._account.cleanUsername);
    packet.addValue(3, this._account.cleanUsername);
    packet.addValue(57, aRoom);
    this.sendBinaryData(packet.toArrayBuffer());
  },

  inviteToConference: function(aInvitees, aRoom, aParticipants, aMessage) {
    let packet = new YahooPacket(kPacketType.ConfAddInvite, 0, this.sessionId);
    packet.addValue(1, this._account.cleanUsername);
    packet.addValues(51, aInvitees);
    packet.addValues(53, aParticipants);
    packet.addValue(57, aRoom);
    packet.addValue(58, aMessage);
    packet.addValue(13, "0");
    this.sendBinaryData(packet.toArrayBuffer());
  },

  sendConferenceLogoff: function(aName, aParticipants, aRoom) {
    let packet = new YahooPacket(kPacketType.ConfLogoff, 0, this.sessionId);
    packet.addValue(1, aName);
    packet.addValues(3, aParticipants);
    packet.addValue(57, aRoom);
    this.sendBinaryData(packet.toArrayBuffer());
  },

  // Callbacks.
  onLoginComplete: function() {
    this._account.reportConnected();
  },

  onSessionError: function(aError, aMessage) {
    this._account.reportDisconnecting(aError, aMessage);
    if (this.isConnected)
      this.disconnect();
    this._account.reportDisconnected();
  },

  // Private methods.

  // Socket Event Callbacks.
  LOG: function(aString) this._account.LOG(aString),

  DEBUG: function(aString) this._account.DEBUG(aString),

  onConnection: function() {
    // We send an authentication request packet as soon as we connect to the
    // pager server.
    let packet = new YahooPacket(kPacketType.Auth, 0, 0);
    packet.addValue(1, this._account.cleanUsername);
    this.sendBinaryData(packet.toArrayBuffer());
  },

  onConnectionTimedOut: function() {
    this.onSessionError(Ci.prplIAccount.NETWORK_ERROR, "");
  },

  onConnectionReset: function() {
    this.onSessionError(Ci.prplIAccount.NETWORK_ERROR, "");
  },

  // Called when the other end has closed the connection.
  onConnectionClosed: function() {
    if (!this._account.connected)
      return;
    this._account.reportDisconnecting(Ci.prplIAccount.NO_ERROR, "");
    this._account.reportDisconnected();
  },

  onBinaryDataReceived: function(aData) {
    let packets;
    let bytesHandled;
    try {
      [packets, bytesHandled] = YahooPacket.extractPackets(aData);
    } catch(e) {
      this._account.ERROR(e);
      this.onSessionError(Ci.prplIAccount.NETWORK_ERROR, "");
      return 0;
    }

    for each (let packet in packets) {
      if (YahooPacketHandler.hasOwnProperty(packet.service)) {
        try {
          YahooPacketHandler[packet.service].call(this._account, packet);
        } catch(e) {
          this._account.ERROR(e);
        }
      } else {
        this._account.WARN("No handler for Yahoo! packet " +
                           packet.service.toString(16) + ".");
      }
    }
    return bytesHandled;
  }
};

/* The purpose of YahooLoginHelper is to separate the complicated login logic
 * from the YahooSession object. Logging in on Yahoo!'s network is the most
 * complicated stage of a session due to the authentication system that is
 * employed. The login steps are listed below.
 *
 * 1) Get the address of a "pager" server. This pager will be our gateway to
 *    the network.
 *
 * 2) Obtain the challenge string from the pager. This string is used to help
 *    create the base64 response string needed for the final step.
 *
 * 3) Obtain a token from the login server via HTTP.
 *
 * 4) Obtain the login crumb, Y-Cookie, and T-Cookie from the login server via
 *    HTTP. These will also be used in the final response packet to the pager.
 *
 * 5) Create the base64 response string from the MD5 hash of the crumb and
 *    challenge string, and build a packet containing the username, password,
 *    response string, version numbers, crumb, and cookies, sending it to the
 *    pager for a final authenticatcation.
 *
 * If all goes well after the 5th step, the user is considered logged in. */
function YahooLoginHelper(aSession)
{
  this._session = aSession;
}
YahooLoginHelper.prototype = {
  // YahooSession object passed in constructor.
  _session: null,
  // YahooAccount object passed to login().
  _account: null,
  // The username, stripped of any @yahoo.com or @yahoo.co.jp suffix.
  _username: null,
  // The authentication challenge string sent from the Yahoo!'s login server.
  _challengeString: null,
  // The authentication token sent from Yahoo!'s login server.
  _loginToken: null,
  // Crumb and cookie strings sent from Yahoo!'s login server, and used in
  // the final authentication request to the pager server.
  _crumb: null,
  _yCookie: null,
  _tCookie: null,

  // Public methods.
  login: function(aAccount) {
    this._account = aAccount;
    this._getPagerAddress();
  },

  // Private methods.
  _getPagerAddress: function() {
    doXHRequest(this._account._protocol.pagerRequestUrl, null, null,
                this._onPagerAddressResponse, this._onHttpError, this,
                "GET", null);
  },

  _getChallengeString: function() {
    let port = this._account.getInt("port");
    this._session.connect(this._session.pagerAddress, port);
    // We want to handle a challenge string when the server responds.
    this._session.onBinaryDataReceived =
      this._onChallengeStringResponse.bind(this);
  },

  _getLoginToken: function() {
    // TODO - Simplify this using map and join.
    let url = this._account._protocol.loginTokenGetUrl;
    url += "?src=ymsgr&";
    url += "login=" + percentEncode(this._account.cleanUsername) + "&";
    url += "passwd=" + percentEncode(this._account.imAccount.password) + "&";
    url += "chal=" + percentEncode(this._challengeString);

    doXHRequest(url, null, null, this._onLoginTokenResponse,
                this._onHttpError, this, "GET", null);
  },

  _getCookies: function() {
    // TODO - Simplify this using map and join.
    let url = this._account._protocol.loginTokenLoginUrl;
    url += "?src=ymsgr&";
    url += "token=" + this._loginToken;

    doXHRequest(url, null, null, this._onLoginCookiesResponse,
                this._onHttpError, this, "GET", null);
  },

  _sendPagerAuthResponse: function() {
    let response = this._calculatePagerResponse();
    let packet = new YahooPacket(kPacketType.AuthResponse, 0,
                                 this._session.sessionId);
    // Build the key/value pairs.
    packet.addValue(1, this._account.cleanUsername);
    packet.addValue(0, this._account.cleanUsername);
    packet.addValue(277, this._yCookie);
    packet.addValue(278, this._tCookie);
    packet.addValue(307, response);
    packet.addValue(244, this._account.protocol.buildId);
    packet.addValue(2, this._account.cleanUsername);
    packet.addValue(2, "1");
    packet.addValue(98, "us");
    this._session.sendBinaryData(packet.toArrayBuffer());

    // We want to handle a final login confirmation packet when the server
    // responds.
    this._session.onBinaryDataReceived = this._onFinalLoginResponse.bind(this);
  },

  _calculatePagerResponse: function() {
    let hasher = Cc["@mozilla.org/security/hash;1"]
                   .createInstance(Ci.nsICryptoHash);
    hasher.init(hasher.MD5);

    let crypt = this._crumb + this._challengeString;
    let cryptData = StringToBytes(crypt);
    hasher.update(cryptData, cryptData.length);

    // The protocol requires replacing + with ., / with _, and = with - within
    // the base64 response string.
    return btoa(hasher.finish(false)).replace(/\+/g, ".").replace(/\//g, "_")
                                     .replace(/=/g, "-");
  },

  _handleLoginError: function(aErrorCode) {
    let errorInfo = kLoginStatusErrors[aErrorCode];
    let errorMessage;
    let error;

    // If we find information on the error code we received, we will use that
    // information. If the error wasn't found in our error table, just throw a
    // generic error with the code included.
    if (errorInfo) {
      errorMessage = _("login.error." + errorInfo[0]);
      error = errorInfo[1];
    } else {
      errorMessage = _("login.error.unknown", aErrorCode);
      error = Ci.prplIAccount.ERROR_OTHER_ERROR;
      // We also throw a console error because we didn't expect
      // this error code.
      this._account.ERROR("Received unknown error from pager server. Code: " +
                          aErrorCode);
    }
    this._session.onSessionError(error, errorMessage);
  },

  _onHttpError: function(aError, aStatusText, aXHR) {
    this._session.onSessionError(Ci.prplIAccount.NETWORK_ERROR,
                               _("network.error.http"));
  },

  // HTTP Response Callbacks.
  _onPagerAddressResponse: function(aResponse, aXHR) {
    this._session.pagerAddress =
      aResponse.substring(aResponse.lastIndexOf("=") + 1);
    this._getChallengeString();
  },

  _onLoginTokenResponse: function(aResponse, aXHR) {
    let responseParams = aResponse.split("\r\n");
    // Status code "0" means success.
    let statusCode = responseParams[0];
    if (statusCode != "0") {
      this._handleLoginError(statusCode);
      return;
    }

    this._loginToken = responseParams[1].replace("ymsgr=", "");
    this._getCookies();
  },

  _onLoginCookiesResponse: function(aResponse, aXHR) {
    let responseParams = aResponse.split("\r\n");
    // Status code "0" means success.
    let statusCode = responseParams[0];
    if (statusCode != "0") {
      this._handleLoginError(statusCode);
      return;
    }

    this._crumb = responseParams[1].replace("crumb=", "");
    this._yCookie = responseParams[2].substring(2); // Remove the "Y=" bit.
    this._tCookie = responseParams[3].substring(2); // Remove the "T=" bit.
    this._sendPagerAuthResponse();
  },

  // TCP Response Callbacks.
  _onChallengeStringResponse: function(aData) {
    let packet = new YahooPacket();
    packet.fromArrayBuffer(aData);
    // The value of the challenge string is associated with key 94.
    this._challengeString = packet.getValue(94);
    this._session.sessionId = packet.sessionId;
    this._getLoginToken();
  },

  _onFinalLoginResponse: function(aData) {
    this._session.onLoginComplete();
    // We need to restore data handling to the YahooSession object since our
    // login steps are complete.
    this._session.onBinaryDataReceived =
      YahooSession.prototype.onBinaryDataReceived.bind(this._session);
  }
};

/* The YahooPacket class represents a single Yahoo! Messenger data packet.
 * Using this class allows you to easily create packets, stuff them with
 * required data, and convert them to/from ArrayBuffer objects. */
function YahooPacket(aService, aStatus, aSessionId)
{
  this.service = aService;
  this.status = aStatus;
  this.sessionId = aSessionId;
  this.keyValuePairs = [];
}
YahooPacket.prototype = {
  service: null,
  status: null,
  sessionId: null,
  keyValuePairs: null,

  // Public methods.

  // Add a single key/value pair.
  addValue: function(aKey, aValue) {
    let pair = {
      key: aKey.toString(), // The server handles keys as ASCII number values.
      value: aValue
    };

    this.keyValuePairs.push(pair);
  },

  // Add multiple key/value pairs with the same key but different values
  // stored in an array.
  addValues: function(aKey, aValues) {
    for each (let value in aValues)
      this.addValue(aKey, value);
  },

  // This method returns the first value found with the given key.
  getValue: function(aKey) {
    for (let i = 0; i < this.keyValuePairs.length; ++i) {
      let pair = this.keyValuePairs[i];
      // The server handles keys as ASCII number values.
      if (pair.key == aKey.toString())
        return pair.value;
    }

    // Throw an error if the key wasn't found.
    throw "Required key " + aKey + " wasn't found. Packet Service: " +
          this.service.toString(16);
  },

  // This method returns all of the values found with the given key. In some
  // packets, one key is associated with multiple values. If that is the case,
  // use this method to retrieve all of them instead of just the first one.
  getValues: function(aKey) {
    let values = [];
    for (let i = 0; i < this.keyValuePairs.length; ++i) {
      let pair = this.keyValuePairs[i];
      // The server handles keys as ASCII number values.
      if (pair.key == aKey.toString())
        values.push(pair.value);
    }

    // Throw an error if no keys were found.
    if (values.length == 0) {
      throw "Required key " + aKey + " wasn't found. Packet Service: " +
            this.service.toString(16);
    }
    return values;
  },

  hasKey: function(aKey) {
    for (let i = 0; i < this.keyValuePairs.length; ++i) {
      // The server handles keys as ASCII number values.
      if (this.keyValuePairs[i].key == aKey.toString())
        return true;
    }
    return false;
  },

  toArrayBuffer: function() {
    let dataString = "";
    for (let i = 0; i < this.keyValuePairs.length; ++i) {
      let pair = this.keyValuePairs[i];
      dataString += pair.key + kPacketDataDelimiter;
      dataString += pair.value + kPacketDataDelimiter;
    }

    let packetLength = dataString.length;
    let buffer = new ArrayBuffer(kPacketHeaderSize + packetLength);

    // Build header.
    let view = new DataView(buffer);
    let idBytes = StringToBytes(kPacketIdentifier);
    view.setUint8(0, idBytes[0]);
    view.setUint8(1, idBytes[1]);
    view.setUint8(2, idBytes[2]);
    view.setUint8(3, idBytes[3]);
    view.setUint16(4, kProtocolVersion);
    view.setUint16(6, 0); // Vendor ID
    view.setUint16(8, packetLength);
    view.setUint16(10, this.service);
    view.setUint32(12, this.status);
    view.setUint32(16, this.sessionId);

    // Copy in data.
    copyBytes(buffer, BytesToArrayBuffer(StringToBytes(dataString)), kPacketHeaderSize);

    return buffer;
  },

  fromArrayBuffer: function(aBuffer) {
    let view = new DataView(aBuffer);
    this.length = view.getUint16(8) + kPacketHeaderSize;
    this.service = view.getUint16(10);
    this.status = view.getUint32(12);
    this.sessionId = view.getUint32(16);

    let dataString = ArrayBufferToString(aBuffer).substring(kPacketHeaderSize);
    let delimitedData = dataString.split(kPacketDataDelimiter);
    // Since the data should also end with a trailing delmiter, split() will
    // add an empty element at the end. We need to pop this element off.
    delimitedData.pop();

    // If we don't have an even number of delimitedData elements, that means
    // we are either missing a key or a value.
    if (delimitedData.length % 2 != 0) {
      throw "Odd number of data elements. Either a key or value is missing. "
            "Num of elements: " + delimitedData.length;
    }

    for (let i = 0; i < delimitedData.length; i += 2) {
      let key = delimitedData[i];
      let value = delimitedData[i + 1];
      if (key && value) {
        let pair = {
          key: key,
          value: value
        };
        this.keyValuePairs.push(pair);
      }
    }
  }
};
YahooPacket.extractPackets = function(aData, aOnNetworkError) {
  let packets = [];
  let bytesHandled = 0;

  while (aData.byteLength >= kPacketHeaderSize) {
    if (ArrayBufferToString(aData.slice(0, kPacketIdentifier.length)) !=
        kPacketIdentifier) {
      throw "Malformed packet received. Packet content: " +
            ArrayBufferToHexString(aData);
    }

    let packetView = new DataView(aData);
    let packetLength = packetView.getUint16(8) + kPacketHeaderSize;
    // Don't process half packets.
    if (packetLength > aData.byteLength)
      break;
    let packet = new YahooPacket();
    packet.fromArrayBuffer(aData.slice(0, packetLength));
    packets.push(packet);
    bytesHandled += packetLength;
    aData = aData.slice(packetLength);
  }
  return [packets, bytesHandled];
}

/* In YahooPacketHandler, each handler function is assosiated with a packet
 * service number. You can use the kPacketType enumeration to understand
 * what kind of packet each number is linked to.
 *
 * Keep in mind too that "this" in each function will be bound to a
 * YahooAccount object, since they are all invoked using call(). */
const YahooPacketHandler = {
  // Buddy logoff.
  0x02: function(aPacket) {
    let name = aPacket.getValue(7);
    this.setBuddyStatus(name, Ci.imIStatusInfo.STATUS_OFFLINE, "");
  },

  // Incoming chat message.
  0x06: function(aPacket) {
    let from = aPacket.getValue(4);
    let to = aPacket.getValue(5);
    let message = aPacket.getValue(14);
    this.receiveMessage(from, message);

    // The official Yahoo! Messenger desktop client requires message ACKs to be
    // sent back to the server. The web client doesn't require this. A good
    // indication of when an ACK is required is when key 429 is sent, which
    // contains the ID of the message. When a message is sent from the official
    // desktop client, and no ACK is sent back, the message is resent seconds
    // later.
    if (aPacket.hasKey(429)) {
      let messageId = aPacket.getValue(429);
      let packet = new YahooPacket(kPacketType.MessageAck, 0, aPacket.sessionId);
      // Some keys have an unknown purpose, so we set a constant value.
      packet.addValue(1, to);
      packet.addValue(5, from);
      packet.addValue(302, "430");
      packet.addValue(430, messageId);
      packet.addValue(303, 430);
      packet.addValue(450, 0);
      this._session.sendBinaryData(packet.toArrayBuffer());
    }
  },

  // New mail notification.
  // TODO: Implement this handler when mail notifications are handled in the
  // base code.
  0x0b: function(aPacket) {},

  // Server ping.
  // TODO: Add support for ping replies.
  0x12: function(aPacket) {},

  // Conference invitation.
  0x18: function(aPacket) {
    let owner = aPacket.getValue(50);
    let roomName = aPacket.getValue(57);
    let participants = aPacket.getValues(52);
    // The owner is also a participant.
    participants.push(owner);
    let message = aPacket.getValue(58);
    this.receiveConferenceInvite(owner, roomName, participants, message);
  },

  // Conference logon.
  0x19: function(aPacket) {
    let userName = aPacket.getValue(53);
    let room = aPacket.getValue(57);
    this.receiveConferenceLogon(room, userName);
  },

  // Conference logoff
  0x1b: function(aPacket) {
    let userName = aPacket.getValue(56);
    let roomName = aPacket.getValue(57);
    this.receiveConferenceLogoff(roomName, userName);
  },

  // Conference additional invitation. NOTE: Since this packet has the same
  // structure as the normal conference invite (packet 0x18), we simply
  // reuse that handler.
  0x1c: function(aPacket) YahooPacketHandler[0x18].call(this, aPacket),

  // Conference message.
  0x1d: function(aPacket) {
    let from = aPacket.getValue(3);
    let room = aPacket.getValue(57);
    let message = aPacket.getValue(14);
    this.receiveConferenceMessage(from, room, message);
  },

  // Typing notification.
  0x4b: function(aPacket) {
    let name = aPacket.getValue(4);
    let isTyping = (aPacket.getValue(13) == "1");
    this.receiveTypingNotification(name, isTyping);
  },

  // Legacy Yahoo! buddy list. Packet 0xf1 has replaced this.
  0x55: function(aPacket) {},

  // Authentication acknowledgement. We can ignore this since we are known
  // to be authenticated if we are receiving other packets anyway.
  0x57: function(aPacket) {},

  // Buddy status update.
  0xc6: function (aPacket) {
    let name = aPacket.getValue(7);
    // Try to grab a status from the well-used buddy statuses. If we can't
    // find it there, try the extra ones.
    let status = kBuddyStatuses[aPacket.getValue(10)];
    let message = "";
    if (aPacket.hasKey(19))
      message = aPacket.getValue(19);

    this.setBuddyStatus(name, status, message);
  },

  // Buddy authorization request.
  0xd6: function(aPacket) {
    // Whenever we authorize someone to be our buddy, the server will send an
    // acknowledgement packet. We ignore the ack to prevent the auth request
    // from showing again.
    if (aPacket.status == kPacketStatuses.ServerAck)
      return;

    let authRequest = {
      _account: this,
      _session: this._session,
      get account() this,
      userName: aPacket.getValue(4),
      grant: function() {
        let packet = new YahooPacket(kPacketType.BuddyAuth, 0,
                             this._session.sessionId);
        packet.addValue(1, this._account.cleanUsername);
        packet.addValue(5, this.userName);
        // Misc. Unknown flags.
        packet.addValue(13, 1);
        packet.addValue(334, 0);
        this._session.sendBinaryData(packet.toArrayBuffer());

        // If someone wants to add us as a buddy, place them under the default
        // "Contacts" tag. Also, we make sure that the buddy doesn't already
        // exist in the list in case of a server acknowledgement.
        if (!this._account.hasBuddy(this.userName)) {
          let tag = Services.tags.createTag(_("buddy.auth.defaultGroup"));
          this._account.addBuddy(tag, this.userName);
        }
      },
      deny: function() {
        let packet = new YahooPacket(kPacketType.BuddyReqReject, 0,
                                     this._session.sessionId);
        packet.addValue(1, this._account.cleanUsername);
        packet.addValue(7, this.userName);
        packet.addValue(14, "");
        this._session.sendBinaryData(packet.toArrayBuffer());
      },
      cancel: function() {
        Services.obs.notifyObservers(this,
                                     "buddy-authorization-request-canceled",
                                     null);
      },
      QueryInterface: XPCOMUtils.generateQI([Ci.prplIBuddyRequest])
    };
    Services.obs.notifyObservers(authRequest, "buddy-authorization-request",
                                 null);
  },

  // XXX: What does this packet do?
  0xef: function(aPacket) {},

  // Initial user status.
  0xf0: function (aPacket) {
    // The protocol correctly orders groups of key/values per buddy. So we can
    // place all occurances of a certain key in each array, and match them up.

    // Return early if we find no buddy names.
    if (!aPacket.hasKey(7))
      return;
    let buddyNames = aPacket.getValues(7);
    let buddyStatuses = aPacket.getValues(10);
    let statusMessages;
    if (aPacket.hasKey(19))
      statusMessages = aPacket.getValues(19);

    for (let i in buddyNames) {
      let name = buddyNames[i];
      let status = kBuddyStatuses[buddyStatuses[i]];
      let message = statusMessages ? statusMessages[i] : "";

      this.setBuddyStatus(name, status, message);
    }
  },

  // Friends and groups list.
  0xf1: function(aPacket) {
    let tagName = "";
    for each (let pair in aPacket.keyValuePairs) {
      if (pair.key == "65")
        tagName = pair.value;
      else if (pair.key == "7") {
        let buddyName = pair.value;
        this.addBuddyFromServer(Services.tags.createTag(tagName), buddyName);
      }
    }
  }
};
