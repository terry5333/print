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
  const [sysSettings, setSysSettings] = useState({ filmCount: 0, isPaused: false }); // 🌟 系統設定狀態

  // 👑 最高管理員 ID 
  const ADMIN_ID = "U504c5a2721f2c5345b538137d3e0f66d"; 

  useEffect(() => {
    liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID }).then(() => {
      if (!liff.isLoggedIn()) { liff.login(); return; }
      
      liff.getProfile().then(profile => {
        setUser(profile);
        fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl }) });

        if (profile.userId === ADMIN_ID) {
          setIsAdminView(true);
          setActiveTab('admin_print');
          fetchAdminPhotos();
          fetchSettings(); // 🌟 抓取設定
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

  const fetchSettings = async () => {
    const res = await fetch('/api/admin?type=settings');
    if (res.ok) setSysSettings(await res.json());
  };

  const updateSettings = async (newSettings) => {
    setSysSettings(newSettings);
    await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_settings', ...newSettings }) });
  };

  // ==========================================
  // 👥 用戶分頁 (User Views) 省略，因為沒變動，直接包含
  // ==========================================
  const UserPointsTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-2">Available Points</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-8xl font-black">{data.points}</h2>
            <span className="text-xl font-bold opacity-80">pts</span>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm h-72 overflow-y-auto">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 sticky top-0 bg-white/90 backdrop-blur-sm pb-2 z-10"><span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>交易紀錄</h3>
        <div className="space-y-3">
          {data.pointLogs && data.pointLogs.length > 0 ? data.pointLogs.map((log, i) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div><p className="text-sm font-bold text-slate-700">{log.action}</p><p className="text-[10px] font-medium text-slate-400 mt-1">{new Date(log.createdAt).toLocaleString('zh-TW')}</p></div>
              <div className="text-right"><p className={`text-base font-black ${log.action.includes('加') ? 'text-emerald-500' : 'text-rose-500'}`}>{log.action.includes('加') ? '+' : '-'}{log.amount}</p><p className="text-[10px] font-bold text-slate-400">剩餘 {log.balance}</p></div>
            </div>
          )) : <p className="text-xs text-slate-400 text-center py-6">目前沒有紀錄喔！</p>}
        </div>
      </div>
    </div>
  );

  const UserPhotosTab = () => (
    <div className="space-y-4 pb-32 animate-in fade-in">
      <h2 className="text-xl font-black text-slate-800 px-2">📸 相簿紀錄</h2>
      {data.logs.length > 0 ? data.logs.map((log) => (
        <a key={log.id} href={`https://drive.google.com/file/d/${log.driveFileId}/view`} target="_blank" rel="noopener noreferrer" className="block bg-white rounded-[2rem] p-3 flex items-center gap-4 shadow-sm active:scale-[0.98]">
          <div className="w-20 h-20 shrink-0"><img src={`https://drive.google.com/thumbnail?id=${log.driveFileId}&sz=w200`} referrerPolicy="no-referrer" className="w-full h-full rounded-2xl object-cover bg-slate-100" /></div>
          <div className="flex-1 py-1">
            <div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-slate-400">ID: {log.id.slice(-4)}</span><span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${log.status === '已完成' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{log.status}</span></div>
            <p className="text-slate-700 font-bold text-sm">點擊查看原圖</p><p className="text-slate-400 text-[10px] mt-1">{new Date(log.createdAt).toLocaleString('zh-TW')}</p>
          </div>
        </a>
      )) : <p className="text-slate-400 text-center py-20">尚未上傳照片</p>}
    </div>
  );

  const UserMemberTab = () => (
    <div className="text-center space-y-6 animate-in zoom-in-95">
      <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 relative"><img src={user?.pictureUrl} className="w-24 h-24 rounded-full border-4 border-white shadow-md mx-auto mb-4" /><h2 className="text-2xl font-black text-slate-800">{user?.displayName}</h2><div className="mt-8 p-6 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 inline-block">{user?.userId && <QRCode value={user.userId} size={160} level="H" fgColor="#0f172a" />}</div><p className="text-[10px] font-mono text-slate-300 mt-6 break-all px-6">{user?.userId}</p></div>
    </div>
  );

  // ==========================================
  // 👑 管理員分頁組件 (Admin Views)
  // ==========================================

  const AdminPrintingTab = () => (
    <div className="space-y-6 pb-32">
      <div className="flex justify-between items-end px-2"><h2 className="text-2xl font-black text-slate-800">待列印任務</h2><span className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded-full">{adminPhotos.length} 張</span></div>
      {adminPhotos.map(photo => (
        <div key={photo.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100">
          <a href={`https://drive.google.com/file/d/${photo.driveFileId}/view`} target="_blank" rel="noopener noreferrer"><img src={`https://drive.google.com/thumbnail?id=${photo.driveFileId}&sz=w800`} referrerPolicy="no-referrer" className="w-full h-64 object-contain bg-slate-100" /></a>
          <div className="p-5 flex justify-between items-center">
            <div><p className="text-xs font-bold text-slate-400 font-mono">UID: {photo.userId?.slice(0, 6)}...</p><p className="text-[10px] text-slate-300 mt-1">{new Date(photo.createdAt).toLocaleTimeString()}</p></div>
            <button onClick={async () => { await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'delete_photo', photoId: photo.id })}); fetchAdminPhotos(); }} className="bg-[#0f172a] text-white px-6 py-3 rounded-[1rem] text-sm font-bold active:scale-95">✅ 完成列印</button>
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
          <div key={u.id} className="flex justify-between items-center p-4 hover:bg-slate-50"><div className="flex items-center gap-3">{u.pictureUrl ? <img src={u.pictureUrl} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">👤</div>}<span className="text-sm font-bold text-slate-700 truncate w-28">{u.displayName || '未開通'}</span></div><div className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full"><span className="text-sm font-black text-slate-700">{u.points}</span><span className="text-[10px] font-bold text-slate-400 uppercase">pts</span></div></div>
        ))}
      </div>
    </div>
  );

  const AdminMemberTab = () => (
    <div className="space-y-6 text-center pb-32">
      <h2 className="text-2xl font-black text-slate-800">核點掃描儀</h2>
      {!scannedUser ? (
        <button onClick={async () => { try { const res = await liff.scanCodeV2(); const userRes = await fetch(`/api/admin?type=member&userId=${res.value}`); if (userRes.ok) setScannedUser(await userRes.json()); } catch(e) {} }} className="w-full bg-indigo-600 text-white py-14 rounded-[3rem] text-2xl font-black shadow-xl active:scale-95 flex flex-col items-center gap-2"><span className="text-4xl">📷</span><span>啟動相機掃描</span></button>
      ) : (
        <div className="bg-white rounded-[3rem] p-8 shadow-xl animate-in zoom-in-95">{scannedUser.pictureUrl && <img src={scannedUser.pictureUrl} className="w-20 h-20 rounded-full mx-auto mb-4" />}<h3 className="text-xl font-black text-slate-800">{scannedUser.displayName}</h3><div className="bg-slate-50 rounded-[2rem] py-8 mb-8 mt-4 border"><div className="text-7xl font-black text-slate-800">{scannedUser.points}</div></div><div className="grid grid-cols-2 gap-4"><button onClick={async () => { const res = await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'update_points', userId: scannedUser.userId, amount: 1 })}); setScannedUser({ ...scannedUser, points: (await res.json()).newPoints }); fetchAdminUsers(); }} className="bg-slate-900 text-white py-5 rounded-2xl font-black text-xl">+ 1</button><button onClick={async () => { const res = await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'update_points', userId: scannedUser.userId, amount: -1 })}); setScannedUser({ ...scannedUser, points: (await res.json()).newPoints }); fetchAdminUsers(); }} className="bg-white border-2 text-slate-700 py-5 rounded-2xl font-black text-xl">- 1</button></div><button onClick={() => setScannedUser(null)} className="mt-8 text-slate-400 text-xs font-bold underline">結束掃描</button></div>
      )}
    </div>
  );

  // 🌟 新增：系統設定分頁
  const AdminSettingsTab = () => (
    <div className="space-y-6 pb-32 animate-in fade-in">
      <h2 className="text-2xl font-black text-slate-800 px-2">⚙️ 系統核心設定</h2>
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-8">
        
        {/* 底片數量設定 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">相印機剩餘底片數量</label>
          <div className="flex gap-4">
            <input 
              type="number" 
              value={sysSettings.filmCount} 
              onChange={(e) => setSysSettings({...sysSettings, filmCount: Number(e.target.value)})}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xl font-black text-slate-800 outline-none focus:border-blue-500"
            />
            <button 
              onClick={() => updateSettings(sysSettings)}
              className="bg-blue-600 text-white px-8 rounded-2xl font-bold shadow-lg active:scale-95"
            >儲存</button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">每次學生上傳照片，此數量會自動扣除 1。歸零時將阻擋上傳。</p>
        </div>

        <div className="h-px bg-slate-100 w-full"></div>

        {/* 暫停接收開關 */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800">暫停接收照片</h3>
            <p className="text-xs text-slate-400 mt-1">開啟後，機器人會拒絕所有新照片</p>
          </div>
          <button 
            onClick={() => updateSettings({...sysSettings, isPaused: !sysSettings.isPaused})}
            className={`w-16 h-8 rounded-full relative transition-colors duration-300 ${sysSettings.isPaused ? 'bg-rose-500' : 'bg-slate-200'}`}
          >
            <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all duration-300 ${sysSettings.isPaused ? 'left-9' : 'left-1'}`}></div>
          </button>
        </div>

      </div>
    </div>
  );

  const BottomNav = () => {
    const tabs = isAdminView ? [
      { id: 'admin_print', icon: '🖨️', label: '列印', action: fetchAdminPhotos },
      { id: 'admin_users', icon: '👥', label: '用戶', action: fetchAdminUsers },
      { id: 'admin_member', icon: '🔍', label: '掃碼', action: () => {} },
      { id: 'admin_settings', icon: '⚙️', label: '設定', action: fetchSettings } // 🌟 加入設定按鈕
    ] : [
      { id: 'points', icon: '🎫', label: '點數', action: () => fetchData(user?.userId) },
      { id: 'photos', icon: '🖼️', label: '相簿', action: () => fetchData(user?.userId) },
      { id: 'member', icon: '👤', label: '會員', action: () => {} }
    ];
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-sm h-[72px] bg-white/80 backdrop-blur-xl rounded-[2.5rem] border shadow-2xl flex justify-around items-center px-2 z-50">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if(t.action) t.action(); }} className={`relative flex flex-col items-center justify-center w-[64px] h-[56px] rounded-[1.5rem] transition-all ${activeTab === t.id ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400'}`}>
            <span className={`text-xl mb-0.5 ${activeTab === t.id ? 'scale-110' : 'scale-100'}`}>{t.icon}</span><span className="text-[9px] font-black">{t.label}</span>
          </button>
        ))}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-0 font-sans selection:bg-blue-100">
      <header className="mb-8 flex justify-between items-center px-2 pt-2">
        <div><h1 className="text-[28px] font-black text-slate-900 tracking-tighter">{isAdminView ? 'Admin Console' : 'Photo Print'}</h1><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] mt-1">Grad Trip 2026</p></div>
        {user?.userId === ADMIN_ID && <button onClick={() => setIsAdminView(!isAdminView)} className="w-11 h-11 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm">{isAdminView ? '🏠' : '🛠️'}</button>}
      </header>
      <main className="h-full">
        {!isAdminView ? (
          <>{activeTab === 'points' && <UserPointsTab />}{activeTab === 'photos' && <UserPhotosTab />}{activeTab === 'member' && <UserMemberTab />}</>
        ) : (
          <>{activeTab === 'admin_print' && <AdminPrintingTab />}{activeTab === 'admin_users' && <AdminUsersTab />}{activeTab === 'admin_member' && <AdminMemberTab />}{activeTab === 'admin_settings' && <AdminSettingsTab />}</>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
