import { db } from '../../../lib/firebaseAdmin';
import { uploadToDrive } from '../../../lib/googleDrive';
import { Buffer } from 'buffer';

export async function POST(req) {
  try {
    const body = await req.json();
    const events = body.events;

    if (!events || events.length === 0) return Response.json({ status: 'ok' }, { status: 200 });

    // 🌟 改變 1：使用 Promise.all 同時處理 LINE 傳來的多張照片事件
    await Promise.all(events.map(async (event) => {
      // 略過驗證用的 Dummy Token
      if (event.replyToken === '00000000000000000000000000000000' || event.replyToken === 'ffffffffffffffffffffffffffffffff') {
        return;
      }

      if (event.type === 'message' && event.message.type === 'image') {
        const userId = event.source.userId;
        const userRef = db.collection('users').doc(userId);

        // 🌟 改變 2：使用 Firestore Transaction (交易鎖) 確保扣點排隊進行，解決重複點數的問題
        const txResult = await db.runTransaction(async (t) => {
          const userDoc = await t.get(userRef);
          const points = userDoc.exists ? userDoc.data().points : 3;

          if (points <= 0) {
            return { allowed: false };
          }

          const newPoints = points - 1;
          t.set(userRef, { points: newPoints }, { merge: true });
          return { allowed: true, newPoints };
        });

        // 如果點數不足，直接擋下並通知
        if (!txResult.allowed) {
          await sendLineMessage(event.replyToken, '今天的點數用完囉！請等待組長補充或明天再來📸');
          return;
        }

        // 🌟 改變 3：確定扣點成功後，才開始耗時的 Google Drive 上傳動作
        try {
          const res = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
            headers: { Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` }
          });
          const buffer = Buffer.from(await res.arrayBuffer());
          const fileName = `列印_${userId}_${Date.now()}.jpg`;
          const driveFile = await uploadToDrive(buffer, fileName);

          // 照片與日誌寫入
          const batch = db.batch();
          batch.set(db.collection('photos').doc(), { userId, driveFileId: driveFile.id, status: '待列印', createdAt: new Date() });
          batch.set(db.collection('pointLogs').doc(), { userId, action: '上傳照片扣點', amount: 1, balance: txResult.newPoints, createdAt: new Date() });
          await batch.commit();

          await sendLineMessage(event.replyToken, `✅ 照片已存入雲端！扣除 1 點，剩餘 ${txResult.newPoints} 點。\n請點開選單查看進度！`);
        } catch (err) {
          console.error("Drive Upload Error:", err);
          // 🌟 改變 4：如果上傳雲端失敗，啟動「退款機制」把點數還給同學
          await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            const current = doc.exists ? doc.data().points : 0;
            t.set(userRef, { points: current + 1 }, { merge: true });
          });
          await sendLineMessage(event.replyToken, `❌ 照片上傳雲端失敗，已退還 1 點。請稍後重新傳送！`);
        }
      }
    }));

    return Response.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 200 });
  }
}

// 發送 LINE 訊息的輔助函式
async function sendLineMessage(replyToken, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] })
  });
}
