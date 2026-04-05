import { db } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return Response.json({ error: '缺少 UserID' }, { status: 400 });

  try {
    // 1. 抓取用戶點數
    const userDoc = await db.collection('users').doc(userId).get();
    const points = userDoc.exists ? userDoc.data().points : 3;

    // 2. 抓取該用戶的照片 (不使用 orderBy 避免索引錯誤)
    const photosSnapshot = await db.collection('photos')
      .where('userId', '==', userId)
      .get();
    
    // 3. 在記憶體中進行排序 (最新上傳的排前面)
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
