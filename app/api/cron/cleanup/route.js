// ✅ 正確的層級（退回 4 層找到 lib）
import { db } from '../../../../lib/firebaseAdmin';
// Vercel Cron Job 每晚執行
export const dynamic = 'force-dynamic';

export async function GET(req) {
  // 為了安全，檢查自定義的 Secret Token (在 Vercel 環境變數設定)
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sysDoc = await db.collection('system').doc('settings').get();
    const { autoCleanupDays, isCleanupEnabled } = sysDoc.data() || { autoCleanupDays: 3, isCleanupEnabled: false };

    if (!isCleanupEnabled) return Response.json({ status: 'Cleanup disabled' });

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - autoCleanupDays);

    // 找出所有早於保留期限的照片 (不論狀態)
    const oldPhotos = await db.collection('photos').where('createdAt', '<', threshold).get();
    
    let deletedCount = 0;
    for (const doc of oldPhotos.docs) {
      const { driveFileId } = doc.data();
      
      // 呼叫你的 GAS 刪除雲端檔案 (假設你的 GAS 有實作刪除功能)
      await fetch(`${process.env.GAS_WEBAPP_URL}?action=delete&fileId=${driveFileId}`);
      
      // 刪除 Firebase 紀錄
      await db.collection('photos').doc(doc.id).delete();
      deletedCount++;
    }

    return Response.json({ status: 'success', deletedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
