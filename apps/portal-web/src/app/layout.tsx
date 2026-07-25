import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CortexShield Portal",
  description: "AI Firewall & Graph Visualization",
};

const DUMMY_CLERK_KEY = "pk_test_Y29ydGV4c2hpZWxkLWRldmVsb3BtZW50LXBsYWNlaG9sZGVyLWtleSQ";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const envKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isClerkConfigured = Boolean(envKey && envKey.startsWith("pk_") && envKey !== DUMMY_CLERK_KEY && envKey.length > 30);
  const publishableKey = envKey || DUMMY_CLERK_KEY;

  const bodyContent = (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );

  if (isClerkConfigured) {
    return <ClerkProvider publishableKey={publishableKey}>{bodyContent}</ClerkProvider>;
  }

  return bodyContent;
}
