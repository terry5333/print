import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: SCOPES,
});

export const drive = google.drive({ version: 'v3', auth });

export async function uploadToDrive(buffer, fileName) {
  const fileMetadata = {
    name: fileName,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
  };
  
  // 將 Buffer 轉換為可讀流
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const media = {
    mimeType: 'image/jpeg',
    body: stream,
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
  });
  
  return file.data;
}
