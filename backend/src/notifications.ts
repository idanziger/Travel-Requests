import { google } from 'googleapis';
import dotenv from 'dotenv';
import { getDelegatedAccessToken } from './google-dwd';
import { getGroupMemberEmails } from './google-groups';

dotenv.config({ path: '../.env' });

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const GMAIL_SENDER = process.env.GMAIL_SENDER?.trim() || 'travel@ssvlabs.io';
const notificationFromEmail = process.env.NOTIFICATION_FROM_EMAIL?.trim() || GMAIL_SENDER;
const senderName = process.env.NOTIFICATION_SENDER_NAME || 'SSV Labs Travel Desk';
const GMAIL_SEND_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const parseEmailList = (value?: string) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const primaryApprovers = parseEmailList(
  process.env.PRIMARY_APPROVER_EMAILS || 'travel-app-admins@ssvlabs.io'
);
const ADMIN_GROUP = process.env.ADMIN_GROUP_EMAIL || 'travel-app-admins@ssvlabs.io';

// Resolve approvers dynamically from the admin group (auto-syncs with membership);
// fall back to the env list if the directory lookup is unavailable.
const adminRecipients = async (): Promise<string[]> => {
  try {
    const members = await getGroupMemberEmails(ADMIN_GROUP);
    if (members.length > 0) return members;
  } catch (error) {
    console.error('Failed to load admin group members; falling back to PRIMARY_APPROVER_EMAILS', error);
  }
  return primaryApprovers;
};

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const uniqueRecipients = (recipients: string[]) => [...new Set(recipients.filter(Boolean))];

