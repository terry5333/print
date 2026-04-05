'use client';
import { useEffect, useState } from 'react';
import liff from '@line/liff';
import QRCode from 'react-qr-code';

export default function LiffPage() {
  const [user, setUser] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [activeTab, setActiveTab] = useState('points');
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState({ points: 0, logs: [], pointLogs: [] });
  const [adminPhotos, setAdminPhotos] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [scannedUser, setScannedUser] = useState(null);

  // 👑 最高管理員 ID 
  const ADMIN_ID = "U504c5a2721f2c5345b538137d3e0f66d"; 

  useEffect(() => {
    liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID }).then(() => {
      if (!liff.isLoggedIn()) { liff.login(); return; }
      
      liff.getProfile().then(profile => {
        setUser(profile);
        
        fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl })
        });

        if (profile.userId === ADMIN_ID) {
          setIsAdminView(true);
          setActiveTab('admin_print');
          fetchAdminPhotos();
        }
        fetchUserData(profile.userId);
      });
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 高級數位通行證設計 */}
      <div className="bg-[#0f172a] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Grad Trip Pass</p>
              <h2 className="text-2xl font-black tracking-tight">{user?.displayName || 'User'}</h2>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden">
              {user?.pictureUrl && <img src={user.pictureUrl} alt="avatar" className="w-full h-full object-cover" />}
            </div>
          </div>
          
          <div>
            <p className="text-slate-400 text-xs font-medium mb-1">剩餘列印點數</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-7xl font-black tracking-tighter">{data.points}</h2>
              <span className="text-lg font-bold text-blue-400">pts</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 點數紀錄區塊 */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm h-72 overflow-y-auto">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 sticky top-0 bg-white/90 backdrop-blur-sm pb-2 z-10">
          <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>交易紀錄
        </h3>
        <div className="space-y-3">
          {data.pointLogs && data.pointLogs.length > 0 ? data.pointLogs.map((log, i) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-700">{log.action}</p>
                <p className="text-[10px] font-medium text-slate-400 mt-1">{new Date(log.createdAt).toLocaleString('zh-TW')}</p>
              </div>
              <div className="text-right">
                <p className={`text-base font-black ${log.action.includes('加') ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {log.action.includes('加') ? '+' : '-'}{log.amount}
                </p>
                <p className="text-[10px] font-bold text-slate-400">剩餘 {log.balance}</p>
              </div>
            </div>
          )) : <p className="text-xs text-slate-400 text-center py-6">目前沒有點數紀錄喔！</p>}
        </div>
      </div>
    </div>
  );

  const UserPhotosTab = () => (
    <div className="space-y-4 pb-32 animate-in fade-in duration-500">
      <h2 className="text-xl font-black text-slate-800 px-2">📸 相簿紀錄</h2>
      {data.logs.length > 0 ? data.logs.map((log) => (
        // 🌟 點擊整張卡片連到 Google Drive
        <a 
          key={log.id} 
          href={`https://drive.google.com/file/d/${log.driveFileId}/view`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block bg-white rounded-[2rem] p-3 flex items-center gap-4 border border-slate-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all group"
        >
          <div className="relative w-20 h-20 shrink-0">
            <img src={`https://drive.google.com/thumbnail?id=${log.driveFileId}&sz=w200`} referrerPolicy="no-referrer" className="w-full h-full rounded-2xl object-cover bg-slate-100" alt="print" />
            <div className="absolute inset-0 bg-black/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white drop-shadow-md">↗</span>
            </div>
          </div>
          <div className="flex-1 py-1">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-bold text-slate-400">ID: {log.id.slice(-4)}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${log.status === '已完成' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {log.status}
              </span>
            </div>
            <p className="text-slate-700 font-bold text-sm">點擊查看原圖</p>
            <p className="text-slate-400 text-[10px] mt-1">{new Date(log.createdAt).toLocaleString('zh-TW')}</p>
          </div>
          <div className="text-slate-300 pr-2">›</div>
        </a>
      )) : (
        <div className="py-20 text-center"><div className="text-6xl mb-4 opacity-20">🖨️</div><p className="text-slate-400 font-medium text-sm">尚未上傳照片</p></div>
      )}
    </div>
  );

  const UserMemberTab = () => (
    <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
      <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-slate-50"></div>
        <div className="relative">
          <img src={user?.pictureUrl} className="w-24 h-24 rounded-full border-4 border-white shadow-md mx-auto mb-4" alt="avatar" />
          <h2 className="text-2xl font-black text-slate-800">{user?.displayName}</h2>
          <p className="text-slate-400 text-[10px] font-bold tracking-widest mt-1 uppercase">Member Code</p>
          
          <div className="mt-8 p-6 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 inline-block shadow-sm">
            {user?.userId && <QRCode value={user.userId} size={160} level="H" fgColor="#0f172a" />}
          </div>
          <p className="text-[10px] font-mono text-slate-300 mt-6 break-all px-6">{user?.userId}</p>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 👑 管理員分頁組件
  // ==========================================

  const AdminPrintingTab = () => (
    <div className="space-y-6 pb-32">
      <div className="flex justify-between items-end px-2">
        <h2 className="text-2xl font-black text-slate-800">待列印任務</h2>
        <span className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded-full shadow-sm">{adminPhotos.length} 筆</span>
      </div>
      {adminPhotos.map(photo => (
        <div key={photo.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col group">
          {/* 🌟 點擊圖片連到 Google Drive */}
          <a href={`https://drive.google.com/file/d/${photo.driveFileId}/view`} target="_blank" rel="noopener noreferrer" className="relative block">
            <img src={`https://drive.google.com/thumbnail?id=${photo.driveFileId}&sz=w800`} referrerPolicy="no-referrer" className="w-full h-64 object-contain bg-[#f1f5f9]" />
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full font-bold">點擊檢視原圖 ↗</div>
          </a>
          <div className="p-5 flex justify-between items-center bg-white">
            <div>
              <p className="text-xs font-bold text-slate-400 font-mono">UID: {photo.userId?.slice(0, 6)}...</p>
              <p className="text-[10px] text-slate-300 mt-1">{new Date(photo.createdAt).toLocaleTimeString()}</p>
            </div>
            <button 
              onClick={async () => {
                await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'delete_photo', photoId: photo.id })});
                fetchAdminPhotos();
              }}
              className="bg-[#0f172a] text-white px-6 py-3 rounded-[1rem] text-sm font-bold active:scale-95 transition-transform shadow-md"
            >
              ✅ 完成列印
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const AdminUsersTab = () => (
    <div className="space-y-4 pb-32 animate-in fade-in">
      <h2 className="text-2xl font-black text-slate-800 px-2">全校用戶資料</h2>
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {adminUsers.map(u => (
          <div key={u.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              {u.pictureUrl ? <img src={u.pictureUrl} className="w-10 h-10 rounded-full object-cover shadow-sm" /> : <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">👤</div>}
              <span className="text-sm font-bold text-slate-700 truncate w-28">{u.displayName || '未開通'}</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
              <span className="text-sm font-black text-slate-700">{u.points}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AdminMemberTab = () => (
    <div className="space-y-6 text-center pb-32">
      <h2 className="text-2xl font-black text-slate-800">核點掃描儀</h2>
      {!scannedUser ? (
        <button onClick={async () => {
            try {
              const res = await liff.scanCodeV2();
              const userRes = await fetch(`/api/admin?type=member&userId=${res.value}`);
              if (userRes.ok) setScannedUser(await userRes.json());
            } catch(e) { console.log('Scan Cancelled'); }
          }}
          className="w-full bg-blue-600 text-white py-14 rounded-[3rem] text-2xl font-black shadow-xl shadow-blue-200 active:scale-[0.98] transition-all flex flex-col items-center gap-2"
        >
          <span className="text-4xl">📷</span>
          <span>啟動相機掃描</span>
        </button>
      ) : (
        <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 animate-in zoom-in-95">
          {scannedUser.pictureUrl && <img src={scannedUser.pictureUrl} className="w-20 h-20 rounded-full mx-auto mb-4 shadow-md border-2 border-white" />}
          <h3 className="text-xl font-black text-slate-800 mb-1">{scannedUser.displayName || '未知用戶'}</h3>
          <p className="text-[10px] font-mono mb-8 break-all opacity-40 px-6">{scannedUser.userId}</p>
          <div className="bg-slate-50 rounded-[2rem] py-8 mb-8 border border-slate-100">
             <div className="text-7xl font-black text-slate-800 mb-1">{scannedUser.points}</div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Points</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={async () => {
                const res = await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'update_points', userId: scannedUser.userId, amount: 1 })});
                setScannedUser({ ...scannedUser, points: (await res.json()).newPoints });
                fetchAdminUsers();
              }} className="bg-slate-900 text-white py-5 rounded-2xl font-black text-xl active:scale-95 transition-transform">+ 1</button>
            <button onClick={async () => {
                const res = await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'update_points', userId: scannedUser.userId, amount: -1 })});
                setScannedUser({ ...scannedUser, points: (await res.json()).newPoints });
                fetchAdminUsers();
              }} className="bg-white border-2 border-slate-200 text-slate-700 py-5 rounded-2xl font-black text-xl active:scale-95 transition-transform">- 1</button>
          </div>
          <button onClick={() => setScannedUser(null)} className="mt-8 text-slate-400 text-xs font-bold underline decoration-slate-300 underline-offset-4">結束掃描</button>
        </div>
      )}
    </div>
  );

  // ==========================================
  // 🧭 懸浮膠囊導覽列 (Floating Pill Nav)
  // ==========================================
  const BottomNav = () => {
    const tabs = isAdminView ? [
      { id: 'admin_print', icon: '🖨️', label: '列印', action: fetchAdminPhotos },
      { id: 'admin_users', icon: '👥', label: '用戶', action: fetchAdminUsers },
      { id: 'admin_member', icon: '🔍', label: '掃碼', action: () => {} }
    ] : [
      { id: 'points', icon: '🎫', label: '點數', action: () => fetchData(user?.userId) },
      { id: 'photos', icon: '🖼️', label: '相簿', action: () => fetchData(user?.userId) },
      { id: 'member', icon: '👤', label: '會員', action: () => {} }
    ];
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-[72px] bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex justify-around items-center px-2 z-50">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if(t.action) t.action(); }} className={`relative flex flex-col items-center justify-center w-[72px] h-[56px] rounded-[1.5rem] transition-all duration-300 ${activeTab === t.id ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
            <span className={`text-xl mb-0.5 transition-transform duration-300 ${activeTab === t.id ? 'scale-110' : 'scale-100'}`}>{t.icon}</span>
            <span className="text-[9px] font-black tracking-wider">{t.label}</span>
          </button>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 font-bold tracking-[0.2em] text-[10px] uppercase">Loading System</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-0 font-sans selection:bg-blue-100">
      <header className="mb-8 flex justify-between items-center px-2 pt-2">
        <div>
          <h1 className="text-[28px] leading-none font-black text-slate-900 tracking-tighter">
            {isAdminView ? 'Admin Console' : 'Photo Print'}
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] mt-1.5">Grad Trip 2026</p>
        </div>
        {user?.userId === ADMIN_ID && (
          <button onClick={() => setIsAdminView(!isAdminView)} className="w-11 h-11 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform">
            <span className="text-lg">{isAdminView ? '🏠' : '🛠️'}</span>
          </button>
        )}
      </header>

      <main className="h-full">
        {!isAdminView ? (
          <>{activeTab === 'points' && <UserPointsTab />}{activeTab === 'photos' && <UserPhotosTab />}{activeTab === 'member' && <UserMemberTab />}</>
        ) : (
          <>{activeTab === 'admin_print' && <AdminPrintingTab />}{activeTab === 'admin_users' && <AdminUsersTab />}{activeTab === 'admin_member' && <AdminMemberTab />}</>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
