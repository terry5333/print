'use client';
import { useEffect, useState } from 'react';
import liff from '@line/liff';

export default function LiffPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const ADMIN_ID = "U504c5a2721f2c5345b538137d3e0f66d"; // 只有這個 ID 看到管理介面

  useEffect(() => {
    liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID }).then(async () => {
      if (!liff.isLoggedIn()) liff.login();
      const profile = await liff.getProfile();
      if (profile.userId === ADMIN_ID) setIsAdmin(true);
      // ...其餘原本的載入邏輯
    });
  }, []);

  // 管理員專用的掃描功能
  const handleScan = async () => {
    const result = await liff.scanCodeV2(); // 啟動 LINE 內建掃描器
    const targetUserId = result.value;
    
    // 呼叫我們之前寫好的 /api/admin 進行扣點
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId, action: 'deduct' })
    });
    const data = await res.json();
    alert(data.success ? `成功！剩餘點數：${data.newPoints}` : `失敗：${data.error}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {isAdmin ? (
        // 管理員看到的介面
        <div className="text-center">
          <h1 className="text-2xl font-bold text-cyan-400 mb-8">組長專屬管理台</h1>
          <button 
            onClick={handleScan}
            className="w-full bg-cyan-500 py-10 rounded-3xl text-2xl font-black shadow-lg shadow-cyan-500/50"
          >
            📸 點我掃描同學 QR Code
          </button>
        </div>
      ) : (
        // 同學看到的原本介面 (點數卡)
        <div>
          {/* 原本的點數卡 UI... */}
        </div>
      )}
    </div>
  );
}
