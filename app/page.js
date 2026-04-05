'use client';
import { useEffect, useState } from 'react';
import liff from '@line/liff';

export default function LiffPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ points: 0, logs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          const profile = await liff.getProfile();
          setUser(profile);
          fetchData(profile.userId);
        }
      } catch (err) {
        console.error('LIFF Init Error:', err);
      }
    };
    initLiff();
  }, []);

  const fetchData = async (userId) => {
    const res = await fetch(`/api/user?userId=${userId}`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">載入中...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <header className="flex items-center space-x-4 mb-8">
        {user?.pictureUrl && <img src={user.pictureUrl} alt="avatar" className="w-16 h-16 rounded-full border-2 border-cyan-400" />}
        <div>
          <h1 className="text-xl font-bold">{user?.displayName}</h1>
          <p className="text-slate-400 text-sm">畢旅列印通行證</p>
        </div>
      </header>

      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 shadow-xl shadow-cyan-500/20 mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-cyan-100 text-sm uppercase tracking-widest font-semibold">剩餘列印點數</p>
          <h2 className="text-6xl font-black mt-2">{data.points}</h2>
        </div>
        <div className="absolute -right-4 -bottom-4 text-white/20 text-9xl font-bold italic">PASS</div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2"></span>
          列印進度追蹤
        </h3>
        <div className="space-y-4">
          {data.logs.length > 0 ? data.logs.map((log, i) => (
            <div key={i} className="flex justify-between items-center border-b border-slate-700 pb-3">
              <div>
                <p className="text-sm text-slate-300">照片 #{log.id.slice(-4)}</p>
                <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('zh-TW')}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                log.status === '已完成' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {log.status}
              </span>
            </div>
          )) : (
            <p className="text-slate-500 text-center py-4">尚無列印紀錄</p>
          )}
        </div>
      </div>
    </div>
  );
}
