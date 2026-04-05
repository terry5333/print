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
  const [data, setData] = useState({ points: 0, logs: [] }); // 用戶本人資料
  const [adminPhotos, setAdminPhotos] = useState([]);      // 管理員：列印區
  const [adminUsers, setAdminUsers] = useState([]);        // 管理員：用戶區
  const [scannedUser, setScannedUser] = useState(null);    // 管理員：會員掃描結果

  const ADMIN_ID = "你的_LINE_USER_ID"; // ⚠️ 記得換成你的 ID

  useEffect(() => {
    liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID }).then(async () => {
      if (!liff.isLoggedIn()) liff.login();
      const profile = await liff.getProfile();
      setUser(profile);
      if (profile.userId === ADMIN_ID) {
        setIsAdminView(true);
        setActiveTab('admin_print');
        fetchAdminPhotos();
      }
      fetchUserData(profile.userId);
    });
  }, []);

  // --- API 請求函式 ---
  const fetchUserData = async (uid) => {
    const res = await fetch(`/api/user?userId=${uid}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  const fetchAdminPhotos = async () => {
    const res = await fetch('/api/admin?type=photos');
    if (res.ok) {
      const json = await res.json();
      setAdminPhotos(json.photos);
    }
  };

  const fetchAdminUsers = async () => {
    const res = await fetch('/api/admin?type=users');
    if (res.ok) {
      const json = await res.json();
      setAdminUsers(json.users);
    }
  };

  const handleUpdatePoints = async (uid, amount) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_points', userId: uid, amount })
    });
    if (res.ok) {
      const json = await res.json();
      if (scannedUser) setScannedUser({ ...scannedUser, points: json.newPoints });
      fetchAdminUsers(); // 同步更新用戶清單
    }
  };

  // ==========================================
  // 👑 管理員分頁組件
  // ==========================================

  // 1. 列印區
  const AdminPrintingTab = () => (
    <div className="animate-fade-in space-y-4 pb-24">
      <h2 className="text-xl font-bold text-slate-800">🖨️ 待列印清單 ({adminPhotos.length})</h2>
      {adminPhotos.map(photo => (
        <div key={photo.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <img src={`https://drive.google.com/thumbnail?id=${photo.driveFileId}&sz=w600`} className="w-full h-48 object-contain bg-black rounded-lg mb-4" />
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400">ID: {photo.id.slice(-5)}</p>
            <button 
              onClick={async () => {
                await fetch('/api/admin', { method: 'POST', body: JSON.stringify({ action: 'delete_photo', photoId: photo.id })});
                fetchAdminPhotos();
              }}
              className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              完成並刪除
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // 2. 用戶區
  const AdminUsersTab = () => (
    <div className="animate-fade-in space-y-2 pb-24">
      <h2 className="text-xl font-bold text-slate-800 mb-4">👥 所有用戶 ({adminUsers.length})</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {adminUsers.map(u => (
          <div key={u.id} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0">
            <span className="text-sm font-medium text-slate-700 truncate mr-4">{u.id}</span>
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{u.points} 點</span>
          </div>
        ))}
      </div>
    </div>
  );

  // 3. 會員掃描區
  const AdminMemberTab = () => (
    <div className="animate-fade-in text-center space-y-6">
      <h2 className="text-xl font-bold text-slate-800">🔍 會員掃描與點數</h2>
      {!scannedUser ? (
        <button 
          onClick={async () => {
            const res = await liff.scanCodeV2();
            const userRes = await fetch(`/api/admin?type=member&userId=${res.value}`);
            if (userRes.ok) setScannedUser(await userRes.json());
          }}
          className="w-full bg-blue-600 text-white py-8 rounded-3xl text-xl font-black shadow-lg"
        >
          點擊開啟掃描
        </button>
      ) : (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-2">已選取用戶 ID</p>
          <p className="text-sm font-mono mb-6 break-all bg-slate-50 p-2 rounded">{scannedUser.userId}</p>
          <div className="text-6xl font-black text-slate-800 mb-8">{scannedUser.points}</div>
          <div className="flex gap-4">
            <button onClick={() => handleUpdatePoints(scannedUser.userId, 1)} className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-bold">+1 點</button>
            <button onClick={() => handleUpdatePoints(scannedUser.userId, -1)} className="flex-1 bg-rose-500 text-white py-4 rounded-xl font-bold">-1 點</button>
          </div>
          <button onClick={() => setScannedUser(null)} className="mt-8 text-slate-400 text-sm underline">重新掃描</button>
        </div>
      )}
    </div>
  );

  // --- 渲染判斷 ---
  const renderContent = () => {
    if (!isAdminView) {
      if (activeTab === 'points') return (
        <div className="text-center">
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 mb-6">
            <p className="text-slate-400 text-sm mb-2">剩餘列印點數</p>
            <div className="text-8xl font-black text-slate-800">{data.points}</div>
          </div>
        </div>
      );
      if (activeTab === 'member') return (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
          <p className="text-sm text-slate-400 mb-4 font-medium">個人數位通行證</p>
          <div className="flex justify-center bg-white p-4 rounded-xl shadow-sm border border-slate-50 w-fit mx-auto">
            {user?.userId && <QRCode value={user.userId} size={180} />}
          </div>
          <p className="text-[10px] text-slate-300 mt-4 font-mono">{user?.userId}</p>
        </div>
      );
    } else {
      if (activeTab === 'admin_print') return <AdminPrintingTab />;
      if (activeTab === 'admin_users') return <AdminUsersTab />;
      if (activeTab === 'admin_member') return <AdminMemberTab />;
    }
    return null;
  };

  const BottomNav = () => {
    const tabs = isAdminView ? [
      { id: 'admin_print', icon: '🖨️', label: '列印', action: fetchAdminPhotos },
      { id: 'admin_users', icon: '👥', label: '用戶', action: fetchAdminUsers },
      { id: 'admin_member', icon: '🔍', label: '會員', action: () => {} }
    ] : [
      { id: 'points', icon: '🎫', label: '點數' },
      { id: 'member', icon: '👤', label: '會員' }
    ];

    return (
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-100 pb-8 pt-2 px-10 flex justify-between items-center z-50">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if(t.action) t.action(); }} className={`flex flex-col items-center ${activeTab === t.id ? 'text-blue-600' : 'text-slate-300'}`}>
            <span className="text-2xl mb-1">{t.icon}</span>
            <span className="text-[10px] font-bold">{t.label}</span>
          </button>
        ))}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center text-slate-400 font-bold">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 pb-32">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800">{isAdminView ? '👑 管理控制台' : '📸 畢旅印相機'}</h1>
        {user?.userId === ADMIN_ID && (
          <button onClick={() => setIsAdminView(!isAdminView)} className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold">
            切換模式
          </button>
        )}
      </header>
      {renderContent()}
      <BottomNav />
    </div>
  );
}
