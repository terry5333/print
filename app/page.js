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
        
        // 🌟 優化：這裡不 await，直接放行讓畫面載入，背景偷偷更新大頭貼就好
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
    setLoading(false); // 資料一到馬上關閉轉圈圈
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
  // 👥 用戶分頁組件
  // ==========================================

  const UserPointsTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      
      {/* 🌟 修改：點數異動紀錄 */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-64 overflow-y-auto">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 sticky top-0 bg-white pb-2">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>點數紀錄
        </h3>
        <div className="space-y-4">
          {data.pointLogs && data.pointLogs.length > 0 ? data.pointLogs.map((log, i) => (
            <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0">
              <div>
                <p className="text-sm font-bold text-slate-700">{log.action}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleString('zh-TW')}</p>
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
    <div className="space-y-4 pb-24 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-800 px-1">傳送紀錄</h2>
      {data.logs.length > 0 ? data.logs.map((log) => (
        <div key={log.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm">
          {/* 🌟 破解 Google 縮圖：加上 referrerPolicy */}
          <img src={`https://drive.google.com/thumbnail?id=${log.driveFileId}&sz=w200`} referrerPolicy="no-referrer" className="w-20 h-20 rounded-2xl object-cover bg-slate-50 border border-slate-100" alt="print" />
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-bold text-slate-400">#{log.id.slice(-4)}</span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${log.status === '已完成' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {log.status}
              </span>
            </div>
            <p className="text-slate-700 font-bold text-sm">照片上傳成功</p>
            <p className="text-slate-400 text-[10px] mt-1">{new Date(log.createdAt).toLocaleString('zh-TW')}</p>
          </div>
        </div>
      )) : (
        <div className="py-20 text-center"><div className="text-6xl mb-4 opacity-20">📸</div><p className="text-slate-400 font-medium">尚未上傳任何照片</p></div>
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
  // 👑 管理員分頁組件
  // ==========================================

  const AdminPrintingTab = () => (
    <div className="space-y-6 pb-32">
      <div className="flex justify-between items-end px-1">
        <h2 className="text-2xl font-black text-slate-800">待列印佇列</h2>
        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{adminPhotos.length} 張</span>
      </div>
      {adminPhotos.map(photo => (
        <div key={photo.id} className="bg-white rounded-[2rem] overflow-hidden shadow-md border border-slate-100">
          <img src={`https://drive.google.com/thumbnail?id=${photo.driveFileId}&sz=w800`} referrerPolicy="no-referrer" className="w-full h-64 object-contain bg-slate-100" />
          <div className="p-5 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-400">UserID: {photo.userId?.slice(0, 8)}...</p>
              <p className="text-[10px] font-mono text-slate-300 mt-1">{new Date(photo.createdAt).toLocaleTimeString()}</p>
            </div>
            <button 
              onClick={async () => {
                await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'delete_photo', photoId: photo.id })});
                fetchAdminPhotos();
              }}
              className="bg-emerald-500 text-white px-6 py-3 rounded-2xl text-sm font-black active:scale-90 transition-transform"
            >
              列印並通知
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
          <div key={u.id} className="flex justify-between items-center p-5 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-3">
              {u.pictureUrl ? <img src={u.pictureUrl} className="w-10 h-10 rounded-full object-cover shadow-sm" /> : <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">👤</div>}
              <span className="text-sm font-bold text-slate-700 truncate w-24">{u.displayName || '未開通'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-black text-slate-900">{u.points}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">pts</span>
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
        <button onClick={async () => {
            try {
              const res = await liff.scanCodeV2();
              const userRes = await fetch(`/api/admin?type=member&userId=${res.value}`);
              if (userRes.ok) setScannedUser(await userRes.json());
            } catch(e) { console.log('Scan Cancelled'); }
          }}
          className="w-full bg-indigo-600 text-white py-12 rounded-[3rem] text-2xl font-black shadow-xl active:scale-95 transition-all"
        >📸 點擊掃描會員碼</button>
      ) : (
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-50 animate-in zoom-in-95">
          {scannedUser.pictureUrl && <img src={scannedUser.pictureUrl} className="w-20 h-20 rounded-full mx-auto mb-4 shadow-md" />}
          <h3 className="text-xl font-bold text-slate-800 mb-2">{scannedUser.displayName || '未知用戶'}</h3>
          <p className="text-[10px] font-mono mb-8 break-all opacity-50 px-6">{scannedUser.userId}</p>
          <div className="text-8xl font-black text-slate-800 mb-10">{scannedUser.points}</div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={async () => {
                const res = await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'update_points', userId: scannedUser.userId, amount: 1 })});
                setScannedUser({ ...scannedUser, points: (await res.json()).newPoints });
                fetchAdminUsers();
              }} className="bg-emerald-500 text-white py-5 rounded-2xl font-black text-xl active:scale-95">+ 1</button>
            <button onClick={async () => {
                const res = await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'update_points', userId: scannedUser.userId, amount: -1 })});
                setScannedUser({ ...scannedUser, points: (await res.json()).newPoints });
                fetchAdminUsers();
              }} className="bg-rose-500 text-white py-5 rounded-2xl font-black text-xl active:scale-95">- 1</button>
          </div>
          <button onClick={() => setScannedUser(null)} className="mt-10 text-slate-400 text-sm font-bold underline">重新掃描</button>
        </div>
      )}
    </div>
  );

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
          <button key={t.id} onClick={() => { setActiveTab(t.id); if(t.action) t.action(); }} className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <span className="text-2xl mb-1">{t.icon}</span><span className="text-[10px] font-black uppercase">{t.label}</span>
          </button>
        ))}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 pb-36 font-sans">
      <header className="mb-10 flex justify-between items-center px-1">
        <div><h1 className="text-3xl font-black text-slate-900">{isAdminView ? 'Admin Console' : 'Photo Print'}</h1></div>
        {user?.userId === ADMIN_ID && <button onClick={() => setIsAdminView(!isAdminView)} className="w-10 h-10 bg-white rounded-full shadow-sm">🔄</button>}
      </header>
      <main>
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
