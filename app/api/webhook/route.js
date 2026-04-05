import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 });

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const points = userDoc.exists ? userDoc.data().points : 3;

    const photosSnapshot = await db.collection('photos')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const logs = photosSnapshot.docs.map(doc => ({
      id: doc.id,
      status: doc.data().status,
      createdAt: doc.data().createdAt.toDate().toISOString()
    }));

    return Response.json({ points, logs });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Server Error' }, { status: 500 });
  }
}
