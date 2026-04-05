import { db } from '../../../lib/firebaseAdmin';

export async function POST(req) {
  try {
    const { userId, action, amount = 1 } = await req.json();
    
    if (!userId) {
      return Response.json({ error: '請提供 User ID' }, { status: 400 });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    // 如果找不到用戶，預設給 3 點再進行加減
    let currentPoints = userDoc.exists ? userDoc.data().points : 3;

    if (action === 'add') currentPoints += amount;
    if (action === 'deduct') currentPoints -= amount;

    await userRef.set({ points: currentPoints }, { merge: true });

    return Response.json({ success: true, newPoints: currentPoints });
  } catch (error) {
    console.error('Admin API Error:', error);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
