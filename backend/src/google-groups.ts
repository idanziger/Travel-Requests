import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const KEY_FILE = path.join(__dirname, '../service-account.json');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export const checkGroupMembership = async (userEmail: string, groupEmail: string): Promise<boolean> => {
  try {
    const auth = new google.auth.JWT({
      keyFile: KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/admin.directory.group.member.readonly'],
      subject: ADMIN_EMAIL,
    });

    // Use the simplest possible initialization
    const admin = google.admin('v1');
    
    const response = await admin.members.hasMember({
      groupKey: groupEmail,
      memberKey: userEmail,
      auth: auth // Pass auth here directly
    });
    
    return response.data.isMember || false;
  } catch (error: any) {
    if (error.code === 404) return false;
    console.error('GOOGLE API ERROR:', error.message);
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

  return null;
};
