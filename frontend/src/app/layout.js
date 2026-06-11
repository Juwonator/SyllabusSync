import "./globals.css";

export const metadata = {
  title: "SyllabusSync",
  description: "Gamified learning for WAEC, NECO and JAMB students",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}