import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const notificationFromEmail = process.env.NOTIFICATION_FROM_EMAIL;
const senderName = process.env.NOTIFICATION_SENDER_NAME || 'SSV Labs Travel Desk';

const parseEmailList = (value?: string) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const primaryApprovers = parseEmailList(
  process.env.PRIMARY_APPROVER_EMAILS || 'yoav@ssvlabs.io'
);
const watchers = parseEmailList(process.env.NOTIFY_ALL_EMAILS || 'tamar@ssvlabs.io');

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
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('Skipping email: No GOOGLE_REFRESH_TOKEN in .env');
    return;
  }

  try {
    const recipients = uniqueRecipients(Array.isArray(to) ? to : [to]);
    if (recipients.length === 0) {
      console.log('Skipping email: No recipients resolved');
      return;
    }

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${recipients.join(', ')}`,
      ...(notificationFromEmail ? [`From: ${senderName} <${notificationFromEmail}>`] : []),
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

export const notifyNewRequest = async (params: {
  requesterName: string;
  requesterEmail: string;
  travelerName: string;
  travelerEmail?: string | null;
  eventName: string;
}) => {
  const recipients = uniqueRecipients([
    ...primaryApprovers,
    ...watchers,
    params.requesterEmail,
    params.travelerEmail || '',
  ]);

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #0f3d63;">New Travel Request Submitted</h2>
      <p>A travel request has been submitted and is now awaiting review.</p>
      <div style="background: #f3f6fb; padding: 16px; border-radius: 10px; margin: 20px 0;">
        <p><strong>Submitted by:</strong> ${params.requesterName}</p>
        <p><strong>Traveler:</strong> ${params.travelerName}</p>
        <p><strong>Event:</strong> ${params.eventName}</p>
      </div>
      <a href="${frontendUrl}/dashboard" style="display: inline-block; background: #0f3d63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Travel Desk</a>
    </div>
  `;

  await sendNotification(recipients, `Travel Request: ${params.travelerName} - ${params.eventName}`, html);
};

export const notifyStatusChange = async (params: {
  requesterEmail: string;
  travelerEmail?: string | null;
  travelerName: string;
  status: string;
  eventName: string;
}) => {
  const recipients = uniqueRecipients([
    ...primaryApprovers,
    ...watchers,
    params.requesterEmail,
    params.travelerEmail || '',
  ]);

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #0f3d63;">Travel Request Updated</h2>
      <p>The request for <strong>${params.travelerName}</strong> has been updated.</p>
      <p><strong>Event:</strong> ${params.eventName}</p>
      <p style="font-size: 18px;"><strong>Status:</strong> ${params.status}</p>
      <a href="${frontendUrl}/dashboard" style="display: inline-block; background: #0f3d63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Request</a>
    </div>
  `;

  await sendNotification(recipients, `Travel Request ${params.status}: ${params.travelerName}`, html);
};
