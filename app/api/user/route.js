import { db } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return Response.json({ error: '缺少 UserID' }, { status: 400 });

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const points = userDoc.exists ? userDoc.data().points : 3;

    // 抓照片
    const photosSnapshot = await db.collection('photos').where('userId', '==', userId).get();
    const logs = photosSnapshot.docs.map(doc => ({
      id: doc.id,
      driveFileId: doc.data().driveFileId,
      status: doc.data().status,
      createdAt: doc.data().createdAt.toDate().toISOString()
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 🌟 新增：抓點數紀錄
    const pointsSnapshot = await db.collection('pointLogs').where('userId', '==', userId).get();
    const pointLogs = pointsSnapshot.docs.map(doc => ({
      id: doc.id,
      action: doc.data().action,
      amount: doc.data().amount,
      balance: doc.data().balance,
      createdAt: doc.data().createdAt.toDate().toISOString()
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return Response.json({ points, logs, pointLogs }, { status: 200 });
  } catch (error) {
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function POST(req) {
  // ... (POST 個資的邏輯不變)
  try {
    const { userId, displayName, pictureUrl } = await req.json();
    if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 });
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) await userRef.set({ points: 3, displayName, pictureUrl });
    else await userRef.set({ displayName, pictureUrl }, { merge: true });
    return Response.json({ success: true });
  } catch (error) { return Response.json({ error: '伺服器錯誤' }, { status: 500 }); }
}
