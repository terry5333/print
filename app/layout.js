import './globals.css';

export const metadata = {
  title: '畢旅列印通行證',
  description: '專屬照片上傳與集點系統',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
