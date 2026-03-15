'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm]       = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    async function submit() {
        if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
        setError(''); setLoading(true);
        try {
            const res  = await fetch(`${API}/api/auth/login`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!data.success) { setError(data.error || 'Login failed'); setLoading(false); return; }
            localStorage.setItem('lamp_token', data.data.token);
            localStorage.setItem('lamp_user',  JSON.stringify(data.data.user));
            router.push(data.data.user.role === 'admin' ? '/admin' : '/dashboard');
        } catch {
            setError('Cannot reach server — is the backend running on port 4000?');
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
                     style={{ background: 'radial-gradient(circle,rgba(201,169,110,.05) 0%,transparent 70%)' }}/>
                <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full"
                     style={{ background: 'radial-gradient(circle,rgba(78,205,196,.03) 0%,transparent 70%)' }}/>
            </div>

            <div className="animate-fade-up w-full max-w-sm mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <h1 className="font-display italic text-6xl text-gold mb-2 cursor-pointer hover:opacity-80 transition-opacity">lamp</h1>
                    </Link>
                    <p className="text-xs text-[--tm] tracking-widest uppercase">Interior Design Studio · Three.js 3D</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-base font-semibold text-cream mb-1">Welcome back</h2>
                    <p className="text-xs text-[--tm] mb-5">Sign in to your design portfolio</p>

                    <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-1.5">Email</label>
                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                           className="inp mb-3" placeholder="email@example.com" type="email" autoComplete="email" />

                    <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-1.5">Password</label>
                    <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                           onKeyDown={e => e.key === 'Enter' && submit()}
                           className="inp mb-4" placeholder="••••••••" type="password" autoComplete="current-password" />

                    {error && (
                        <p className="text-xs text-error bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2 mb-3">
                            ⚠ {error}
                        </p>
                    )}

                    <button onClick={submit} disabled={loading}
                            className="btn-gold w-full py-3 rounded-lg disabled:opacity-60">
                        {loading ? 'Signing in…' : 'Sign In to Studio'}
                    </button>

                    {/* Link to register */}
                    <p className="text-center text-xs text-[--tm] mt-5">
                        No account?{' '}
                        <Link href="/register" className="text-gold hover:text-[--gl] transition-colors font-medium">
                            Create one →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
