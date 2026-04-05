import { db, bucket } from '@/lib/firebaseAdmin';
import { Buffer } from 'buffer';

export async function POST(req) {
  const body = await req.json();
  const event = body.events[0];

  if (!event) return Response.json({ status: 'ok' });

  if (event.type === 'message' && event.message.type === 'image') {
    const userId = event.source.userId;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    let points = userDoc.exists ? userDoc.data().points : 3; // 預設 3 點
    
    // 如果沒點數了，回覆並中斷
    if (points <= 0) {
      await sendLineMessage(event.replyToken, '今天的點數用完囉！請等待組長補充或明天再來📸');
      return Response.json({ status: 'no_points' });
    }

    // 取得 LINE 圖片檔案
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
      headers: { Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` }
    });
    const buffer = Buffer.from(await res.arrayBuffer());

    // 存入 Firebase Storage
    const fileName = `grad_trip_prints/${userId}_${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    await file.save(buffer, { contentType: 'image/jpeg' });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '01-01-2030' });

    // 扣點並新增照片紀錄
    const batch = db.batch();
    batch.set(userRef, { points: points - 1, lastActive: new Date() }, { merge: true });
    
    const newPhotoRef = db.collection('photos').doc();
    batch.set(newPhotoRef, {
      userId,
      url,
      status: '待列印',
      createdAt: new Date()
    });
    
    await batch.commit();

    await sendLineMessage(event.replyToken, `✅ 照片已收到！扣除 1 點，剩餘 ${points - 1} 點。\n可點開選單查看進度！`);
  }

  return Response.json({ status: 'ok' });
}

// 輔助發送 LINE 訊息的函式
async function sendLineMessage(replyToken, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: text }]
    })
  });
}
