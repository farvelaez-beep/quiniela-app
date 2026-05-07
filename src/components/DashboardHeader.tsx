'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Lock, Loader2, Eye, Clock } from 'lucide-react';
import { formatLockAtMedellin } from '@/lib/lock';

export default function DashboardHeader({
  displayName, isAdmin, isLocked, lockAt,
}: {
  displayName: string;
  isAdmin: boolean;
  isLocked: boolean;
  lockAt?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // Inicializar fecha sólo en cliente para evitar hydration mismatch
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000); // refresca cada minuto
    return () => clearInterval(t);
  }, []);

  const logout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Calcular tiempo restante hasta el bloqueo automático
  const timeToLock = (() => {
    if (isLocked || !lockAt || !now) return null;
    const target = new Date(lockAt).getTime();
    const diff = target - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, mins };
  })();

  const tabs = [
    { href: '/dashboard', label: 'Fase de Grupos' },
    { href: '/dashboard/knockout', label: 'Eliminatorias' },
    { href: '/dashboard/bonus', label: 'Goleador & Campeón' },
    { href: '/dashboard/leaderboard', label: 'Tabla' },
    // La pestaña de "Pronósticos de todos" sólo aparece cuando está bloqueada la quiniela
    ...(isLocked ? [{ href: '/dashboard/all-predictions', label: 'Todos los Pronósticos' }] : []),
    { href: '/rules', label: 'Reglas' },
    ...(isAdmin ? [
      { href: '/dashboard/admin', label: 'Resultados (Admin)' },
      { href: '/dashboard/admin/knockout', label: 'Bracket (Admin)' },
      { href: '/dashboard/admin/players', label: 'Gestión (Admin)' },
    ] : []),
  ];

  return (
    <header className="border-b border-zinc-800 sticky top-0 bg-black/95 backdrop-blur z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-full px-2.5 py-1">
            <span className="text-xl leading-none">🇨🇦</span>
            <span className="text-xl leading-none">🇺🇸</span>
            <span className="text-xl leading-none">🇲🇽</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl text-white leading-none">MUNDIAL</span>
            <span className="font-display text-2xl bg-gradient-to-r from-lime-400 via-yellow-300 to-red-500 bg-clip-text text-transparent leading-none">2026</span>
          </div>
          <div className="bg-lime-400 text-black px-1.5 py-0.5 font-display text-xs -rotate-3 hidden lg:block leading-none">QUINIELA</div>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-300 font-medium hidden sm:inline">{isAdmin && '👑 '}{displayName}</span>
          <button onClick={logout} disabled={loggingOut} className="text-zinc-400 hover:text-white disabled:opacity-50" title="Salir">
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin"/> : <LogOut className="w-4 h-4"/>}
          </button>
        </div>
      </div>
      <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <Link key={t.href} href={t.href}
            className={`px-4 py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition flex items-center gap-1.5 ${
              pathname === t.href ? 'border-lime-400 text-white' : 'border-transparent text-zinc-500 hover:text-white'
            }`}>
            {t.href === '/dashboard/all-predictions' && <Eye className="w-3.5 h-3.5"/>}
            {t.label}
          </Link>
        ))}
      </nav>
      {isLocked && (
        <div className="bg-yellow-500/10 border-t border-yellow-500/30 text-yellow-400 text-center py-2 text-sm font-medium">
          <Lock className="w-4 h-4 inline mr-2"/>Las predicciones están bloqueadas. Solo lectura.
        </div>
      )}
      {!isLocked && timeToLock && lockAt && (
        <div className="bg-lime-500/10 border-t border-lime-500/30 text-lime-300 text-center py-2 text-xs font-medium">
          <Clock className="w-3.5 h-3.5 inline mr-1.5"/>
          Bloqueo automático en{' '}
          <strong className="text-lime-400">
            {timeToLock.days > 0 && `${timeToLock.days}d `}
            {timeToLock.hours}h {timeToLock.mins}min
          </strong>
          {' '}— {formatLockAtMedellin(lockAt)} (Medellín)
        </div>
      )}
    </header>
  );
}
