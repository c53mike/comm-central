/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

ChromeUtils.defineModuleGetter(
  this,
  "MailServices",
  "resource:///modules/MailServices.jsm"
);

async function openComposeWindow(relatedMessageId, type, composeParams) {
  // ForwardInline is totally broken, see bug 1513824.
  if (type == Ci.nsIMsgCompType.ForwardInline) {
    let msgHdr = null;
    let msgURI = null;
    let hdrIdentity = null;
    if (relatedMessageId) {
      msgHdr = messageTracker.getMessage(relatedMessageId);
      msgURI = msgHdr.folder.getUriForMsg(msgHdr);
    }
    MailServices.compose.OpenComposeWindow(
      null,
      msgHdr,
      msgURI,
      type,
      0,
      hdrIdentity,
      null
    );
    return;
  }

  let params = Cc[
    "@mozilla.org/messengercompose/composeparams;1"
  ].createInstance(Ci.nsIMsgComposeParams);
  let composeFields = Cc[
    "@mozilla.org/messengercompose/composefields;1"
  ].createInstance(Ci.nsIMsgCompFields);

  if (relatedMessageId) {
    let msgHdr = messageTracker.getMessage(relatedMessageId);
    params.originalMsgURI = msgHdr.folder.getUriForMsg(msgHdr);
  }
  params.type = type;
  if (composeParams) {
    for (let field of ["to", "cc", "bcc"]) {
      if (Array.isArray(composeParams[field])) {
        let recipients = [];
        for (let recipient of composeParams[field]) {
          if (typeof recipient == "string") {
            recipients.push(recipient);
            continue;
          }
          if (!("addressBookCache" in this)) {
            await extensions.asyncLoadModule("addressBook");
          }
          if (recipient.type == "contact") {
            let contactNode = this.addressBookCache.findContactById(
              recipient.id
            );
            recipients.push(
              MailServices.headerParser.makeMimeAddress(
                contactNode.item.displayName,
                contactNode.item.primaryEmail
              )
            );
          } else {
            let mailingListNode = this.addressBookCache.findMailingListById(
              recipient.id
            );
            recipients.push(
              MailServices.headerParser.makeMimeAddress(
                mailingListNode.item.dirName,
                mailingListNode.item.description || mailingListNode.item.dirName
              )
            );
          }
        }
        composeFields[field] = recipients.join(",");
      }
    }
    for (let field of ["replyTo", "subject", "body"]) {
      if (composeParams[field]) {
        composeFields[field] = composeParams[field];
      }
    }
  }

  params.composeFields = composeFields;
  MailServices.compose.OpenComposeWindowWithParams(null, params);
}

var composeEventTracker = new (class extends EventEmitter {
  constructor() {
    super();
    this.listenerCount = 0;
  }
  on(event, listener) {
    super.on(event, listener);

    this.listenerCount++;
    if (this.listenerCount == 1) {
      windowTracker.addListener("beforesend", this);
    }
  }
  off(event, listener) {
    super.off(event, listener);

    this.listenerCount--;
    if (this.listenerCount == 0) {
      windowTracker.removeListener("beforesend", this);
    }
  }
  async handleEvent(event) {
    event.preventDefault();

    let msgType = event.detail;
    let composeWindow = event.target;

    let results = await this.emit("compose-before-send");
    if (results && results.length > 0) {
      for (let result of results) {
        if (result) {
          if (result.cancel) {
            return;
          }
        }
      }
    }
    composeWindow.CompleteGenericSendMessage(msgType);
  }
})();

this.compose = class extends ExtensionAPI {
  getAPI(context) {
    return {
      compose: {
        onBeforeSend: new EventManager({
          context,
          name: "compose.onBeforeSend",
          register: fire => {
            let listener = () => fire.async();

            composeEventTracker.on("compose-before-send", listener);
            return () => {
              composeEventTracker.off("compose-before-send", listener);
            };
          },
        }).api(),
        async beginNew(composeParams) {
          openComposeWindow(null, Ci.nsIMsgCompType.New, composeParams);
        },
        beginReply(messageId, replyType) {
          let type = Ci.nsIMsgCompType.Reply;
          if (replyType == "replyToList") {
            type = Ci.nsIMsgCompType.ReplyToList;
          } else if (replyType == "replyToAll") {
            type = Ci.nsIMsgCompType.ReplyAll;
          }
          openComposeWindow(messageId, type);
        },
        beginForward(messageId, forwardType, composeParams) {
          let type = Ci.nsIMsgCompType.ForwardInline;
          if (forwardType == "forwardAsAttachment") {
            type = Ci.nsIMsgCompType.ForwardAsAttachment;
          } else if (
            forwardType === null &&
            Services.prefs.getIntPref("mail.forward_message_mode") == 0
          ) {
            type = Ci.nsIMsgCompType.ForwardAsAttachment;
          }
          openComposeWindow(messageId, type, composeParams);
        },
      },
    };
  }
};
