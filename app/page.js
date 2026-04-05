'use client';
import { useEffect, useState } from 'react';
import liff from '@line/liff';
import QRCode from 'react-qr-code';

export default function LiffPage() {
  const [user, setUser] = useState(null);
  
  // 核心狀態管理
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // 真實身分是否為組長
  const [isAdminView, setIsAdminView] = useState(false);   // 目前畫面是否為「管理模式」
  const [activeTab, setActiveTab] = useState('points'); 
  
  const [data, setData] = useState({ points: 0, logs: [] });
  const [loading, setLoading] = useState(true);

  // 👑 這裡非常重要：請務必換成你自己的 LINE User ID！
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
          
          // 判斷是否為最高管理員
          if (profile.userId === ADMIN_ID) {
            setIsSuperAdmin(true);
            setIsAdminView(true); // 預設進入管理模式
            setActiveTab('photo_manage');
          }
          
          fetchData(profile.userId);
        }
      } catch (err) {
        console.error('LIFF Init Error:', err);
      }
    };
    initLiff();
  }, []);

  const fetchData = async (userId) => {
    try {
      const res = await fetch(`/api/user?userId=${userId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Fetch API Error:", err);
    }
    setLoading(false);
  };

  // 模式切換處理函式 (只有組長按得到)
  const toggleViewMode = () => {
    const newMode = !isAdminView;
    setIsAdminView(newMode);
    // 切換模式時，自動跳轉到該模式的預設分頁
    setActiveTab(newMode ? 'photo_manage' : 'points');
  };

  if (loading) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center text-slate-500 font-bold tracking-widest">系統載入中...</div>;

  // ==========================================
  // 👥 一般用戶視圖 (User Views)
  // ==========================================
  const UserPointsTab = () => (
    <div className="animate-fade-in">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-6 text-center">
        <p className="text-slate-400 text-sm font-medium mb-2">剩餘列印額度</p>
        <h2 className="text-7xl font-black text-slate-800">{data.points}</h2>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-700 mb-2">💡 使用說明</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          系統每日自動發放 3 點。請在 LINE 聊天室中傳送照片，系統將自動扣除點數並加入待列印佇列。將數位條碼出示給資訊組長，可進行手動點數異動。
        </p>
      </div>
    </div>
  );

  const UserPhotosTab = () => (
    <div className="animate-fade-in space-y-4 pb-20">
      <h2 className="text-xl font-bold text-slate-800 mb-4">我的相簿與狀態</h2>
      {data.logs.length > 0 ? data.logs.map((log, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-2xl border border-slate-100">📸</div>
            <div>
              <p className="text-sm font-bold text-slate-700">照片 #{log.id.slice(-4)}</p>
              <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString('zh-TW')}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
            log.status === '已完成' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {log.status}
          </span>
        </div>
      )) : (
        <p className="text-center text-slate-400 py-10 font-medium">目前還沒有上傳照片喔！</p>
      )}
    </div>
  );

  const UserMemberTab = () => (
    <div className="animate-fade-in text-center">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <img src={user?.pictureUrl} alt="avatar" className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-slate-50 shadow-sm" />
        <h2 className="text-2xl font-bold text-slate-800">{user?.displayName}</h2>
        <p className="text-slate-400 text-sm mb-6">畢業旅行專屬通行證</p>
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs text-slate-500 mb-4 font-medium">請向管理員出示此條碼</p>
          <div className="bg-white mx-auto flex flex-col items-center justify-center rounded-xl shadow-sm p-4 w-fit">
            {user?.userId ? (
              <QRCode value={user.userId} size={150} bgColor="#ffffff" fgColor="#1e293b" level="Q" />
            ) : (
              <div className="w-[150px] h-[150px] flex items-center justify-center text-slate-300 text-sm">載入中...</div>
            )}
            <span className="text-[10px] text-slate-400 mt-3 font-mono break-all w-[150px]">{user?.userId}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 👑 管理員視圖 (Admin Views)
  // ==========================================
  const AdminPhotoTab = () => (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-4">照片列印管理</h2>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
        <p className="text-slate-500 text-sm mb-4">待處理清單</p>
        <button className="bg-slate-800 hover:bg-slate-700 transition text-white px-6 py-3 rounded-full text-sm font-bold w-full">
          標記最新一張為「已完成」
        </button>
      </div>
    </div>
  );

  const AdminUserTab = () => (
    <div className="animate-fade-in text-center">
      <h2 className="text-xl font-bold text-slate-800 mb-4">用戶點數管理</h2>
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-blue-100">📱</div>
        <p className="text-slate-500 mb-6 text-sm">點擊下方按鈕啟動相機，掃描同學的會員 QR Code 進行手動扣點或加點。</p>
        <button 
          onClick={async () => {
            try {
              const res = await liff.scanCodeV2();
              alert('成功掃描用戶 ID：\n' + res.value); 
            } catch (err) {
              console.log('掃描取消或失敗');
            }
          }}
          className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-colors"
        >
          開啟掃描器
        </button>
      </div>
    </div>
  );

  const AdminSettingsTab = () => (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-4">系統設定</h2>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-50 pb-4">
          <div>
            <p className="font-bold text-slate-700">全體發放點數</p>
            <p className="text-xs text-slate-400">一鍵發送 3 點給所有人</p>
          </div>
          <button className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold active:bg-slate-200">執行</button>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 🧭 底部導覽列設計 (Bottom Navigation)
  // ==========================================
  const BottomNav = () => {
    const tabs = isAdminView ? [
      { id: 'photo_manage', label: '管理', icon: '🖨️' },
      { id: 'user_manage', label: '用戶', icon: '👥' },
      { id: 'settings', label: '設定', icon: '⚙️' }
    ] : [
      { id: 'points', label: '點數', icon: '🎫' },
      { id: 'photos', label: '相簿', icon: '🖼️' },
      { id: 'member', label: '會員', icon: '👤' }
    ];

    return (
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-100 pb-safe pt-2 px-8 flex justify-between items-center z-50">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 mb-2 transition-all ${
              activeTab === tab.id ? 'text-blue-600 scale-110' : 'text-slate-400 grayscale opacity-60 hover:opacity-100'
            }`}
          >
            <span className="text-2xl mb-1">{tab.icon}</span>
            <span className="text-[10px] font-bold tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // ==========================================
  // 主畫面渲染
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans pb-28 pt-8 px-6 selection:bg-blue-100">
      
      {/* 頂部 Header：加入身分切換按鈕 */}
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          {isAdminView ? '👑 管理中心' : '畢旅印相館'}
        </h1>
        
        {/* 只有真實身分為 SuperAdmin 才會顯示此按鈕 */}
        {isSuperAdmin && (
          <button 
            onClick={toggleViewMode}
            className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-full font-bold transition-colors"
          >
            {isAdminView ? '切換為用戶' : '切換為管理'}
          </button>
        )}
      </header>

      {/* 根據 ActiveTab 顯示對應內容 */}
      {!isAdminView && activeTab === 'points' && <UserPointsTab />}
      {!isAdminView && activeTab === 'photos' && <UserPhotosTab />}
      {!isAdminView && activeTab === 'member' && <UserMemberTab />}
      
      {isAdminView && activeTab === 'photo_manage' && <AdminPhotoTab />}
      {isAdminView && activeTab === 'user_manage' && <AdminUserTab />}
      {isAdminView && activeTab === 'settings' && <AdminSettingsTab />}

      <BottomNav />
    </div>
  );
}
