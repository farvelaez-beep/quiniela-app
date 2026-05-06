'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Loader2, FileText } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErr(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error.message);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fondo con gradiente y patrón */}
      <div className="absolute inset-0 bg-black"></div>
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(239,68,68,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(163,230,53,0.15) 0%, transparent 40%), radial-gradient(circle at 50% 100%, rgba(251,191,36,0.1) 0%, transparent 50%)'
      }}></div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* HERO con look-and-feel Mundial */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-full px-5 py-2.5 text-xs uppercase tracking-widest text-zinc-300 mb-5">
              <span className="text-3xl leading-none">🇨🇦</span>
              <span className="text-3xl leading-none">🇺🇸</span>
              <span className="text-3xl leading-none">🇲🇽</span>
              <span className="text-zinc-500 mx-1">·</span>
              <span className="font-bold">11 JUN — 19 JUL 2026</span>
            </div>

            <h1 className="font-display text-7xl leading-[0.85] mb-2">
              <span className="block text-white">MUNDIAL</span>
              <span className="block bg-gradient-to-r from-lime-400 via-yellow-300 to-red-500 bg-clip-text text-transparent">2026</span>
            </h1>
            <div className="inline-block bg-lime-400 text-black px-3 py-0.5 font-display text-xl mt-2 -rotate-2 shadow-lg shadow-lime-400/20">QUINIELA</div>

            <p className="text-zinc-400 text-sm mt-5 max-w-xs mx-auto">
              48 selecciones · 16 ciudades · 1 campeón
            </p>
          </div>

          <form onSubmit={submit} className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h2 className="font-display text-3xl">ENTRAR</h2>

            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition" />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Contraseña</label>
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition" />
            </div>

            {err && <div className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-lime-400 hover:bg-lime-300 text-black font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
              ENTRAR
            </button>

            <div className="text-center text-sm text-zinc-400">
              ¿No tienes cuenta? <Link href="/register" className="text-lime-400 font-bold hover:underline">Regístrate</Link>
            </div>
          </form>

          {/* Link a las reglas */}
          <Link href="/rules" className="mt-4 flex items-center justify-center gap-2 text-zinc-500 hover:text-lime-400 text-sm transition">
            <FileText className="w-4 h-4" />
            Ver reglas de la quiniela
          </Link>
        </div>
      </div>
    </div>
  );
}
