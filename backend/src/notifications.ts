import { google } from 'googleapis';
import dotenv from 'dotenv';
import { getGroupMemberEmails } from './google-groups';

dotenv.config({ path: '../.env' });

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const adminGroupEmail = process.env.ADMIN_GROUP_EMAIL || 'travel-app-admins@ssvlabs.io';
const notificationFromEmail = process.env.NOTIFICATION_FROM_EMAIL;
const senderName = process.env.NOTIFICATION_SENDER_NAME || 'SSV Labs Travel Desk';

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

export const sendNotification = async (to: string | string[], subject: string, html: string) => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('Skipping email: No GOOGLE_REFRESH_TOKEN in .env');
    return;
  }

  try {
    const recipients = Array.isArray(to) ? to : [to];
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
    const message = messageParts.join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    console.log(`Gmail API: Notification sent to ${recipients.join(', ')}`);
  } catch (error) {
    console.error('Gmail API Error:', error);
  }
};

export const notifyNewRequest = async (requesterName: string, travelerName: string, event: string) => {
  const adminRecipients = await getGroupMemberEmails(adminGroupEmail);
  const fallbackRecipient = process.env.APPROVER_EMAIL;
  const recipients =
    adminRecipients.length > 0
      ? adminRecipients
      : fallbackRecipient
        ? [fallbackRecipient]
        : [];

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">Travel Approval Needed</h2>
      <p>A new request has been created and requires your review.</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Submitted By:</strong> ${requesterName}</p>
        <p><strong>Traveler:</strong> ${travelerName}</p>
        <p><strong>Event:</strong> ${event}</p>
      </div>
      <a href="${frontendUrl}/dashboard" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review on Travel Board</a>
    </div>
  `;
  await sendNotification(recipients, `Approval Needed: ${travelerName} - ${event}`, html);
};

export const notifyStatusChange = (requesterEmail: string, travelerName: string, status: string) => {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">Travel Request Updated</h2>
      <p>The status of the travel request for <strong>${travelerName}</strong> has been updated.</p>
      <p style="font-size: 18px;">New Status: <strong style="color: #4f46e5; text-transform: uppercase;">${status}</strong></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <a href="${frontendUrl}/dashboard" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Details</a>
    </div>
  `;
  sendNotification(requesterEmail, `Travel Update: ${status}`, html);
};
