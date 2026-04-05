import { db } from '../../../lib/firebaseAdmin';
import { uploadToDrive } from '../../../lib/googleDrive';
import { Buffer } from 'buffer';

export async function POST(req) {
  try {
    const body = await req.json();
    const events = body.events;

    if (!events || events.length === 0) return Response.json({ status: 'ok' }, { status: 200 });

    const event = events[0];
    if (event.replyToken === '00000000000000000000000000000000' || event.replyToken === 'ffffffffffffffffffffffffffffffff') {
      return Response.json({ status: 'verify_ok' }, { status: 200 });
    }

    if (event.type === 'message' && event.message.type === 'image') {
      const userId = event.source.userId;
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      let points = userDoc.exists ? userDoc.data().points : 3;
      
      if (points <= 0) {
        await sendLineMessage(event.replyToken, '今天的點數用完囉！請等待組長補充或明天再來📸');
        return Response.json({ status: 'no_points' }, { status: 200 });
      }

      // 取得照片並上傳 Drive
      const res = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
        headers: { Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` }
      });
      const buffer = Buffer.from(await res.arrayBuffer());
      const fileName = `列印_${userId}_${Date.now()}.jpg`;
      const driveFile = await uploadToDrive(buffer, fileName);

      // 扣點、新增照片、🌟 新增點數異動紀錄
      const batch = db.batch();
      batch.set(userRef, { points: points - 1 }, { merge: true });
      
      const newPhotoRef = db.collection('photos').doc();
      batch.set(newPhotoRef, { userId, driveFileId: driveFile.id, status: '待列印', createdAt: new Date() });
      
      const newLogRef = db.collection('pointLogs').doc();
      batch.set(newLogRef, { userId, action: '上傳照片扣點', amount: 1, balance: points - 1, createdAt: new Date() });
      
      await batch.commit();

      await sendLineMessage(event.replyToken, `✅ 照片已存入雲端硬碟！扣除 1 點，剩餘 ${points - 1} 點。\n請點開選單查看進度！`);
    }
    return Response.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 200 });
  }
}

async function sendLineMessage(replyToken, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] })
  });
}