export const sendNotification = async (to: string | string[], subject: string, html: string) => {
  try {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
    const hasRefreshToken = Boolean(refreshToken);
    const hasDwdSender = Boolean(GMAIL_SENDER);
    if (!hasRefreshToken && !hasDwdSender) {
      console.log('Skipping email: No GOOGLE_REFRESH_TOKEN or DWD Gmail sender configured');
      return;
    }

    const recipients = uniqueRecipients(Array.isArray(to) ? to : [to]);
    if (recipients.length === 0) {
      console.log('Skipping email: No recipients resolved');
      return;
    }

    if (refreshToken) {
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
    } else {
      const accessToken = await getDelegatedAccessToken(GMAIL_SENDER, GMAIL_SEND_SCOPES);
      oauth2Client.setCredentials({ access_token: accessToken });
    }

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${recipients.join(', ')}`,
      `From: ${senderName} <${notificationFromEmail}>`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      html,
    ];

    const raw = Buffer.from(messageParts.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
  } catch (error) {
    console.error('Gmail API Error:', error);
  }
};

type Perspective = 'approver' | 'submitter' | 'traveler';

type RequestContext = {
  requesterName?: string;
  requesterEmail: string;
  travelerName: string;
  travelerEmail?: string | null;
  eventName: string;
};

const classify = (email: string, ctx: RequestContext): Perspective => {
  const e = email.toLowerCase();
  if (e === ctx.requesterEmail.toLowerCase()) return 'submitter';
  if (e === String(ctx.travelerEmail || '').toLowerCase()) return 'traveler';
  return 'approver';
};

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cta = (label: string) =>
  `<a href="${frontendUrl}/dashboard" style="display:inline-block;background:#2F6F99;color:#fff;padding:12px 22px;text-decoration:none;border-radius:10px;font-weight:600;">${label}</a>`;

const shell = (heading: string, intro: string, rows: [string, string][], extra = '', ctaLabel = 'Open Travel Desk') => `
  <div style="font-family:'Hanken Grotesk',Arial,sans-serif;max-width:560px;padding:24px;color:#2C281F;">
    <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9a9082;">SSV Labs &middot; Travel</div>
    <h2 style="font-weight:600;font-size:20px;margin:10px 0 6px;color:#2C281F;">${heading}</h2>
    <p style="color:#7a7264;line-height:1.6;margin:0 0 16px;">${intro}</p>
    <div style="background:#FAF6EF;border:1px solid rgba(44,40,31,.08);border-radius:12px;padding:14px 16px;margin-bottom:18px;">
      ${rows.map(([k, v]) => `<p style="margin:4px 0;color:#7a7264;"><strong style="color:#2C281F;">${k}:</strong> ${escapeHtml(v)}</p>`).join('')}
    </div>
    ${extra}
    ${cta(ctaLabel)}
  </div>`;

const TRAVEL_CONTACT = process.env.TRAVEL_CONTACT_EMAIL?.trim() || 'tamar@ssvlabs.io';
const TRAVEL_CONTACT_NAME = process.env.TRAVEL_CONTACT_NAME?.trim() || 'Tamar';

// "2026-07-08" + "2026-07-11" -> "8–11 Jul 2026 (4 days)". Falls back gracefully on missing/odd input.
const formatTripDates = (start?: string | null, end?: string | null, totalDays?: number | null): string => {
  const toDate = (v?: string | null) => {
    if (!v) return null;
    const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const s = toDate(start);
  const e = toDate(end);
  if (!s) return '';
  const day = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'UTC' }).format(d);
  const monthYear = (d: Date) => new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
  const full = (d: Date) => `${day(d)} ${monthYear(d)}`;

  let range: string;
  if (!e || s.getTime() === e.getTime()) {
    range = full(s);
  } else if (monthYear(s) === monthYear(e)) {
    range = `${day(s)}–${day(e)} ${monthYear(s)}`;
  } else {
    range = `${full(s)} – ${full(e)}`;
  }

  const days =
    typeof totalDays === 'number' && totalDays > 0
      ? totalDays
      : e
        ? Math.round((e.getTime() - s.getTime()) / 86400000) + 1
        : 1;
  return `${range} (${days} ${days === 1 ? 'day' : 'days'})`;
};

const noteBlock = (note?: string | null) =>
  note
    ? `<div style="background:#F6EAD6;border:1px solid #e6d8bf;border-radius:12px;padding:14px 16px;margin-bottom:18px;color:#8a5e1e;"><strong>Note:</strong> ${escapeHtml(note)}</div>`
    : '';

// Send a separate, role-tailored email to each party (admins + submitter + traveler).
const dispatch = async (
  ctx: RequestContext,
  build: (perspective: Perspective) => { subject: string; html: string },
  excludeEmail?: string
) => {
  const admins = await adminRecipients();
  const recipients = uniqueRecipients([...admins, ctx.requesterEmail, ctx.travelerEmail || '']).filter(
    (e) => !excludeEmail || e.toLowerCase() !== excludeEmail.toLowerCase()
  );
  for (const email of recipients) {
    const { subject, html } = build(classify(email, ctx));
    await sendNotification(email, subject, html);
  }
};

export const notifyNewRequest = async (params: {
  requesterName: string;
  requesterEmail: string;
  travelerName: string;
  travelerEmail?: string | null;
  eventName: string;
}) => {
  const rows: [string, string][] = [
    ['Submitted by', params.requesterName],
    ['Traveler', params.travelerName],
    ['Event', params.eventName],
  ];
  await dispatch(params, (p) => {
    if (p === 'approver')
      return {
        subject: `Action Needed: New Travel request for ${params.eventName}`,
        html: shell('A travel request needs your review', `${params.requesterName} submitted a request for ${params.travelerName} to ${params.eventName}.`, rows, '', 'Review request'),
      };
    if (p === 'traveler')
      return {
        subject: `A trip was requested for you — ${params.eventName}`,
        html: shell('A trip was requested for you', `${params.requesterName} submitted a travel request for you to ${params.eventName}. It's now awaiting review.`, rows, '', 'View trip'),
      };
    return {
      subject: `Request submitted: ${params.travelerName} — ${params.eventName}`,
      html: shell('Your travel request was submitted', `Your request for ${params.travelerName} to ${params.eventName} is now with the approvers.`, rows, '', 'View request'),
    };
  });
};

