import type { Metadata } from "next";
export const metadata: Metadata = { title: "StudyCore Reports" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: "#f9fafb" }}>
        {children}
      </body>
    </html>
  );
}
