import { db } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
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
    // 🌟 新增：取得系統設定
    if (type === 'settings') {
      const doc = await db.collection('system').doc('settings').get();
      if (!doc.exists) {
        await db.collection('system').doc('settings').set({ filmCount: 100, isPaused: false });
        return Response.json({ filmCount: 100, isPaused: false });
      }
      return Response.json(doc.data());
    }
    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) { return Response.json({ error: 'Server Error' }, { status: 500 }); }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    // 🌟 新增：更新系統設定
    if (action === 'update_settings') {
      await db.collection('system').doc('settings').set({ filmCount: body.filmCount, isPaused: body.isPaused }, { merge: true });
      return Response.json({ success: true });
    }

    if (action === 'delete_photo') {
      const photoDoc = await db.collection('photos').doc(body.photoId).get();
      if (photoDoc.exists) {
        const { userId, driveFileId } = photoDoc.data();
        await db.collection('photos').doc(body.photoId).delete();
        
        // 網頁端按完成，一樣發送包含縮圖的圖文訊息
        try {
          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` },
            body: JSON.stringify({ 
              to: userId, 
              messages: [
                { type: 'text', text: '✅ 你的照片已經成功印出來囉！快來找資訊組長拿吧！' },
                { type: 'flex', altText: '照片列印完成', contents: { type: 'bubble', hero: { type: 'image', url: `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w800`, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' } } }
              ] 
            })
          });
        } catch(e) { console.error(e); }
      }
      return Response.json({ success: true });
    }

    if (action === 'update_points') {
      const userRef = db.collection('users').doc(body.userId);
      const doc = await userRef.get();
      const currentPoints = doc.exists ? doc.data().points : 0;
      const newPoints = Math.max(0, currentPoints + body.amount);
      
      const batch = db.batch();
      batch.set(userRef, { points: newPoints }, { merge: true });
      batch.set(db.collection('pointLogs').doc(), { userId: body.userId, action: body.amount > 0 ? '管理員加點' : '管理員扣點', amount: Math.abs(body.amount), balance: newPoints, createdAt: new Date() });
      await batch.commit();

      return Response.json({ success: true, newPoints });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) { return Response.json({ error: 'Server Error' }, { status: 500 }); }
}
