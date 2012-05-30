/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#if !defined(INCLUDED_CALDATETIME_H)
#define INCLUDED_CALDATETIME_H

#include "calIDateTime.h"
#include "calITimezoneProvider.h"
#include "calUtils.h"

struct icaltimetype;
typedef struct _icaltimezone icaltimezone;

class calDateTime : public calIDateTime,
                    public cal::XpcomBase
{
public:
    calDateTime();
    calDateTime(icaltimetype const* icalt, calITimezone * tz);

    NS_DECL_ISUPPORTS
    NS_DECL_CALIDATETIME

protected:
    bool mImmutable;
    bool mIsValid;
    bool mIsDate;

    PRInt16 mYear;
    PRInt16 mMonth;
    PRInt16 mDay;
    PRInt16 mHour;
    PRInt16 mMinute;
    PRInt16 mSecond;
    PRInt16 mWeekday;
    PRInt16 mYearday;

    PRTime mNativeTime;
    nsCOMPtr<calITimezone> mTimezone;

    void Normalize();
    void FromIcalTime(icaltimetype const* icalt, calITimezone *tz);
    void ensureTimezone();

    static PRTime IcaltimeToPRTime(icaltimetype const* icalt, icaltimezone const* tz);
    static void PRTimeToIcaltime(PRTime time, bool isdate,
                                 icaltimezone const* tz, icaltimetype *icalt);
};

#endif // INCLUDED_CALDATETIME_H
