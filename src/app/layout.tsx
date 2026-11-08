import type { Metadata } from "next";
import "./globals.css";
import AdminHotkey from "@/components/AdminHotkey";

export const metadata: Metadata = {
  title: "Kyorix Athlete ID Card Generation System",
  description: "Centralized Athlete ID Card Platform - Kyorix Sports Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AdminHotkey />
        {children}
      </body>
    </html>
  );
}

