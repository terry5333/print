import { db } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // ... (這裡的 GET 函式完全不動，保留原本的邏輯)
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); 
  try {
    if (type === 'photos') {
      const snapshot = await db.collection('photos').where('status', '==', '待列印').get();
      return Response.json({ photos: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    }
    if (type === 'users') {
      const snapshot = await db.collection('users').get();
      return Response.json({ users: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    }
    if (type === 'member') {
      const userId = searchParams.get('userId');
      const doc = await db.collection('users').doc(userId).get();
      if (!doc.exists) return Response.json({ error: '找不到用戶' }, { status: 404 });
      return Response.json({ userId: doc.id, ...doc.data() });
    }
    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) { return Response.json({ error: 'Server Error' }, { status: 500 }); }
}

export async function POST(req) {
  try {
    const { action, photoId, userId, amount } = await req.json();

    // 🌟 動作 1：完成照片並發送通知
    if (action === 'delete_photo') {
      const photoDoc = await db.collection('photos').doc(photoId).get();
      if (photoDoc.exists) {
        const uid = photoDoc.data().userId;
        await db.collection('photos').doc(photoId).delete();
        
        // 發送 LINE 推播通知
        try {
          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` },
            body: JSON.stringify({ to: uid, messages: [{ type: 'text', text: '✅ 你的照片已經成功印出來囉！快來找資訊組長拿吧！' }] })
          });
        } catch(e) { console.error('通知發送失敗', e); }
      }
      return Response.json({ success: true });
    }

    // 🌟 動作 2：加點或扣點，並寫入紀錄
    if (action === 'update_points') {
      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();
      const currentPoints = doc.exists ? doc.data().points : 0;
      const newPoints = Math.max(0, currentPoints + amount);
      
      const batch = db.batch();
      batch.set(userRef, { points: newPoints }, { merge: true });
      batch.set(db.collection('pointLogs').doc(), { 
        userId, 
        action: amount > 0 ? '管理員加點' : '管理員扣點', 
        amount: Math.abs(amount), 
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
