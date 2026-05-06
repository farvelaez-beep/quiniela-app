'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Save, Loader2, Check, Trophy } from 'lucide-react';
import { BRACKET, PHASE_LABELS, PHASE_SHORT, type BracketMatch } from '@/lib/bracket';
import { createClient } from '@/lib/supabase/client';

type Score = { home_score: number | ''; away_score: number | '' };

export default function KnockoutAdminClient({
  initialResults,
}: { initialResults: Record<string, { home_score: number; away_score: number }> }) {
  const router = useRouter();

  const [scores, setScores] = useState<Record<string, Score>>(() => {
    const m: Record<string, Score> = {};
    BRACKET.forEach(km => {
      const r = initialResults[km.id];
      m[km.id] = r ? { home_score: r.home_score, away_score: r.away_score } : { home_score: '', away_score: '' };
    });
    return m;
  });
  const [openPhase, setOpenPhase] = useState<BracketMatch['phase'] | null>('r32');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const updateScore = (matchId: string, side: 'home_score'|'away_score', val: string) => {
    if (val !== '' && (isNaN(+val) || +val < 0 || +val > 30)) return;
    const cur = scores[matchId] ?? { home_score: '' as const, away_score: '' as const };
    setScores({ ...scores, [matchId]: { ...cur, [side]: val === '' ? '' : +val } });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const rows = Object.entries(scores)
      .filter(([_, s]) => s.home_score !== '' && s.away_score !== '')
      .map(([match_id, s]) => ({
        match_id,
        home_score: s.home_score as number,
        away_score: s.away_score as number,
      }));
    if (rows.length > 0) {
      await supabase.from('match_results').upsert(rows, { onConflict: 'match_id' });
    }
    setSaving(false);
    setDirty(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
    router.refresh();
  };

  const phasesInOrder: BracketMatch['phase'][] = ['r32', 'r16', 'qf', 'sf', 'tp', 'final'];

  return (
    <div className="pb-24">
      <div className="mb-6">
        <h2 className="font-display text-5xl leading-none">RESULTADOS ELIMINATORIAS (ADMIN)</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Carga los marcadores oficiales de cada partido eliminatorio. Los puntos se calculan automáticamente para cada jugador.
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 text-blue-200 rounded-lg p-4 mb-4 text-sm">
        <strong>Cómo funciona:</strong> El bracket de cada jugador se arma solo con sus predicciones de grupos. Tú solo cargas los marcadores reales (R32 #1: 2-1, R32 #2: 0-3, etc.) y el sistema calcula los puntos contra las predicciones de cada uno.
      </div>

      <div className="space-y-3">
        {phasesInOrder.map(phaseKey => {
          const phaseMatches = BRACKET.filter(m => m.phase === phaseKey);
          const filled = phaseMatches.filter(m => {
            const s = scores[m.id]; return s && s.home_score !== '' && s.away_score !== '';
          }).length;
          const isOpen = openPhase === phaseKey;

          return (
            <div key={phaseKey} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <button onClick={() => setOpenPhase(isOpen ? null : phaseKey)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition">
                <div className="flex items-center gap-4 text-left">
                  <div className="font-display text-3xl text-lime-400 leading-none">
                    {PHASE_LABELS[phaseKey].toUpperCase()}
                  </div>
                  <div className="text-xs text-zinc-500 uppercase font-bold">
                    {filled}/{phaseMatches.length} cargados
                  </div>
                  {phaseKey === 'final' && <Trophy className="w-5 h-5 text-yellow-400"/>}
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 p-4 space-y-3">
                  {phaseMatches.map(m => {
                    const s = scores[m.id] ?? { home_score: '', away_score: '' };
                    return (
                      <div key={m.id} className="bg-black/40 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
                            {PHASE_SHORT[m.phase]} #{m.position}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(m.match_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-zinc-400 text-sm">Local</span>
                          <input
                            type="number" min="0" max="30"
                            value={s.home_score}
                            onChange={e => updateScore(m.id, 'home_score', e.target.value)}
                            className="w-14 h-12 bg-black border border-zinc-700 rounded text-center font-display text-2xl text-lime-400"
                            placeholder="-"
                          />
                          <span className="text-zinc-600 text-2xl">:</span>
                          <input
                            type="number" min="0" max="30"
                            value={s.away_score}
                            onChange={e => updateScore(m.id, 'away_score', e.target.value)}
                            className="w-14 h-12 bg-black border border-zinc-700 rounded text-center font-display text-2xl text-lime-400"
                            placeholder="-"
                          />
                          <span className="text-zinc-400 text-sm">Visitante</span>
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
            Guardar resultados
          </button>
        ) : null}
      </div>
    </div>
  );
}
