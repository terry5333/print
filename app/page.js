'use client';
import { useEffect, useState } from 'react';
import liff from '@line/liff';
import QRCode from 'react-qr-code';

export default function LiffPage() {
  const [user, setUser] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [activeTab, setActiveTab] = useState('points');
  const [loading, setLoading] = useState(true);

  // 資料狀態
  const [data, setData] = useState({ points: 0, logs: [] });
  const [adminPhotos, setAdminPhotos] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [scannedUser, setScannedUser] = useState(null);

  // 👑 最高管理員 ID 
  const ADMIN_ID = "U504c5a2721f2c5345b538137d3e0f66d"; 

  useEffect(() => {
    liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID }).then(async () => {
      if (!liff.isLoggedIn()) liff.login();
      const profile = await liff.getProfile();
      setUser(profile);

      // 偷偷將同學的 LINE 個資存入資料庫
      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl
        })
      });

      if (profile.userId === ADMIN_ID) {
        setIsAdminView(true);
        setActiveTab('admin_print');
        fetchAdminPhotos();
      }
      fetchUserData(profile.userId);
    });
  }, []);

  const fetchUserData = async (uid) => {
    const res = await fetch(`/api/user?userId=${uid}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  const fetchAdminPhotos = async () => {
    const res = await fetch('/api/admin?type=photos');
    if (res.ok) setAdminPhotos((await res.json()).photos);
  };

  const fetchAdminUsers = async () => {
    const res = await fetch('/api/admin?type=users');
    if (res.ok) setAdminUsers((await res.json()).users);
  };

  // ==========================================
  // 👥 用戶分頁組件 (User Views)
  // ==========================================

  const UserPointsTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-2">Available Points</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-8xl font-black">{data.points}</h2>
            <span className="text-xl font-bold opacity-80">pts</span>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
          快速說明
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed">
          在聊天室傳送照片即可自動列印。每張照片消耗 1 點。若點數不足，請向資訊組長領取。
        </p>
      </div>
    </div>
  );

  const UserPhotosTab = () => (
    <div className="space-y-4 pb-24 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-800 px-1">傳送紀錄</h2>
      {data.logs.length > 0 ? data.logs.map((log) => (
        <div key={log.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm active:scale-95 transition-transform">
          <img src={`https://drive.google.com/thumbnail?id=${log.driveFileId}&sz=w200`} className="w-20 h-20 rounded-2xl object-cover bg-slate-50" alt="print" />
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-bold text-slate-400">#{log.id.slice(-4)}</span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${
                log.status === '已完成' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}>{log.status}</span>
            </div>
            <p className="text-slate-700 font-bold text-sm">照片上傳成功</p>
            <p className="text-slate-400 text-[10px] mt-1">{new Date(log.createdAt).toLocaleString('zh-TW')}</p>
          </div>
        </div>
      )) : (
        <div className="py-20 text-center">
          <div className="text-6xl mb-4 opacity-20">📸</div>
          <p className="text-slate-400 font-medium">尚未上傳任何照片</p>
        </div>
      )}
    </div>
  );

  const UserMemberTab = () => (
    <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
      <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-50">
        <div className="relative inline-block mb-6">
          <img src={user?.pictureUrl} className="w-24 h-24 rounded-full border-4 border-white shadow-lg" alt="avatar" />
          <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
        </div>
        <h2 className="text-2xl font-black text-slate-800">{user?.displayName}</h2>
        <p className="text-slate-400 text-xs font-bold tracking-widest mt-1 uppercase">Passport Active</p>
        
        <div className="mt-10 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 inline-block">
          {user?.userId && <QRCode value={user.userId} size={180} level="H" fgColor="#1e293b" />}
        </div>
        <p className="text-[10px] font-mono text-slate-300 mt-6 break-all opacity-50 px-10">{user?.userId}</p>
      </div>
    </div>
  );

  // ==========================================
  // 👑 管理員分頁組件 (Admin Views)
  // ==========================================

  const AdminPrintingTab = () => (
    <div className="space-y-6 pb-32">
      <div className="flex justify-between items-end px-1">
        <h2 className="text-2xl font-black text-slate-800">待列印佇列</h2>
        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{adminPhotos.length} 張</span>
      </div>
      {adminPhotos.map(photo => (
        <div key={photo.id} className="bg-white rounded-[2rem] overflow-hidden shadow-md border border-slate-100">
          <img src={`https://drive.google.com/thumbnail?id=${photo.driveFileId}&sz=w800`} className="w-full h-64 object-contain bg-black" />
          <div className="p-5 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-400">UserID: {photo.userId?.slice(0, 8)}...</p>
              <p className="text-xs text-slate-300 mt-1">{new Date(photo.createdAt).toLocaleTimeString()}</p>
            </div>
            <button 
              onClick={async () => {
                await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'delete_photo', photoId: photo.id })});
                fetchAdminPhotos();
              }}
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-black active:scale-90 transition-transform"
            >
              完成列印
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const AdminUsersTab = () => (
    <div className="space-y-4 pb-24">
      <h2 className="text-2xl font-black text-slate-800 px-1">用戶點數總覽</h2>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {adminUsers.map(u => (
          <div key={u.id} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              {u.pictureUrl ? (
                <img src={u.pictureUrl} className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-100" />
              ) : (
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-lg shadow-sm border border-slate-50">👤</div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700 truncate w-32">{u.displayName || '未開通通行證'}</span>
                <span className="text-[10px] font-mono text-slate-400 truncate w-32">{u.id}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full">
              <span className="text-lg font-black text-blue-600">{u.points}</span>
              <span className="text-[10px] font-bold text-blue-400 uppercase">pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AdminMemberTab = () => (
    <div className="space-y-6 text-center pb-24">
      <h2 className="text-2xl font-black text-slate-800">快速核點器</h2>
      {!scannedUser ? (
        <button 
          onClick={async () => {
            try {
              const res = await liff.scanCodeV2();
              const userRes = await fetch(`/api/admin?type=member&userId=${res.value}`);
              if (userRes.ok) setScannedUser(await userRes.json());
            } catch(e) { console.log('Scan Cancelled or Error'); }
          }}
          className="w-full bg-indigo-600 text-white py-12 rounded-[3rem] text-2xl font-black shadow-2xl shadow-indigo-200 active:scale-95 transition-all"
        >
          📸 點擊啟動掃描
        </button>
      ) : (
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-50 animate-in zoom-in-95">
          {scannedUser.pictureUrl && <img src={scannedUser.pictureUrl} className="w-20 h-20 rounded-full mx-auto mb-4 shadow-md" />}
          <h3 className="text-xl font-bold text-slate-800 mb-2">{scannedUser.displayName || '未知用戶'}</h3>
          <p className="text-[10px] font-mono mb-8 break-all opacity-50 px-6">{scannedUser.userId}</p>
          <div className="text-8xl font-black text-slate-800 mb-10">{scannedUser.points}</div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={async () => {
                const res = await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'update_points', userId: scannedUser.userId, amount: 1 })});
                const json = await res.json();
                setScannedUser({ ...scannedUser, points: json.newPoints });
                fetchAdminUsers();
              }}
              className="bg-emerald-500 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-emerald-100 active:scale-95 transition-all"
            >
              + 1
            </button>
            <button 
              onClick={async () => {
                const res = await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'update_points', userId: scannedUser.userId, amount: -1 })});
                const json = await res.json();
                setScannedUser({ ...scannedUser, points: json.newPoints });
                fetchAdminUsers();
              }}
              className="bg-rose-500 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-rose-100 active:scale-95 transition-all"
            >
              - 1
            </button>
          </div>
          <button onClick={() => setScannedUser(null)} className="mt-10 text-slate-400 text-sm font-bold underline">結束並重新掃描</button>
        </div>
      )}
    </div>
  );

  // ==========================================
  // 🧭 底部導覽列 (Bottom Navigation)
  // ==========================================
  const BottomNav = () => {
    const tabs = isAdminView ? [
      { id: 'admin_print', icon: '🖨️', label: '列印', action: fetchAdminPhotos },
      { id: 'admin_users', icon: '👥', label: '用戶', action: fetchAdminUsers },
      { id: 'admin_member', icon: '🔍', label: '掃碼', action: () => {} }
    ] : [
      { id: 'points', icon: '🎫', label: '點數', action: () => fetchData(user?.userId) },
      { id: 'photos', icon: '🖼️', label: '紀錄', action: () => fetchData(user?.userId) },
      { id: 'member', icon: '👤', label: '會員', action: () => {} }
    ];

    return (
      <div className="fixed bottom-6 left-6 right-6 h-20 bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white/50 shadow-2xl flex justify-around items-center px-4 z-50">
        {tabs.map(t => (
          <button 
            key={t.id} 
            onClick={() => { setActiveTab(t.id); if(t.action) t.action(); }} 
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
              activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-300 hover:text-slate-400'
            }`}
          >
            <span className="text-2xl mb-1">{t.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-tighter">{t.label}</span>
          </button>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 font-black tracking-widest text-xs uppercase">Initializing System</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-36 font-sans selection:bg-blue-100">
      <header className="mb-10 flex justify-between items-center px-1">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            {isAdminView ? 'Admin Console' : 'Photo Print'}
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Grad Trip 2026</p>
        </div>
        {user?.userId === ADMIN_ID && (
          <button 
            onClick={() => setIsAdminView(!isAdminView)} 
            className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform"
          >
            {isAdminView ? '🏠' : '🛠️'}
          </button>
        )}
      </header>

      <main>
        {!isAdminView ? (
          <>
            {activeTab === 'points' && <UserPointsTab />}
            {activeTab === 'photos' && <UserPhotosTab />}
            {activeTab === 'member' && <UserMemberTab />}
          </>
        ) : (
          <>
            {activeTab === 'admin_print' && <AdminPrintingTab />}
            {activeTab === 'admin_users' && <AdminUsersTab />}
            {activeTab === 'admin_member' && <AdminMemberTab />}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
