import { db } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 辨別是要抓 photos, users 還是單一 member

  try {
    // 1. 列印區：抓取所有待列印照片
    if (type === 'photos') {
      const snapshot = await db.collection('photos').where('status', '==', '待列印').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return Response.json({ photos: data });
    }

    // 2. 用戶區：列出所有用戶
    if (type === 'users') {
      const snapshot = await db.collection('users').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return Response.json({ users: data });
    }

    // 3. 會員區：根據掃描到的 ID 抓取特定用戶點數
    if (type === 'member') {
      const userId = searchParams.get('userId');
      const doc = await db.collection('users').doc(userId).get();
      if (!doc.exists) return Response.json({ error: '找不到用戶' }, { status: 404 });
      return Response.json({ userId: doc.id, ...doc.data() });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { action, photoId, userId, amount } = await req.json();

    // 動作：標記已列印並刪除紀錄
    if (action === 'delete_photo') {
      await db.collection('photos').doc(photoId).delete();
      return Response.json({ success: true });
    }

    // 動作：加點或扣點
    if (action === 'update_points') {
      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();
      const currentPoints = doc.exists ? doc.data().points : 0;
      const newPoints = currentPoints + amount;
      await userRef.set({ points: Math.max(0, newPoints) }, { merge: true });
      return Response.json({ success: true, newPoints });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'Server Error' }, { status: 500 });
  }
}
