import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CortexShield Portal",
  description: "AI Firewall & Graph Visualization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isClerkConfigured = Boolean(key && key.startsWith('pk_test_') && key.length > 30);

  const bodyContent = (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );

  if (isClerkConfigured) {
    return <ClerkProvider>{bodyContent}</ClerkProvider>;
  }

  return bodyContent;
}
