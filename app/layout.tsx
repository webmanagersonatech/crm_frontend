import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'

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
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnHover
          draggable
        />
      </body>
    </html>
  );
}
