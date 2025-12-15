import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "HIKA CRM",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          fontFamily:
            "'Inter', 'Roboto', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        {children}
        <Toaster position="top-right" reverseOrder={false} />
      </body>
    </html>
  );
}
