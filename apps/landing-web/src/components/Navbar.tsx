import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, ChevronDown, LogOut } from 'lucide-react';

interface NavbarProps {
  isAuthenticated: boolean;
  onSignOut: () => void;
  userEmail: string;
}

const publicLinks = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Security', to: '/security' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Documentation', to: '/documentation' },
  { label: 'Contact', to: '/contact' }
];

const accountLinks = [
  { label: 'Overview', to: '/overview' },
  { label: 'Connectors', to: '/connectors' },
  { label: 'Agents', to: '/agents' },
  { label: 'Deployments', to: '/deployments' },
  { label: 'Profile', to: '/profile' },
  { label: 'Billing', to: '/billing' },
  { label: 'API Keys', to: '/api-keys' },
  { label: 'Downloads', to: '/downloads' },
  { label: 'Notifications', to: '/notifications' },
  { label: 'Docs', to: '/workspace-docs' },
  { label: 'Support', to: '/support' },
  { label: 'Settings', to: '/settings' }
];

export const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onSignOut, userEmail }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const initials = userEmail ? userEmail.charAt(0).toUpperCase() : 'A';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1220]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <NavLink to="/" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <span className="text-lg">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] uppercase text-indigo-300">CortexShield AI</p>
            <p className="text-base font-semibold text-white">Enterprise Security</p>
          </div>
        </NavLink>

        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <nav className="hidden items-center gap-6 overflow-x-auto text-sm font-semibold text-slate-300 lg:flex">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `transition ${isActive ? 'text-white' : 'hover:text-white'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {!isAuthenticated ? (
            <>
              <NavLink to="/signin" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white">
                Sign In
              </NavLink>
              <NavLink to="/get-started" className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-xl shadow-indigo-600/20 transition hover:bg-indigo-500">
                Get Started
              </NavLink>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-3 rounded-3xl border border-white/10 bg-[#111827]/90 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white">{initials}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full z-20 mt-3 w-56 overflow-hidden rounded-3xl border border-white/10 bg-[#111827]/95 p-2 shadow-2xl">
                    {accountLinks.map((item) => (
                      <button
                        key={item.to}
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate(item.to);
                        }}
                        className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/5"
                      >
                        {item.label}
                      </button>
                    ))}
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onSignOut();
                          navigate('/signin');
                        }}
                        className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-rose-300 transition hover:bg-white/5"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {menuOpen ? (
        <div className="lg:hidden border-t border-white/10 bg-[#0B1220]/95 px-6 py-5 text-sm text-slate-200">
          <div className="flex flex-col gap-3">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 transition ${isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            {!isAuthenticated ? (
              <>
                <NavLink
                  to="/signin"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  Sign In
                </NavLink>
                <NavLink
                  to="/get-started"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl bg-indigo-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-indigo-500"
                >
                  Get Started
                </NavLink>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/notifications');
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  Notifications
                </button>
                {accountLinks.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(item.to);
                    }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                    navigate('/signin');
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center font-semibold text-rose-300 transition hover:bg-white/10 hover:text-white"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
};
