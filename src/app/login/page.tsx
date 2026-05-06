'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block bg-lime-400 text-black px-4 py-1 font-display text-2xl mb-3 -rotate-2">QUINIELA</div>
          <h1 className="font-display text-7xl leading-none">MUNDIAL<br /><span className="text-lime-400">2026</span></h1>
        </div>

        <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-3xl">ENTRAR</h2>

          <div>
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Contraseña</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none" />
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
      </div>
    </div>
  );
}
