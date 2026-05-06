'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Lock } from 'lucide-react';

export default function DashboardHeader({
  displayName, isAdmin, isLocked,
}: { displayName: string; isAdmin: boolean; isLocked: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const tabs = [
    { href: '/dashboard', label: 'Fase de Grupos' },
    { href: '/dashboard/bonus', label: 'Goleador & Campeón' },
    { href: '/dashboard/leaderboard', label: 'Tabla' },
    ...(isAdmin ? [
      { href: '/dashboard/admin', label: 'Resultados (Admin)' },
      { href: '/dashboard/admin/players', label: 'Gestión (Admin)' },
    ] : []),
  ];

  return (
    <header className="border-b border-zinc-800 sticky top-0 bg-black/95 backdrop-blur z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="bg-lime-400 text-black px-2 py-0.5 font-display text-lg leading-none">Q26</div>
          <div className="font-display text-2xl leading-none hidden sm:block">QUINIELA MUNDIAL</div>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-300 font-medium">{isAdmin && '👑 '}{displayName}</span>
          <button onClick={logout} className="text-zinc-400 hover:text-white" title="Salir">
            <LogOut className="w-4 h-4"/>
          </button>
        </div>
      </div>
      <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <Link key={t.href} href={t.href}
            className={`px-4 py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition ${
              pathname === t.href ? 'border-lime-400 text-white' : 'border-transparent text-zinc-500 hover:text-white'
            }`}>
            {t.label}
          </Link>
        ))}
      </nav>
      {isLocked && (
        <div className="bg-yellow-500/10 border-t border-yellow-500/30 text-yellow-400 text-center py-2 text-sm font-medium">
          <Lock className="w-4 h-4 inline mr-2"/>Las predicciones están bloqueadas. Solo lectura.
        </div>
      )}
    </header>
  );
}