export const notifyStatusChange = async (params: {
  requesterEmail: string;
  travelerEmail?: string | null;
  travelerName: string;
  status: string;
  eventName: string;
  note?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalDays?: number | null;
}) => {
  const rows: [string, string][] = [
    ['Traveler', params.travelerName],
    ['Event', params.eventName],
    ['Status', params.status],
  ];
  const note = noteBlock(params.note);
  const isApproved = params.status.toLowerCase() === 'approved';
  const tripDates = formatTripDates(params.startDate, params.endDate, params.totalDays);

  await dispatch(params, (p) => {
    if (p === 'approver')
      return {
        subject: `${params.status}: ${params.travelerName} — ${params.eventName}`,
        html: shell('Request updated', `The request for ${params.travelerName} to ${params.eventName} is now "${params.status}".`, rows, note, 'Open request'),
      };
    if (p === 'traveler') {
      // On approval, the traveler gets a trip summary with the approved dates and a travel-desk contact.
      if (isApproved) {
        const travelerRows: [string, string][] = [['Event', params.eventName]];
        if (tripDates) travelerRows.push(['Dates', tripDates]);
        const datesLine = tripDates ? `for ${tripDates} — these dates only` : 'for the requested dates only';
        const contact = `<p style="color:#7a7264;line-height:1.6;margin:0 0 18px;">For any travel enquiries, contact ${TRAVEL_CONTACT_NAME} at <a href="mailto:${TRAVEL_CONTACT}" style="color:#2F6F99;text-decoration:none;font-weight:600;">${TRAVEL_CONTACT}</a>.</p>`;
        return {
          subject: `Your trip to ${params.eventName} is approved`,
          html: shell(
            `Your trip to ${params.eventName} is approved`,
            `Your travel to ${params.eventName} is approved ${datesLine}.`,
            travelerRows,
            note + contact,
            'View trip'
          ),
        };
      }
      return {
        subject: `Your trip is ${params.status} — ${params.eventName}`,
        html: shell('Your trip update', `Your trip to ${params.eventName} is now "${params.status}".`, rows, note, 'View trip'),
      };
    }
    return {
      subject: `Your request was ${params.status} — ${params.eventName}`,
      html: shell(`Your request was ${params.status}`, `Your request for ${params.travelerName} to ${params.eventName} is now "${params.status}".`, rows, note, 'View request'),
    };
  });
};

export const notifyNewMessage = async (params: {
  requesterEmail: string;
  travelerEmail?: string | null;
  travelerName: string;
  eventName: string;
  authorName: string;
  authorEmail: string;
  message: string;
}) => {
  const rows: [string, string][] = [
    ['Traveler', params.travelerName],
    ['Event', params.eventName],
  ];
  const messageBlock = `<div style="background:#FAF6EF;border:1px solid rgba(44,40,31,.08);border-radius:12px;padding:14px 16px;margin-bottom:18px;"><p style="margin:0 0 6px;color:#9a9082;font-size:12px;"><strong style="color:#2C281F;">${escapeHtml(params.authorName)}</strong> wrote:</p><p style="margin:0;color:#2C281F;line-height:1.55;">${escapeHtml(params.message)}</p></div>`;
  await dispatch(
    params,
    (p) => {
      const intro =
        p === 'approver'
          ? `New message on the request for ${params.travelerName} to ${params.eventName}.`
          : p === 'traveler'
            ? `New message about your trip to ${params.eventName}.`
            : `New message on your request for ${params.travelerName} to ${params.eventName}.`;
      return { subject: `New message: ${params.travelerName} — ${params.eventName}`, html: shell('New message', intro, rows, messageBlock, 'Reply') };
    },
    params.authorEmail
  );
};
