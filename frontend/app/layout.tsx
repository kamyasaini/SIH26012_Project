import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SIH26012: AI 3D Cadastral & Encroachment Engine",
  description:
    "AI-driven 3D cadastral mapping and land encroachment detection from drone orthomosaics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="h-screen overflow-hidden font-sans antialiased">{children}</body>
    </html>
  );
}
