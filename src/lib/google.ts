import { google } from "googleapis";
import { JWT } from "google-auth-library";

function getServiceAccountCredentials() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!encoded) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

function createAuthClient(scopes: string[]) {
  const credentials = getServiceAccountCredentials();
  const delegatedUser = process.env.GOOGLE_DELEGATED_USER;

  if (!delegatedUser) {
    throw new Error("GOOGLE_DELEGATED_USER environment variable is not set");
  }

  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes,
    subject: delegatedUser,
  });
}

export function getGmailClient() {
  const auth = createAuthClient([
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ]);
  return google.gmail({ version: "v1", auth });
}

export function getDriveClient() {
  const auth = createAuthClient([
    "https://www.googleapis.com/auth/drive",
  ]);
  return google.drive({ version: "v3", auth });
}

export function getSheetsClient() {
  const auth = createAuthClient([
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
  return google.sheets({ version: "v4", auth });
}

export function getCalendarClient() {
  const auth = createAuthClient([
    "https://www.googleapis.com/auth/calendar",
  ]);
  return google.calendar({ version: "v3", auth });
}
