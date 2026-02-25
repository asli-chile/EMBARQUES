import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { AppShell } from "@/components/layout";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: "EMBARQUES - Logística y Comercio Exterior",
  description: "Logística y Comercio Exterior",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={openSans.variable}>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
