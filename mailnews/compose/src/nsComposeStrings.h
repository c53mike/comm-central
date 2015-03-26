/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
  String Ids used by mailnews\compose
  To Do: Convert the callers to use names instead of ids and then make this file obsolete.
 */
 
#ifndef _nsComposeStrings_H__
#define _nsComposeStrings_H__

#include "msgCore.h"

#define NS_MSG_UNABLE_TO_OPEN_FILE                  NS_MSG_GENERATE_FAILURE(12500)
#define NS_MSG_UNABLE_TO_OPEN_TMP_FILE              NS_MSG_GENERATE_FAILURE(12501)
#define NS_MSG_UNABLE_TO_SAVE_TEMPLATE              NS_MSG_GENERATE_FAILURE(12502)
#define NS_MSG_UNABLE_TO_SAVE_DRAFT                 NS_MSG_GENERATE_FAILURE(12503)
#define NS_MSG_COULDNT_OPEN_FCC_FOLDER              NS_MSG_GENERATE_FAILURE(12506)
#define NS_MSG_NO_SENDER                            NS_MSG_GENERATE_FAILURE(12510)
#define NS_MSG_NO_RECIPIENTS                        NS_MSG_GENERATE_FAILURE(12511)
#define NS_MSG_ERROR_WRITING_FILE                   NS_MSG_GENERATE_FAILURE(12512)
#define NS_ERROR_SENDING_FROM_COMMAND               NS_MSG_GENERATE_FAILURE(12514)
#define NS_ERROR_SENDING_DATA_COMMAND               NS_MSG_GENERATE_FAILURE(12516)
#define NS_ERROR_SENDING_MESSAGE                    NS_MSG_GENERATE_FAILURE(12517)
#define NS_ERROR_POST_FAILED                        NS_MSG_GENERATE_FAILURE(12518)
#define NS_ERROR_QUEUED_DELIVERY_FAILED             NS_MSG_GENERATE_FAILURE(12519)
#define NS_ERROR_SEND_FAILED                        NS_MSG_GENERATE_FAILURE(12520)
#define NS_ERROR_SMTP_SERVER_ERROR                  NS_MSG_GENERATE_FAILURE(12524)
#define NS_MSG_UNABLE_TO_SEND_LATER                 NS_MSG_GENERATE_FAILURE(12525)
#define NS_ERROR_COMMUNICATIONS_ERROR               NS_MSG_GENERATE_FAILURE(12526)
#define NS_ERROR_BUT_DONT_SHOW_ALERT                NS_MSG_GENERATE_FAILURE(12527)
#define NS_ERROR_TCP_READ_ERROR                     NS_MSG_GENERATE_FAILURE(12528)
#define NS_ERROR_COULD_NOT_GET_USERS_MAIL_ADDRESS   NS_MSG_GENERATE_FAILURE(12529)
#define NS_ERROR_MIME_MPART_ATTACHMENT_ERROR        NS_MSG_GENERATE_FAILURE(12531)
#define NS_MSG_FAILED_COPY_OPERATION                NS_MSG_GENERATE_FAILURE(12532)

/* 12554 is taken by NS_ERROR_NNTP_NO_CROSS_POSTING.  use 12555 as the next one */

#define NS_MSG_CANCELLING                           NS_MSG_GENERATE_SUCCESS(12555)

// For message sending report
#define NS_ERROR_SEND_FAILED_BUT_NNTP_OK            NS_MSG_GENERATE_FAILURE(12560)
#define NS_MSG_ERROR_READING_FILE                   NS_MSG_GENERATE_FAILURE(12563)

#define NS_MSG_ERROR_ATTACHING_FILE                 NS_MSG_GENERATE_FAILURE(12570)

#define NS_ERROR_SMTP_GREETING                      NS_MSG_GENERATE_FAILURE(12572)

#define NS_ERROR_SENDING_RCPT_COMMAND               NS_MSG_GENERATE_FAILURE(12575)

#define NS_ERROR_STARTTLS_FAILED_EHLO_STARTTLS      NS_MSG_GENERATE_FAILURE(12582)

#define NS_ERROR_SMTP_PASSWORD_UNDEFINED            NS_MSG_GENERATE_FAILURE(12584)
#define NS_ERROR_SMTP_TEMP_SIZE_EXCEEDED            NS_MSG_GENERATE_FAILURE(12586)
#define NS_ERROR_SMTP_PERM_SIZE_EXCEEDED_1          NS_MSG_GENERATE_FAILURE(12587)
#define NS_ERROR_SMTP_PERM_SIZE_EXCEEDED_2          NS_MSG_GENERATE_FAILURE(12588)

#define NS_ERROR_SMTP_SEND_FAILED_UNKNOWN_SERVER    NS_MSG_GENERATE_FAILURE(12589)
#define NS_ERROR_SMTP_SEND_FAILED_REFUSED           NS_MSG_GENERATE_FAILURE(12590)
#define NS_ERROR_SMTP_SEND_FAILED_INTERRUPTED       NS_MSG_GENERATE_FAILURE(12591)
#define NS_ERROR_SMTP_SEND_FAILED_TIMEOUT           NS_MSG_GENERATE_FAILURE(12592)
#define NS_ERROR_SMTP_SEND_FAILED_UNKNOWN_REASON    NS_MSG_GENERATE_FAILURE(12593)

#define NS_ERROR_SMTP_AUTH_CHANGE_ENCRYPT_TO_PLAIN_NO_SSL  NS_MSG_GENERATE_FAILURE(12594)
#define NS_ERROR_SMTP_AUTH_CHANGE_ENCRYPT_TO_PLAIN_SSL     NS_MSG_GENERATE_FAILURE(12595)
#define NS_ERROR_SMTP_AUTH_CHANGE_PLAIN_TO_ENCRYPT         NS_MSG_GENERATE_FAILURE(12596)
#define NS_ERROR_SMTP_AUTH_FAILURE                  NS_MSG_GENERATE_FAILURE(12597)
#define NS_ERROR_SMTP_AUTH_GSSAPI                   NS_MSG_GENERATE_FAILURE(12598)
#define NS_ERROR_SMTP_AUTH_MECH_NOT_SUPPORTED       NS_MSG_GENERATE_FAILURE(12599)
#define NS_ERROR_SMTP_AUTH_NOT_SUPPORTED            NS_MSG_GENERATE_FAILURE(12600)

#define NS_ERROR_ILLEGAL_LOCALPART                  NS_MSG_GENERATE_FAILURE(12601)

const char16_t* errorStringNameForErrorCode(nsresult aCode);

#endif /* _nsComposeStrings_H__ */
