import { db } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); 

  try {
    // 抓取待列印照片
    if (type === 'photos') {
      const snapshot = await db.collection('photos').where('status', '==', '待列印').get();
      return Response.json({ photos: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    }
    // 抓取全校用戶
    if (type === 'users') {
      const snapshot = await db.collection('users').get();
      return Response.json({ users: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    }
    // 掃描條碼抓取特定用戶
    if (type === 'member') {
      const userId = searchParams.get('userId');
      const doc = await db.collection('users').doc(userId).get();
      if (!doc.exists) return Response.json({ error: '找不到用戶' }, { status: 404 });
      return Response.json({ userId: doc.id, ...doc.data() });
    }
    // 抓取系統設定
    if (type === 'settings') {
      const doc = await db.collection('system').doc('settings').get();
      if (!doc.exists) {
        const defaultSettings = { filmCount: 100, isPaused: false, autoCleanupDays: 3, isCleanupEnabled: false };
        await db.collection('system').doc('settings').set(defaultSettings);
        return Response.json(defaultSettings);
      }
      return Response.json(doc.data());
    }
    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) { 
    return Response.json({ error: 'Server Error' }, { status: 500 }); 
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    // 更新系統設定
    if (action === 'update_settings') {
      await db.collection('system').doc('settings').set({ 
        filmCount: body.filmCount, 
        isPaused: body.isPaused,
        autoCleanupDays: body.autoCleanupDays || 3,
        isCleanupEnabled: body.isCleanupEnabled || false
      }, { merge: true });
      return Response.json({ success: true });
    }

    // 🌟 完成列印並發送 LINE 推播 (網頁端觸發)
    if (action === 'delete_photo') {
      const photoDoc = await db.collection('photos').doc(body.photoId).get();
      if (photoDoc.exists) {
        const { userId, driveFileId } = photoDoc.data();
        await db.collection('photos').doc(body.photoId).delete(); // 從資料庫移除
        
        // 透過 LINE Messaging API 發送精美縮圖通知給該學生 (加入 action 讓圖片可點擊)
        try {
          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` },
            body: JSON.stringify({ 
              to: userId, 
              messages: [
                { type: 'text', text: '✅ 你的照片已經成功印出來囉！快來找資訊組長拿吧！' },
                { 
                  type: 'flex', 
                  altText: '照片列印完成', 
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
              ] 
            })
          });
        } catch(e) { console.error("LINE Push Error:", e); }
      }
      return Response.json({ success: true });
    }

    // 手動加減點數
    if (action === 'update_points') {
      const userRef = db.collection('users').doc(body.userId);
      const doc = await userRef.get();
      const currentPoints = doc.exists ? doc.data().points : 0;
      const newPoints = Math.max(0, currentPoints + body.amount);
      
      const batch = db.batch();
      batch.set(userRef, { points: newPoints }, { merge: true });
      batch.set(db.collection('pointLogs').doc(), { 
        userId: body.userId, 
        action: body.amount > 0 ? '管理員加點' : '管理員扣點', 
        amount: Math.abs(body.amount), 
        balance: newPoints, 
        createdAt: new Date() 
      });
      await batch.commit();

      return Response.json({ success: true, newPoints });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) { 
    return Response.json({ error: 'Server Error' }, { status: 500 }); 
  }
}
