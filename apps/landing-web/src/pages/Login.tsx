import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, ShieldAlert, Check, Sparkles, Globe, GitBranch } from 'lucide-react';

interface LoginProps {
  onSignIn: (email: string, rememberMe: boolean) => void;
  isAuthenticated: boolean;
  userEmail: string;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export const Login: React.FC<LoginProps> = ({ onSignIn, isAuthenticated, userEmail }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState(userEmail || 'name@company.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/overview', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const modeParam = params.get('mode');

    if (modeParam === 'signup') {
      setMode('signup');
    } else if (modeParam === 'forgot') {
      setMode('forgot');
    } else {
      setMode('signin');
    }
  }, [location.search]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords must match to create a secure workspace.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter a valid work email.');
      return;
    }

    if ((mode === 'signin' || mode === 'signup') && !password.trim()) {
      setError('Enter a password to continue.');
      return;
    }

    setLoading(true);

    window.setTimeout(() => {
      setLoading(false);
      if (mode === 'forgot') {
        setMessage(`Password reset instructions have been sent to ${email}.`);
        return;
      }

      onSignIn(email, rememberMe);
      navigate('/overview', { replace: true });
    }, 700);
  };

  const handleSocialSignIn = (provider: 'Google' | 'GitHub') => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onSignIn(`${provider.toLowerCase()}-user@agentos.ai`, rememberMe);
      navigate('/overview', { replace: true });
    }, 600);
  };

  return (
    <div className="relative flex min-h-screen items-stretch justify-center bg-[#0B1220] text-slate-100 overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] h-[800px] w-[800px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[800px] w-[800px] rounded-full bg-purple-500/5 blur-[150px] pointer-events-none" />

      <div className="flex w-full flex-col justify-between p-8 md:p-12 lg:w-[45%] lg:shrink-0 relative z-10">
        <div className="flex items-center gap-2.5 self-start">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 ring-1 ring-indigo-400">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading text-lg font-bold tracking-wider text-white">AgentOS</span>
          </Link>
        </div>

        <div className="my-auto mx-auto w-full max-w-sm">
          <div className="text-left">
            <h2 className="font-heading text-2xl font-extrabold text-white">
              {mode === 'signup' ? 'Create your workspace' : mode === 'forgot' ? 'Reset access' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-xs text-slate-400 leading-normal">
              {mode === 'signup'
                ? 'Create a secure workspace account for AgentOS.'
                : mode === 'forgot'
                  ? 'We will send a secure reset link for your workspace.'
                  : 'Enter your work email and password to sign into AgentOS.'}
            </p>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${mode === 'signin' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${mode === 'signup' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${mode === 'forgot' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
              Forgot
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSocialSignIn('Google')}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <Globe className="h-4 w-4" />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialSignIn('GitHub')}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <GitBranch className="h-4 w-4" />
              Continue with GitHub
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-left">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
              <div className="relative mt-2">
                <Mail className="absolute top-3 left-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-white/5 py-2.5 pr-4 pl-10 text-xs text-white outline-hidden transition-all hover:bg-white/7.5 focus:border-indigo-500 focus:bg-[#0B1220] focus:ring-1 focus:ring-indigo-500"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {mode !== 'forgot' ? (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                  {mode === 'signin' ? (
                    <button type="button" onClick={() => setMode('forgot')} className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300">
                      Forgot Password?
                    </button>
                  ) : null}
                </div>
                <div className="relative mt-2">
                  <Lock className="absolute top-3 left-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-white/5 py-2.5 pr-4 pl-10 text-xs text-white outline-hidden transition-all hover:bg-white/7.5 focus:border-indigo-500 focus:bg-[#0B1220] focus:ring-1 focus:ring-indigo-500"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>
            ) : null}

            {mode === 'signup' ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirm Password</label>
                <div className="relative mt-2">
                  <Lock className="absolute top-3 left-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-white/5 py-2.5 pr-4 pl-10 text-xs text-white outline-hidden transition-all hover:bg-white/7.5 focus:border-indigo-500 focus:bg-[#0B1220] focus:ring-1 focus:ring-indigo-500"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                    rememberMe ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-white/10 bg-white/5 text-transparent hover:border-white/20'
                  }`}
                >
                  <Check className="h-3 w-3" />
                </button>
                <span className="text-[11px] font-medium text-slate-400">Remember my session</span>
              </label>
            </div>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-400 transition-all hover:bg-indigo-500 hover:translate-y-[-1px] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Workspace' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-left">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Workspace access</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-300 leading-normal">
              Sign in to access your personal AgentOS workspace, manage billing, keys, documentation, and support.
            </p>
          </div>
        </div>

        <div className="text-left text-[10px] text-slate-500">
          &copy; {new Date().getFullYear()} AgentOS. Authorized enterprise access only.
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center border-l border-white/5 bg-[#111827]/10 relative overflow-hidden">
        <div className="absolute h-96 w-96 rounded-full bg-indigo-600/20 blur-[100px] animate-pulse-slow pointer-events-none" />

        <div className="w-full max-w-md p-8">
          <div className="glass-panel rounded-2xl border border-white/10 p-6 relative overflow-hidden text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                <ShieldAlert className="h-4.5 w-4.5 animate-bounce" />
              </div>
              <div>
                <span className="block text-xs font-bold text-white leading-none">Security Shield Active</span>
                <span className="text-[9px] text-red-400 mt-1 block">Threat Intercept Sequence Triggered</span>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl bg-[#111827]/80 border border-white/10 p-4">
                <p className="font-semibold text-white">Workspace productivity</p>
                <p className="mt-2 text-slate-400">Access your personal workspace, billing, documentation, and support in one polished experience.</p>
              </div>
              <div className="rounded-2xl bg-[#111827]/80 border border-white/10 p-4">
                <p className="font-semibold text-white">Secure access</p>
                <p className="mt-2 text-slate-400">Your credentials are stored locally in the browser and used only to unlock your workspace app.</p>
              </div>
              <div className="rounded-2xl bg-[#111827]/80 border border-white/10 p-4">
                <p className="font-semibold text-white">Ready for teams</p>
                <p className="mt-2 text-slate-400">Bring your team into AgentOS with shared workspace tools, documentation, and support.</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-[9px] text-slate-500 border-t border-white/5 pt-4">
              <span>Latency overhead: +12ms</span>
              <span>Model proxy: Claude-Sonnet-3.5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
