'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
type Role = 'designer' | 'admin';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: '', email: '', password: '', confirm: '', role: 'designer' as Role,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [success, setSuccess] = useState('');

    async function submit() {
        setError('');
        if (!form.name || !form.email || !form.password) { setError('All fields are required'); return; }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
        if (form.password !== form.confirm) { setError('Passwords do not match'); return; }

        setLoading(true);
        try {
            const res  = await fetch(`${API}/api/auth/register`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.error || 'Registration failed'); setLoading(false); return; }

            localStorage.setItem('lamp_token', data.data.token);
            localStorage.setItem('lamp_user',  JSON.stringify(data.data.user));
            setSuccess(`Welcome, ${data.data.user.name}! Redirecting…`);
            setTimeout(() => router.push(data.data.user.role === 'admin' ? '/admin' : '/dashboard'), 1000);
        } catch {
            setError('Cannot reach server — is the backend running on port 4000?');
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full"
                     style={{ background: 'radial-gradient(circle,rgba(201,169,110,.05) 0%,transparent 70%)' }}/>
                <div className="absolute bottom-1/3 left-1/4 w-64 h-64 rounded-full"
                     style={{ background: 'radial-gradient(circle,rgba(78,205,196,.03) 0%,transparent 70%)' }}/>
            </div>

            <div className="animate-fade-up w-full max-w-sm mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/frontend/public">
                        <h1 className="font-display italic text-6xl text-gold mb-2 cursor-pointer hover:opacity-80 transition-opacity">lamp</h1>
                    </Link>
                    <p className="text-xs text-[--tm] tracking-widest uppercase">Interior Design Studio · Three.js 3D</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-base font-semibold text-cream mb-1">Create account</h2>
                    <p className="text-xs text-[--tm] mb-5">Join LAMP Studio and start designing</p>

                    <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-1.5">Full Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                           className="inp mb-3" placeholder="Alex Chen" autoComplete="name" />

                    <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-1.5">Email</label>
                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                           className="inp mb-3" placeholder="alex@studio.com" type="email" autoComplete="email" />

                    <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-1.5">Password</label>
                    <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                           className="inp mb-3" placeholder="Min 6 characters" type="password" autoComplete="new-password" />

                    <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-1.5">Confirm Password</label>
                    <input value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                           onKeyDown={e => e.key === 'Enter' && submit()}
                           className="inp mb-4" placeholder="Repeat password" type="password" autoComplete="new-password" />

                    {/* Role selector */}
                    <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-2">Role</label>
                    <div className="flex gap-2 mb-3">
                        {(['designer', 'admin'] as Role[]).map(r => (
                            <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase border transition-all ${
                                        form.role === r
                                            ? 'bg-gold/10 border-gold text-gold'
                                            : 'border-border text-[--tm] hover:border-[--gd] hover:text-cream'
                                    }`}>
                                {r === 'designer' ? '🎨 Designer' : '⚙️ Admin'}
                            </button>
                        ))}
                    </div>

                    <p className="text-[10px] text-[--tm] mb-4 bg-surface2 rounded-lg px-3 py-2 border border-[--bs]">
                        {form.role === 'designer'
                            ? '🎨 Designers can create, edit and visualize room designs.'
                            : '⚙️ Admins have full access including user management and analytics.'}
                    </p>

                    {error && (
                        <p className="text-xs text-error bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2 mb-3">
                            ⚠ {error}
                        </p>
                    )}
                    {success && (
                        <p className="text-xs text-[--ok] bg-green-950/20 border border-green-900/30 rounded-lg px-3 py-2 mb-3">
                            ✓ {success}
                        </p>
                    )}

                    <button onClick={submit} disabled={loading}
                            className="btn-gold w-full py-3 rounded-lg disabled:opacity-60">
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>

                    {/* Link back to login */}
                    <p className="text-center text-xs text-[--tm] mt-5">
                        Already have an account?{' '}
                        <Link href="/login" className="text-gold hover:text-[--gl] transition-colors font-medium">
                            Sign in →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
