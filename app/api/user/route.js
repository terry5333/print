import { db } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return Response.json({ error: '缺少 UserID' }, { status: 400 });

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const points = userDoc.exists ? userDoc.data().points : 3;

    const photosSnapshot = await db.collection('photos')
      .where('userId', '==', userId)
      .get();
    
    const logs = photosSnapshot.docs.map(doc => ({
      id: doc.id,
      driveFileId: doc.data().driveFileId,
      status: doc.data().status,
      createdAt: doc.data().createdAt.toDate().toISOString()
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return Response.json({ points, logs }, { status: 200 });
  } catch (error) {
    console.error("User API Error:", error);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// 接收前端傳來的 LINE 個資並存入資料庫
export async function POST(req) {
  try {
    const { userId, displayName, pictureUrl } = await req.json();
    if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 });

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // 新同學：給 3 點並存入個資
      await userRef.set({ points: 3, displayName, pictureUrl });
    } else {
      // 舊同學：更新個資 (保留原本點數)
      await userRef.set({ displayName, pictureUrl }, { merge: true });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
