import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const KEY_FILE = path.join(__dirname, '../service-account.json');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // The admin email to impersonate

const auth = new google.auth.JWT({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/admin.directory.group.member.readonly'],
  subject: ADMIN_EMAIL,
});

const directory = google.admin({ version: 'v1', auth });

export const checkGroupMembership = async (userEmail: string, groupEmail: string): Promise<boolean> => {
  try {
    const response = await directory.members.hasMember({
      groupKey: groupEmail,
      memberKey: userEmail,
    });
    return response.data.isMember || false;
  } catch (error: any) {
    // If the user is not in the group, Google might return a 404
    if (error.code === 404) return false;
    console.error(`Error checking group membership for ${userEmail} in ${groupEmail}:`, error.message);
    return false;
  }
};

export const getUserRoleFromGroups = async (email: string) => {
  const ADMIN_GROUP = 'travel-app-admins@ssvlabs.io';
  const USER_GROUP = 'travel-app-user@ssvlabs.io';

  const isAdmin = await checkGroupMembership(email, ADMIN_GROUP);
  if (isAdmin) return 'manager';

  const isUser = await checkGroupMembership(email, USER_GROUP);
  if (isUser) return 'employee';

  return null; // Not authorized
};
