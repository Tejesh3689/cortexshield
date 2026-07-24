"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/lookup", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.provider === 'workos') {
        // Redirect to WorkOS auth endpoint
        window.location.href = `/api/auth/workos?org_id=${data.org_id}`;
      } else {
        // Redirect to Clerk sign-in
        router.push("/sign-in");
      }
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">Sign in to CortexShield</h1>
        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Work Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
