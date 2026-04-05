'use client';
import { useEffect, useState } from 'react';
import liff from '@line/liff';
import QRCode from 'react-qr-code';

export default function LiffPage() {
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); 
  const [isAdminView, setIsAdminView] = useState(false);   
  const [activeTab, setActiveTab] = useState('points'); 
  
  const [data, setData] = useState({ points: 0, logs: [] });
  const [adminData, setAdminData] = useState({ pendingPhotos: [] }); 
  const [loading, setLoading] = useState(true);

  // 👑 組長專屬 ID (請務必修改此處)
  const ADMIN_ID = "U504c5a2721f2c5345b538137d3e0f66d"; 

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          const profile = await liff.getProfile();
          setUser(profile);
          
          if (profile.userId === ADMIN_ID) {
            setIsSuperAdmin(true);
            setIsAdminView(true);
            setActiveTab('photo_manage');
            fetchAdminData(); 
          }
          fetchData(profile.userId);
        }
      } catch (err) {
        console.error('LIFF Error:', err);
      }
    };
    initLiff();
  }, []);

  const fetchData = async (userId) => {
    const res = await fetch(`/api/user?userId=${userId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  const fetchAdminData = async () => {
    const res = await fetch('/api/admin');
    if (res.ok) setAdminData(await res.json());
  };

  const toggleViewMode = () => {
    const newMode = !isAdminView;
    setIsAdminView(newMode);
    setActiveTab(newMode ? 'photo_manage' : 'points');
    if (newMode) fetchAdminData();
  };

  // --- 用戶視圖 ---
  const UserPointsTab = () => (
    <div className="animate-fade-in">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-6 text-center">
        <p className="text-slate-400 text-sm font-medium mb-2">剩餘列印額度</p>
        <h2 className="text-7xl font-black text-slate-800">{data.points}</h2>
      </div>
    </div>
  );

  const UserPhotosTab = () => (
    <div className="animate-fade-in space-y-4 pb-20">
      <h2 className="text-xl font-bold text-slate-800 mb-4">我的相簿狀態</h2>
      {data.logs.length > 0 ? data.logs.map((log) => (
        <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={`https://drive.google.com/thumbnail?id=${log.driveFileId}&sz=w200`} 
              className="w-16 h-16 rounded-xl object-cover bg-slate-50"
              alt="thumb"
            />
            <div>
              <p className="text-sm font-bold text-slate-700">照片紀錄</p>
              <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString('zh-TW')}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.status === '已完成' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            {log.status}
          </span>
        </div>
      )) : <p className="text-center text-slate-400 py-10">尚無照片</p>}
    </div>
  );

  const UserMemberTab = () => (
    <div className="animate-fade-in text-center">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <img src={user?.pictureUrl} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-slate-50" alt="p" />
        <h2 className="text-xl font-bold text-slate-800">{user?.displayName}</h2>
        <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 mt-6 flex justify-center">
          {user?.userId && <QRCode value={user.userId} size={140} level="H" />}
        </div>
      </div>
    </div>
  );

  // --- 管理員視圖 ---
  const AdminPhotoTab = () => (
    <div className="animate-fade-in pb-20">
      <h2 className="text-xl font-bold text-slate-800 mb-4 tracking-tight">待列印清單 ({adminData.pendingPhotos.length})</h2>
      <div className="space-y-6">
        {adminData.pendingPhotos.map((photo) => (
          <div key={photo.id} className="bg-white rounded-2xl p-4 shadow-md border border-slate-100">
            <img src={`https://drive.google.com/thumbnail?id=${photo.driveFileId}&sz=w600`} className="w-full h-56 object-contain rounded-xl mb-4 bg-black" />
            <button 
              onClick={async () => {
                const res = await fetch('/api/admin', {
                  method: 'POST',
                  body: JSON.stringify({ action: 'complete_photo', photoId: photo.id })
                });
                if (res.ok) fetchAdminData();
              }}
              className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl"
            >
              ✅ 標記為已列印
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const AdminUserTab = () => (
    <div className="animate-fade-in">
      <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 text-center">
        <div className="text-5xl mb-4">📸</div>
        <button 
          onClick={async () => {
            try {
              const res = await liff.scanCodeV2();
              if (confirm(`確定扣除用戶 ${res.value.slice(0,5)} 1點？`)) {
                const apiRes = await fetch('/api/admin', {
                  method: 'POST',
                  body: JSON.stringify({ action: 'deduct', userId: res.value })
                });
                const result = await apiRes.json();
                alert(result.success ? `扣點成功！剩餘：${result.newPoints}` : "失敗");
              }
            } catch (e) { console.log("Scan Cancelled"); }
          }}
          className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-blue-200"
        >
          開啟掃瞄器扣點
        </button>
      </div>
    </div>
  );

  const BottomNav = () => {
    const tabs = isAdminView ? [
      { id: 'photo_manage', label: '管理', icon: '🖨️' },
      { id: 'user_manage', label: '用戶', icon: '👥' }
    ] : [
      { id: 'points', label: '點數', icon: '🎫' },
      { id: 'photos', label: '相簿', icon: '🖼️' },
      { id: 'member', label: '會員', icon: '👤' }
    ];

    return (
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-100 pb-8 pt-2 px-10 flex justify-between items-center z-50">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center p-2 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-300'}`}>
            <span className="text-2xl mb-1">{tab.icon}</span>
            <span className="text-[10px] font-bold">{tab.label}</span>
          </button>
        ))}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center text-slate-400 font-bold">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans pb-32 pt-10 px-6">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{isAdminView ? '👑 管理中心' : '畢旅印相館'}</h1>
        {isSuperAdmin && (
          <button onClick={toggleViewMode} className="text-xs bg-slate-200 text-slate-600 px-4 py-2 rounded-full font-bold">
            {isAdminView ? '看我的點數' : '切換管理模式'}
          </button>
        )}
      </header>
      {!isAdminView && activeTab === 'points' && <UserPointsTab />}
      {!isAdminView && activeTab === 'photos' && <UserPhotosTab />}
      {!isAdminView && activeTab === 'member' && <UserMemberTab />}
      {isAdminView && activeTab === 'photo_manage' && <AdminPhotoTab />}
      {isAdminView && activeTab === 'user_manage' && <AdminUserTab />}
      <BottomNav />
    </div>
  );
}
