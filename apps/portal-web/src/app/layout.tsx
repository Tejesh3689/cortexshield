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
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || DUMMY_CLERK_KEY;

  return (
    <ClerkProvider publishableKey={key}>
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
