'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Save, Loader2, Check } from 'lucide-react';
import { GROUPS, ALL_MATCHES, TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { createClient } from '@/lib/supabase/client';

type Score = { home_score: number | ''; away_score: number | '' };
type PredMap = Record<string, Score>;

export default function GroupStageClient({
  initialPredictions, locked, userId,
}: { initialPredictions: Record<string, { home_score: number; away_score: number }>; locked: boolean; userId: string }) {
  const [draft, setDraft] = useState<PredMap>(() => {
    const m: PredMap = {};
    Object.entries(initialPredictions).forEach(([k, v]) => { m[k] = v; });
    return m;
  });
  const [openGroup, setOpenGroup] = useState<string | null>('A');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const update = (id: string, side: 'home_score' | 'away_score', val: string) => {
    if (locked) return;
    if (val !== '' && (isNaN(+val) || +val < 0 || +val > 30)) return;
    const cur = draft[id] ?? { home_score: '' as const, away_score: '' as const };
    setDraft({ ...draft, [id]: { ...cur, [side]: val === '' ? '' : +val } });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    // Solo guardamos los completos
    const rows = Object.entries(draft)
      .filter(([_, s]) => s.home_score !== '' && s.away_score !== '')
      .map(([match_id, s]) => ({
        user_id: userId, match_id,
        home_score: s.home_score as number,
        away_score: s.away_score as number,
      }));
    if (rows.length > 0) {
      await supabase.from('match_predictions').upsert(rows, { onConflict: 'user_id,match_id' });
    }
    setSaving(false);
    setDirty(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  };

  const filledCount = Object.values(draft).filter(m => m.home_score !== '' && m.away_score !== '').length;

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-5xl leading-none">FASE DE GRUPOS</h2>
          <p className="text-zinc-400 text-sm mt-1">72 partidos · Marcador exacto = 3 pts · Resultado correcto = 1 pt</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-3xl text-lime-400 leading-none">
              {filledCount}<span className="text-zinc-600 text-2xl">/72</span>
            </div>
            <div className="text-xs text-zinc-500 uppercase">Pronosticados</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(GROUPS).map(([gKey, teams]) => {
          const matches = ALL_MATCHES.filter(m => m.group === gKey);
          const groupFilled = matches.filter(m => {
            const d = draft[m.id]; return d && d.home_score !== '' && d.away_score !== '';
          }).length;
          const isOpen = openGroup === gKey;

          return (
            <div key={gKey} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <button onClick={()=>setOpenGroup(isOpen?null:gKey)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition">
                <div className="flex items-center gap-4">
                  <div className="font-display text-3xl text-lime-400 leading-none">GRUPO {gKey}</div>
                  <div className="flex gap-1.5 text-xl">{teams.map(t => <span key={t}>{FLAG[t]}</span>)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-zinc-500 uppercase font-bold">{groupFilled}/6</div>
                  {isOpen ? <ChevronDown className="w-5 h-5 text-zinc-400"/> : <ChevronRight className="w-5 h-5 text-zinc-400"/>}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 p-4 space-y-2">
                  {[1,2,3].map(md => (
                    <div key={md}>
                      <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 mt-2">Jornada {md}</div>
                      {matches.filter(m => m.matchday === md).map(m => {
                        const d = draft[m.id] ?? { home_score: '', away_score: '' };
                        return (
                          <div key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-medium text-right">{TEAMS_ES[m.home]}</span>
                              <span className="text-xl">{FLAG[m.home]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="number" min="0" max="30" disabled={locked}
                                value={d.home_score} onChange={e=>update(m.id,'home_score',e.target.value)}
                                className="w-12 h-10 bg-black border border-zinc-700 rounded text-center font-display text-xl text-lime-400 focus:border-lime-400 focus:outline-none disabled:opacity-50" />
                              <span className="text-zinc-600">:</span>
                              <input type="number" min="0" max="30" disabled={locked}
                                value={d.away_score} onChange={e=>update(m.id,'away_score',e.target.value)}
                                className="w-12 h-10 bg-black border border-zinc-700 rounded text-center font-display text-xl text-lime-400 focus:border-lime-400 focus:outline-none disabled:opacity-50" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{FLAG[m.away]}</span>
                              <span className="font-medium">{TEAMS_ES[m.away]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!locked && (
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
      )}
    </div>
  );
}
