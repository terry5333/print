import { db } from '../../../lib/firebaseAdmin';
import { uploadToDrive } from '../../../lib/googleDrive';
import { Buffer } from 'buffer';

export async function POST(req) {
  try {
    const body = await req.json();
    const events = body.events;

    if (!events || events.length === 0) return Response.json({ status: 'ok' }, { status: 200 });

    // 👑 你的 LINE ID (接收圖文訊息用)
    const ADMIN_ID = "U504c5a2721f2c5345b538137d3e0f66d"; 

    await Promise.all(events.map(async (event) => {
      if (event.replyToken === '00000000000000000000000000000000' || event.replyToken === 'ffffffffffffffffffffffffffffffff') return;

      // ==========================================
      // 🌟 動作一：處理管理員在 LINE 點擊「完成列印」按鈕
      // ==========================================
      if (event.type === 'postback') {
        const data = new URLSearchParams(event.postback.data);
        if (data.get('action') === 'complete_photo') {
          const photoId = data.get('photoId');
          const photoDoc = await db.collection('photos').doc(photoId).get();
          
          if (photoDoc.exists) {
            const { userId, driveFileId } = photoDoc.data();
            await db.collection('photos').doc(photoId).delete(); // 刪除佇列
            
            // 發送精美圖文訊息給學生 (加入 action 讓圖片可點擊)
            await pushMessage(userId, [
              { type: 'text', text: '✅ 你的照片已經成功印出來囉！快來找資訊組長拿吧！' },
              {
                type: 'flex', altText: '照片列印完成',
                contents: {
                  type: 'bubble',
                  hero: { 
                    type: 'image', 
                    url: `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w800`, 
                    size: 'full', 
                    aspectRatio: '1:1', 
                    aspectMode: 'cover',
                    action: { type: 'uri', uri: `https://drive.google.com/file/d/${driveFileId}/view` }
                  }
                }
              }
            ]);
            // 回覆管理員
            await replyMessage(event.replyToken, '✅ 已將此照片標記為完成，並發送縮圖通知該學生！');
          } else {
            await replyMessage(event.replyToken, '❌ 找不到此照片，可能已經在網頁版被處理過了。');
          }
        }
        return;
      }

      // ==========================================
      // 🌟 動作二：處理學生上傳照片
      // ==========================================
      if (event.type === 'message' && event.message.type === 'image') {
        const userId = event.source.userId;
        
        // 1. 讀取系統設定 (暫停與底片)
        const sysRef = db.collection('system').doc('settings');
        const userRef = db.collection('users').doc(userId);

        const txResult = await db.runTransaction(async (t) => {
          const sDoc = await t.get(sysRef);
          const uDoc = await t.get(userRef);
          
          const sysData = sDoc.exists ? sDoc.data() : { isPaused: false, filmCount: 100 };
          const points = uDoc.exists ? uDoc.data().points : 3;
          
          if (sysData.isPaused) return { allowed: false, reason: 'paused' };
          if (sysData.filmCount <= 0) return { allowed: false, reason: 'no_film' };
          if (points <= 0) return { allowed: false, reason: 'no_points' };

          // 同時扣除點數與底片
          t.set(userRef, { points: points - 1 }, { merge: true });
          t.set(sysRef, { filmCount: sysData.filmCount - 1 }, { merge: true });
          
          return { allowed: true, newPoints: points - 1, userName: uDoc.exists ? uDoc.data().displayName : '未知用戶' };
        });

        // 阻擋訊息回覆
        if (!txResult.allowed) {
          if (txResult.reason === 'paused') await replyMessage(event.replyToken, '⚠️ 系統目前「暫停接收」列印請求喔！請稍後再試。');
          if (txResult.reason === 'no_film') await replyMessage(event.replyToken, '⚠️ 哎呀！相印機的「底片已經用完」囉！請呼叫組長補充底片。');
          if (txResult.reason === 'no_points') await replyMessage(event.replyToken, '今天的點數用完囉！請等待組長補充或明天再來📸');
          return;
        }

        // 2. 上傳 Google Drive 與寫入資料庫
        try {
          const res = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, { headers: { Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` } });
          const buffer = Buffer.from(await res.arrayBuffer());
          const driveFile = await uploadToDrive(buffer, `列印_${userId}_${Date.now()}.jpg`);

          const newPhotoRef = db.collection('photos').doc();
          const batch = db.batch();
          batch.set(newPhotoRef, { userId, driveFileId: driveFile.id, status: '待列印', createdAt: new Date() });
          batch.set(db.collection('pointLogs').doc(), { userId, action: '上傳照片扣點', amount: 1, balance: txResult.newPoints, createdAt: new Date() });
          await batch.commit();

          await replyMessage(event.replyToken, `✅ 照片已存入雲端！扣除 1 點，剩餘 ${txResult.newPoints} 點。`);

          // 🌟 3. 發送 Flex Message 給管理員 (加入 action 讓圖片可點擊)
          await pushMessage(ADMIN_ID, [{
            type: 'flex', altText: '📸 新的列印任務',
            contents: {
              type: 'bubble',
              hero: { 
                type: 'image', 
                url: `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w800`, 
                size: 'full', 
                aspectRatio: '4:3', 
                aspectMode: 'cover',
                action: { type: 'uri', uri: `https://drive.google.com/file/d/${driveFile.id}/view` }
              },
              body: {
                type: 'box', layout: 'vertical',
                contents: [
                  { type: 'text', text: '📸 新的列印任務', weight: 'bold', size: 'xl' },
                  { type: 'text', text: `上傳者: ${txResult.userName}`, size: 'sm', color: '#666666', margin: 'md' }
                ]
              },
              footer: {
                type: 'box', layout: 'vertical', spacing: 'sm',
                contents: [{
                  type: 'button', style: 'primary', color: '#10b981',
                  action: { type: 'postback', label: '✅ 完成列印', data: `action=complete_photo&photoId=${newPhotoRef.id}` }
                }]
              }
            }
          }]);

        } catch (err) {
          console.error("Drive Upload Error:", err);
          // 退還點數與底片
          await db.runTransaction(async (t) => {
            const u = await t.get(userRef); const s = await t.get(sysRef);
            t.set(userRef, { points: (u.data()?.points || 0) + 1 }, { merge: true });
            t.set(sysRef, { filmCount: (s.data()?.filmCount || 0) + 1 }, { merge: true });
          });
          await replyMessage(event.replyToken, `❌ 雲端上傳失敗，已自動退還點數與底片，請稍後重新傳送！`);
        }
      }
    }));

    return Response.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    return Response.json({ error: 'Internal Server Error' }, { status: 200 });
  }
}

async function replyMessage(replyToken, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] })
  });
}
async function pushMessage(to, messages) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` },
    body: JSON.stringify({ to, messages })
  });
}
