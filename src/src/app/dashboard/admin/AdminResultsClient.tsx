'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Save, Loader2, Lock, Unlock, Check } from 'lucide-react';
import { GROUPS, ALL_MATCHES, ALL_TEAMS, TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { createClient } from '@/lib/supabase/client';

type Score = { home_score: number | ''; away_score: number | '' };

export default function AdminResultsClient({
  initialResults, initialLocked, initialTopScorer, initialChampion,
}: {
  initialResults: Record<string, { home_score: number; away_score: number }>;
  initialLocked: boolean; initialTopScorer: string; initialChampion: string;
}) {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, Score>>(() => {
    const m: Record<string, Score> = {};
    Object.entries(initialResults).forEach(([k, v]) => { m[k] = v; });
    return m;
  });
  const [topScorer, setTopScorer] = useState(initialTopScorer);
  const [champion, setChampion] = useState(initialChampion);
  const [locked, setLocked] = useState(initialLocked);
  const [openGroup, setOpenGroup] = useState<string | null>('A');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [togglingLock, setTogglingLock] = useState(false);

  const updateMatch = (id: string, side: 'home_score'|'away_score', val: string) => {
    if (val !== '' && (isNaN(+val) || +val < 0 || +val > 30)) return;
    const cur = results[id] ?? { home_score: '' as const, away_score: '' as const };
    setResults({ ...results, [id]: { ...cur, [side]: val === '' ? '' : +val } });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const supabase = createClient();

    const rows = Object.entries(results)
      .filter(([_, s]) => s.home_score !== '' && s.away_score !== '')
      .map(([match_id, s]) => ({ match_id, home_score: s.home_score as number, away_score: s.away_score as number }));
    if (rows.length > 0) {
      await supabase.from('match_results').upsert(rows, { onConflict: 'match_id' });
    }

    await supabase.from('tournament_settings').update({
      official_top_scorer: topScorer.trim() || null,
      official_champion: champion || null,
    }).eq('id', 1);

    setSaving(false);
    setDirty(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
    router.refresh();
  };

  const toggleLock = async () => {
    setTogglingLock(true);
    const supabase = createClient();
    const newLocked = !locked;
    await supabase.from('tournament_settings').update({ is_locked: newLocked }).eq('id', 1);
    setLocked(newLocked);
    setTogglingLock(false);
    router.refresh();
  };

  const sortedTeams = [...ALL_TEAMS].sort((a,b) => TEAMS_ES[a].localeCompare(TEAMS_ES[b]));

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-5xl leading-none">RESULTADOS OFICIALES</h2>
          <p className="text-zinc-400 text-sm mt-1">Carga los marcadores reales para que se calculen los puntos</p>
        </div>
        <button onClick={toggleLock} disabled={togglingLock}
          className={`px-4 py-2 rounded-lg font-bold uppercase text-sm flex items-center gap-2 disabled:opacity-50 ${
            locked ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}>
          {togglingLock ? <Loader2 className="w-4 h-4 animate-spin"/> : (locked ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>)}
          {locked ? 'Bloqueado' : 'Bloquear quiniela'}
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4 grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Goleador oficial</label>
          <input value={topScorer} onChange={e=>{setTopScorer(e.target.value); setDirty(true)}}
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white"
            placeholder="Nombre exacto" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Campeón oficial</label>
          <select value={champion} onChange={e=>{setChampion(e.target.value); setDirty(true)}}
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white">
            <option value="">— Sin definir —</option>
            {sortedTeams.map(t => <option key={t} value={t}>{FLAG[t]} {TEAMS_ES[t]}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(GROUPS).map(([gKey]) => {
          const matches = ALL_MATCHES.filter(m => m.group === gKey);
          const filled = matches.filter(m => {
            const r = results[m.id]; return r && r.home_score !== '' && r.away_score !== '';
          }).length;
          const isOpen = openGroup === gKey;
          return (
            <div key={gKey} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <button onClick={()=>setOpenGroup(isOpen?null:gKey)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50">
                <div className="flex items-center gap-4">
                  <div className="font-display text-3xl text-lime-400 leading-none">GRUPO {gKey}</div>
                  <div className="text-xs text-zinc-500 uppercase font-bold">{filled}/6 cargados</div>
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
              </button>
              {isOpen && (
                <div className="border-t border-zinc-800 p-4 space-y-2">
                  {matches.map(m => {
                    const r = results[m.id] ?? { home_score: '', away_score: '' };
                    return (
                      <div key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium text-right">{TEAMS_ES[m.home]}</span>
                          <span className="text-xl">{FLAG[m.home]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" max="30"
                            value={r.home_score} onChange={e=>updateMatch(m.id,'home_score',e.target.value)}
                            className="w-12 h-10 bg-black border border-zinc-700 rounded text-center font-display text-xl text-lime-400" />
                          <span className="text-zinc-600">:</span>
                          <input type="number" min="0" max="30"
                            value={r.away_score} onChange={e=>updateMatch(m.id,'away_score',e.target.value)}
                            className="w-12 h-10 bg-black border border-zinc-700 rounded text-center font-display text-xl text-lime-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{FLAG[m.away]}</span>
                          <span className="font-medium">{TEAMS_ES[m.away]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        {savedAt ? (
          <div className="bg-lime-500 text-black px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2">
            <Check className="w-4 h-4"/>Guardado
          </div>
        ) : dirty ? (
          <button onClick={save} disabled={saving}
            className="bg-lime-400 text-black px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            Guardar cambios
          </button>
        ) : null}
      </div>
    </div>
  );
}
