import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ONE STOP GADAI EMAS SYARIAH — Bank Mitra Syariah Ponorogo",
  description:
    "Sistem Terpadu Penaksiran, Pemutusan & Pencetakan Dokumen Operasional Gadai Emas Syariah",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F6F7F5] text-[#1B2420]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
