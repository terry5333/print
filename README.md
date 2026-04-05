# 🎓 Grad Trip Print Bot 2026
> **畢業旅行專屬：全自動相片列印與點數交易系統**
> 
> ---
> **Status:** `v1.0.0-Stable`  
> **Developer:** 畢業旅行資訊組長  
> **Tech Stack:** Next.js 14, Firebase, LINE LIFF, Google Drive API

---

## 🚀 系統核心亮點 (Core Highlights)

* **⚡ 極速載入**: 採用 **非同步並行處理 (Parallel Fetching)**，大幅減少 LIFF 初始化與個資同步的轉圈等待時間。
* **🛡️ 交易鎖機制**: 導入 **Firestore Transaction**，徹底解決多圖同時傳送時的「點數併發衝突 (Race Condition)」。
* **💎 精品級 UI**: 仿 iOS **毛玻璃質感 (Glassmorphism)**，內建數位通行證、隱藏式管理員切換鈕與 QR Code 渲染。
* **🔗 雲端直連**: 照片列表與列印佇列均支援 **點擊縮圖直接跳轉 Google Drive 高畫質原檔**。
* **📢 即時推播**: 管理員確認列印後，系統自動透過 **LINE Push Message** 通知用戶取件，實現無縫體驗。

---

## 🛠️ 技術架構 (System Architecture)



* **前端**: `Next.js 14 (App Router)` + `Tailwind CSS` + `framer-motion` (動畫預留)
* **後端**: `Vercel Serverless Functions` (Node.js 20+)
* **資料庫**: `Google Firestore` (儲存點數、照片 Metadata、點數交易日誌)
* **儲存**: `Google Drive API v3` (使用 GAS Web App 作為 Proxy 破解 Storage Quota 限制)
* **通訊**: `LINE Messaging API` (Webhook) + `LIFF v2` (Frontend SDK)

---

## ⚙️ 環境變數配置 (Environment Variables)

請在 **Vercel Dashboard** 設定中配置以下關鍵變數，缺一不可：

| 變數名稱 | 重要性 | 描述 |
| :--- | :---: | :--- |
| **`LINE_ACCESS_TOKEN`** | **必須** | LINE Messaging API 的 Channel Access Token |
| **`LINE_CHANNEL_SECRET`** | **必須** | LINE Messaging API 的 Channel Secret |
| **`NEXT_PUBLIC_LIFF_ID`** | **必須** | LINE LIFF ID (用於前端 `liff.init`) |
| **`FIREBASE_SERVICE_ACCOUNT`** | **必須** | Firebase 管理員金鑰 JSON (需注意換行符號 `\n`) |
| **`GAS_WEBAPP_URL`** | **必須** | Google Apps Script 部署後的 `/exec` 網址 |
| **`GOOGLE_DRIVE_FOLDER_ID`** | **必須** | 雲端硬碟存放照片的目標資料夾 ID |

---

## 👥 用戶功能模組 (User Modules)

1.  **【通行證】**: 顯示 **即時剩餘點數** 與個人識別 QR Code，設計採用深色漸層 VIP 風格。
2.  **【相簿】**: 列出個人上傳歷史，支援 **「待列印 / 已完成」** 狀態顯示，點擊可開啟雲端原圖。
3.  **【點數紀錄】**: 詳細列出 **時間、動作 (上傳/加點)、增減值、餘額**，確保帳目清清楚楚。

---

## 👑 管理員控制台 (Admin Console)

1.  **【列印區】**: 
    * 顯示全體同學待列印的照片縮圖。
    * 點擊 **「完成並通知」**：自動刪除資料庫紀錄，並發送 LINE 推播告知同學取件。
2.  **【用戶區】**: 
    * 同步顯示所有已登入用戶的 **LINE 頭像與暱稱**。
    * 即時監控全場點數分佈狀況。
3.  **【掃碼區】**: 
    * 呼叫 LINE 內建相機進行 QR 掃描。
    * **自動識別用戶身分**，支援一鍵加減點數並寫入交易日誌。

---

## 📂 檔案結構 (Project Structure)

```bash
├── app/
│   ├── api/             # API 路由邏輯
│   │   ├── admin/       # 管理員操作專用 API (GET/POST)
│   │   ├── user/        # 用戶資料、個資同步與點數日誌 API
│   │   └── webhook/     # LINE Webhook (處理影像訊息與 Transaction 扣點)
│   └── page.js          # 全功能單頁式應用程式 (SPA)
├── lib/
│   ├── firebaseAdmin.js # Firebase Admin SDK 初始化 (Server-side)
│   └── googleDrive.js   # 透過 GAS 轉傳 Google Drive 封裝邏輯
├── package.json         # 專案依賴 (react-qr-code, liff, next, etc.)
└── README.md            # 本文件
