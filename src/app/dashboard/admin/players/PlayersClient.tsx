'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Player = {
  id: string; email: string; name: string; phone: string;
  fullName: string | null;
  paid: boolean; isAdmin: boolean; createdAt: string;
};

export default function PlayersClient({
  players, entryFee, currency,
}: { players: Player[]; entryFee: number; currency: string }) {
  const router = useRouter();
  const [fee, setFee] = useState(entryFee.toString());
  const [curr, setCurr] = useState(currency);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingFee, setSavingFee] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);

  const collected = players.filter(p => p.paid).length * entryFee;
  const totalPot = players.length * entryFee;

  const togglePaid = async (id: string, currentPaid: boolean) => {
    setBusyId(id);
    const supabase = createClient();
    await supabase.from('profiles').update({ paid: !currentPaid }).eq('id', id);
    setBusyId(null);
    router.refresh();
  };

  const removePlayer = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a ${name}? Esto borra también sus pronósticos. La cuenta de auth seguirá existiendo.`)) return;
    setBusyId(id);
    const supabase = createClient();
    await supabase.from('profiles').delete().eq('id', id);
    setBusyId(null);
    router.refresh();
  };

  const saveFee = async () => {
    setSavingFee(true);
    const supabase = createClient();
    await supabase.from('tournament_settings').update({
      entry_fee: parseInt(fee) || 0, currency: curr,
    }).eq('id', 1);
    setSavingFee(false);
    setFeeSaved(true);
    setTimeout(() => setFeeSaved(false), 2000);
    router.refresh();
  };

  return (
    <div>
      <h2 className="font-display text-5xl leading-none mb-1">GESTIÓN</h2>
      <p className="text-zinc-400 text-sm mb-6">Configuración de la quiniela y administración de jugadores</p>

      {/* Configuración */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <h3 className="font-display text-2xl mb-4">CONFIGURACIÓN</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Cuota de entrada</label>
            <input value={fee} onChange={e=>setFee(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Moneda</label>
            <select value={curr} onChange={e=>setCurr(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white">
              <option>COP</option><option>USD</option><option>MXN</option><option>EUR</option><option>ARS</option>
            </select>
          </div>
        </div>
        <button onClick={saveFee} disabled={savingFee}
          className="mt-3 bg-lime-400 text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
          {feeSaved ? <Check className="w-4 h-4"/> : savingFee ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
          {feeSaved ? 'Guardado' : 'Guardar configuración'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Jugadores" value={players.length.toString()} />
        <Stat label={`Recaudado (${currency})`} value={collected.toLocaleString('es-CO')} />
        <Stat label={`Pozo total (${currency})`} value={totalPot.toLocaleString('es-CO')} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {players.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">No hay jugadores aún</div>
        ) : players.map(p => (
          <div key={p.id} className="px-4 py-3 border-b border-zinc-800 last:border-0 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-bold flex items-center gap-2">
                {p.name} {p.isAdmin && <span className="text-yellow-400 text-xs">👑 ADMIN</span>}
                {p.fullName && p.fullName !== p.name && (
                  <span className="text-zinc-400 text-xs font-normal">· {p.fullName}</span>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                {p.email}{p.phone && <> · 📱 {p.phone}</>} · Registrado: {new Date(p.createdAt).toLocaleDateString('es-CO')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>togglePaid(p.id, p.paid)} disabled={busyId === p.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase disabled:opacity-50 ${
                  p.paid ? 'bg-lime-400 text-black' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                {busyId === p.id ? <Loader2 className="w-3 h-3 animate-spin inline"/> : (p.paid ? '✓ Pagó' : 'No pagó')}
              </button>
              {!p.isAdmin && (
                <button onClick={()=>removePlayer(p.id, p.name)} disabled={busyId === p.id}
                  className="text-zinc-600 hover:text-red-400 text-xs disabled:opacity-50">Eliminar</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="font-display text-3xl text-lime-400 leading-none">{value}</div>
      <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">{label}</div>
    </div>
  );
}
