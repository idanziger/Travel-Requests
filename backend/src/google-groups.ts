import { google, admin_directory_v1 } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '../.env' });

const KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  ? path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_FILE)
  : path.join(__dirname, '../service-account.json');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const AUTH_MODE = process.env.AUTH_MODE || 'google-groups';
const ADMIN_GROUP = process.env.ADMIN_GROUP_EMAIL || 'travel-app-admins@ssvlabs.io';
const USER_GROUP = process.env.USER_GROUP_EMAIL || 'travel-app-user@ssvlabs.io';
const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || 'ssvlabs.io').toLowerCase();

const parseEmailList = (value?: string) =>
  new Set(
    (value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );

const adminAllowlist = parseEmailList(
  process.env.ADMIN_OVERRIDE_EMAILS ||
    'yoav@ssvlabs.io,alon@ssvlabs.io,keren@ssvlabs.io,ilan@ssvlabs.io,ijd_admin@ssvlabs.io'
);
const coordinatorAllowlist = parseEmailList(
  process.env.COORDINATOR_EMAILS || 'tamar@ssvlabs.io'
);
const managerAllowlist = parseEmailList(process.env.MANAGER_OVERRIDE_EMAILS || process.env.ALLOWED_MANAGER_EMAILS);
const employeeAllowlist = parseEmailList(process.env.ALLOWED_EMPLOYEE_EMAILS);

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

let cachedCredentials: ServiceAccountCredentials | null = null;

const getServiceAccountCredentials = (): ServiceAccountCredentials => {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  if (!fs.existsSync(KEY_FILE)) {
    throw new Error(`Google service account file not found at ${KEY_FILE}`);
  }

  const raw = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')) as Partial<ServiceAccountCredentials>;
  if (!raw.client_email || !raw.private_key) {
    throw new Error('Google service account file is missing client_email or private_key');
  }

  cachedCredentials = {
    client_email: raw.client_email,
    private_key: raw.private_key,
  };

  return cachedCredentials;
};

const createDirectoryClient = (
  scopes: string[] = ['https://www.googleapis.com/auth/admin.directory.group.member.readonly']
) => {
  if (!ADMIN_EMAIL) {
    throw new Error('ADMIN_EMAIL is not configured');
  }

  const credentials = getServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes,
    subject: ADMIN_EMAIL,
  });

  return google.admin({ version: 'directory_v1', auth });
};

const getAllowlistedRole = (email: string) => {
  const normalizedEmail = email.toLowerCase();

  if (adminAllowlist.has(normalizedEmail)) {
    return 'admin';
  }

  if (coordinatorAllowlist.has(normalizedEmail)) {
    return 'coordinator';
  }

  if (managerAllowlist.has(normalizedEmail)) {
    return 'manager';
  }

  if (employeeAllowlist.has(normalizedEmail)) {
    return 'employee';
  }

  if (normalizedEmail.endsWith(`@${allowedDomain}`)) {
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
  if (isUser) return 'manager';

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
    resolvedRole: adminMember ? 'admin' : userMember ? 'manager' : allowlistRole,
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

export const searchDirectoryUsers = async (term: string) => {
  const normalizedTerm = term.trim().toLowerCase();

  try {
    if (!canUseGoogleGroups()) {
      return [];
    }

    const admin = createDirectoryClient([
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
    ]);

    const escapedTerm = normalizedTerm.replace(/'/g, "\\'");
    const query =
      normalizedTerm.includes('@')
        ? `email:${escapedTerm}*`
        : escapedTerm;

    const response = await admin.users.list({
      customer: 'my_customer',
      query,
      maxResults: 20,
      orderBy: 'email',
      viewType: 'admin_view',
    });

    const users =
      response.data.users
        ?.filter((user) => {
          const email = user.primaryEmail?.toLowerCase() || '';
          const fullName = user.name?.fullName?.toLowerCase() || '';

          return (
            email.endsWith(`@${allowedDomain}`) &&
            (email.includes(normalizedTerm) || fullName.includes(normalizedTerm))
          );
        })
        .map((user) => ({
          email: user.primaryEmail || '',
          name: user.name?.fullName || user.primaryEmail || '',
        }))
        .filter((user) => Boolean(user.email)) || [];

    return users.slice(0, 20);
  } catch (error: any) {
    console.error(
      'GOOGLE API ERROR:',
      error.message || error,
      error.response?.data?.error_description || ''
    );
    return [];
  }
};
