import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface PublicLayoutProps {
  isAuthenticated: boolean;
  onSignOut: () => void;
  userEmail: string;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ isAuthenticated, onSignOut, userEmail }) => (
  <div className="relative min-h-screen overflow-hidden bg-[#0B1220] text-slate-100">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.14),_transparent_20%)]" />
    <Navbar isAuthenticated={isAuthenticated} onSignOut={onSignOut} userEmail={userEmail} />
    <main className="relative z-10 min-h-[calc(100vh-5rem)]">
      <Outlet />
    </main>
    <Footer />
  </div>
);
