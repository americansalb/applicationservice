import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Google Drive not configured: missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY"
    );
  }
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

export type DriveUploadResult = {
  fileId: string;
  webViewLink: string;
};

export async function uploadVideoToDrive(opts: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
}): Promise<DriveUploadResult> {
  const folderId = opts.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error(
      "Google Drive not configured: missing GOOGLE_DRIVE_FOLDER_ID"
    );
  }

  const drive = getDriveClient();
  const stream = Readable.from(opts.buffer);

  const created = await drive.files.create({
    requestBody: {
      name: opts.filename,
      parents: [folderId],
    },
    media: {
      mimeType: opts.mimeType,
      body: stream,
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  if (!fileId) throw new Error("Drive upload returned no file id");

  const webViewLink =
    created.data.webViewLink ||
    `https://drive.google.com/file/d/${fileId}/view`;

  return { fileId, webViewLink };
}
