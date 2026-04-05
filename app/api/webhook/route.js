import { db } from '../../../lib/firebaseAdmin';
import { uploadToDrive } from '../../../lib/googleDrive';
import { Buffer } from 'buffer';

// ==========================================
// 1. 處理 LINE 傳來的 POST 請求 (接收照片與驗證)
// ==========================================
export async function POST(req) {
  try {
    const body = await req.json();
    const events = body.events;

    // 攔截1：如果是空事件，直接回傳 OK
    if (!events || events.length === 0) {
      return Response.json({ status: 'ok' }, { status: 200 });
    }

    const event = events[0];

    // 攔截2：處理 LINE 後台 Verify 按鈕傳來的測試假訊號
    if (event.replyToken === '00000000000000000000000000000000' || event.replyToken === 'ffffffffffffffffffffffffffffffff') {
      return Response.json({ status: 'verify_ok' }, { status: 200 });
    }

    // 正式處理：確認是接收到「圖片」訊息
    if (event.type === 'message' && event.message.type === 'image') {
      const userId = event.source.userId;
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      let points = userDoc.exists ? userDoc.data().points : 3;
      
      // 點數用完的情況
      if (points <= 0) {
        await sendLineMessage(event.replyToken, '今天的點數用完囉！請等待組長補充或明天再來📸');
        return Response.json({ status: 'no_points' }, { status: 200 });
      }

      // 步驟 A: 取得 LINE 照片二進位檔
      const res = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
        headers: { Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` }
      });
      const buffer = Buffer.from(await res.arrayBuffer());

      // 步驟 B: 上傳至 Google Drive
      const fileName = `列印_${userId}_${Date.now()}.jpg`;
      const driveFile = await uploadToDrive(buffer, fileName);

      // 步驟 C: 更新 Firestore 點數與紀錄
      const batch = db.batch();
      batch.set(userRef, { points: points - 1 }, { merge: true });
      
      const newPhotoRef = db.collection('photos').doc();
      batch.set(newPhotoRef, {
        userId,
        driveFileId: driveFile.id,
        status: '待列印',
        createdAt: new Date()
      });
      
      await batch.commit();

      // 步驟 D: 回覆使用者
      await sendLineMessage(event.replyToken, `✅ 照片已存入雲端硬碟！扣除 1 點，剩餘 ${points - 1} 點。\n請點開選單查看進度！`);
    }

    // 確保最後一定回傳 200 給 LINE，否則 LINE 會一直重複發送
    return Response.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    console.error("Webhook Error 發生錯誤:", error);
    // 即使發生錯誤也回傳 200，避免 LINE 伺服器判定失敗
    return Response.json({ error: 'Internal Server Error' }, { status: 200 });
  }
}

// ==========================================
// 2. 處理 GET 請求 (瀏覽器測試用)
// ==========================================
export async function GET() {
  return Response.json({ message: 'Webhook 活著啦！恭喜組長！' }, { status: 200 });
}

// ==========================================
// 3. 輔助發送 LINE 訊息的函式
// ==========================================
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
