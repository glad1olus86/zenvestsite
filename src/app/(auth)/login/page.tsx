'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Неверный email или пароль');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-mesh p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-4 animate-pulse-glow">
            <Building2 size={32} className="text-accent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Zenvest</h1>
          <p className="text-muted mt-2">Управление монтажными объектами</p>
        </div>

        {/* Login card */}
        <div className="glass-strong p-8">
          <h2 className="text-xl font-semibold mb-6">Вход в систему</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-muted mb-2">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zenvest.cz"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10
                    text-foreground placeholder:text-muted/50 outline-none
                    focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Пароль</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10
                    text-foreground placeholder:text-muted/50 outline-none
                    focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium
                flex items-center justify-center gap-2 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer glow-green-hover"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Войти
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted/60 mt-6">
          Zenvest Construction Management System
        </p>
      </div>
    </div>
  );
}
