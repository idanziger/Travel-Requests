import { google, admin_directory_v1 } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '../.env' });

const KEY_FILE = path.join(__dirname, '../service-account.json');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const AUTH_MODE = process.env.AUTH_MODE || 'google-groups';
const ADMIN_GROUP = process.env.ADMIN_GROUP_EMAIL || 'travel-app-admins@ssvlabs.io';
const USER_GROUP = process.env.USER_GROUP_EMAIL || 'travel-app-user@ssvlabs.io';

const parseEmailList = (value?: string) =>
  new Set(
    (value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );

const managerAllowlist = parseEmailList(process.env.ALLOWED_MANAGER_EMAILS);
const employeeAllowlist = parseEmailList(process.env.ALLOWED_EMPLOYEE_EMAILS);

const createDirectoryClient = () => {
  if (!ADMIN_EMAIL) {
    throw new Error('ADMIN_EMAIL is not configured');
  }

  const auth = new google.auth.JWT({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/admin.directory.group.member.readonly'],
    subject: ADMIN_EMAIL,
  });

  return google.admin({ version: 'directory_v1', auth });
};

const getAllowlistedRole = (email: string) => {
  const normalizedEmail = email.toLowerCase();

  if (managerAllowlist.has(normalizedEmail)) {
    return 'admin';
  }

  if (employeeAllowlist.has(normalizedEmail)) {
    return 'employee';
  }

  return null;
};

const canUseGoogleGroups = () => {
  return Boolean(ADMIN_EMAIL && fs.existsSync(KEY_FILE));
};

export const checkGroupMembership = async (userEmail: string, groupEmail: string): Promise<boolean> => {
  try {
    const admin = createDirectoryClient();
    
    const response = await admin.members.hasMember({
      groupKey: groupEmail,
      memberKey: userEmail,
    });
    
    return response.data.isMember || false;
  } catch (error: any) {
    if (error.code === 404) return false;
    console.error('GOOGLE API ERROR:', error.message || error);
    return false;
  }
};

export const getUserRoleFromGroups = async (email: string) => {
  if (AUTH_MODE === 'email-allowlist') {
    return getAllowlistedRole(email);
  }

  if (!canUseGoogleGroups()) {
    console.warn('Google group auth unavailable, falling back to email allowlist');
    return getAllowlistedRole(email);
  }

  const isAdmin = await checkGroupMembership(email, ADMIN_GROUP);
  if (isAdmin) return 'admin';

  const isUser = await checkGroupMembership(email, USER_GROUP);
  if (isUser) return 'employee';

  return getAllowlistedRole(email);
};

export const getGroupMemberEmails = async (groupEmail: string): Promise<string[]> => {
  try {
    if (!canUseGoogleGroups()) {
      return [];
    }

    const admin = createDirectoryClient();
    const members: string[] = [];
    let pageToken: string | undefined;

    do {
      const params: admin_directory_v1.Params$Resource$Members$List = {
        groupKey: groupEmail,
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await admin.members.list(params);

      const pageMembers =
        response.data.members
          ?.map((member: admin_directory_v1.Schema$Member) => member.email?.toLowerCase())
          .filter((email: string | undefined): email is string => Boolean(email)) || [];

      members.push(...pageMembers);
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return [...new Set(members)];
  } catch (error: any) {
    console.error('GOOGLE API ERROR:', error.message || error);
    return [];
  }
};

export const debugGroupMembership = async (email: string) => {
  const adminMember = await checkGroupMembership(email, ADMIN_GROUP);
  const userMember = await checkGroupMembership(email, USER_GROUP);
  const allowlistRole = getAllowlistedRole(email);

  return {
    email,
    adminGroup: ADMIN_GROUP,
    userGroup: USER_GROUP,
    adminMember,
    userMember,
    allowlistRole,
    resolvedRole: adminMember ? 'admin' : userMember ? 'employee' : allowlistRole,
  };
};

export const debugListGroupMembers = async (groupEmail: string) => {
  const members = await getGroupMemberEmails(groupEmail);

  return {
    groupEmail,
    count: members.length,
    members,
  };
};
