'use client';

import { useState } from 'react';
import { Target, Crown, Save, Loader2, Check, CheckCircle2, XCircle } from 'lucide-react';
import { ALL_TEAMS, TEAMS_ES, FLAG, TOP_SCORER_SUGGESTIONS } from '@/lib/tournament-data';
import { createClient } from '@/lib/supabase/client';

export default function BonusClient({
  initial, locked, userId, officialTopScorer, officialChampion,
}: {
  initial: { top_scorer: string; champion: string };
  locked: boolean;
  userId: string;
  officialTopScorer: string | null;
  officialChampion: string | null;
}) {
  const [scorer, setScorer] = useState(initial.top_scorer);
  const [champion, setChampion] = useState(initial.champion);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('bonus_predictions').upsert({
      user_id: userId,
      top_scorer: scorer.trim() || null,
      champion: champion || null,
    }, { onConflict: 'user_id' });
    setSaving(false);
    setDirty(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  };

  const sortedTeams = [...ALL_TEAMS].sort((a,b) => TEAMS_ES[a].localeCompare(TEAMS_ES[b]));

  // Verificación de aciertos
  const scorerCorrect = !!officialTopScorer && !!scorer.trim() &&
    officialTopScorer.trim().toLowerCase() === scorer.trim().toLowerCase();
  const championCorrect = !!officialChampion && !!champion && officialChampion === champion;

  return (
    <div>
      <h2 className="font-display text-5xl leading-none mb-1">BONUS</h2>
      <p className="text-zinc-400 text-sm mb-8">+5 pts por cada acierto · Acertar ambos te da 10 pts adicionales</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-lime-400 text-black p-2 rounded-lg"><Target className="w-5 h-5"/></div>
            <h3 className="font-display text-3xl">GOLEADOR DEL TORNEO</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-4">¿Quién será la Bota de Oro?</p>
          <input value={scorer} disabled={locked}
            onChange={e=>{setScorer(e.target.value); setDirty(true)}}
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white font-medium focus:border-lime-400 focus:outline-none disabled:opacity-50"
            placeholder="Ej: Lionel Messi" />
          <div className="mt-3">
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Sugerencias</div>
            <div className="flex flex-wrap gap-1.5">
              {TOP_SCORER_SUGGESTIONS.map(s => (
                <button key={s} disabled={locked} onClick={()=>{setScorer(s); setDirty(true)}}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    scorer===s ? 'bg-lime-400 text-black border-lime-400' : 'border-zinc-700 text-zinc-400 hover:border-lime-400 hover:text-lime-400'
                  } disabled:opacity-50`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Resultado oficial sutil */}
          {officialTopScorer && (
            <div className="mt-4 pt-4 border-t border-zinc-800 text-xs flex items-center justify-between text-zinc-500">
              <span>Goleador oficial: <span className="text-zinc-300 font-medium">{officialTopScorer}</span></span>
              {scorerCorrect ? (
                <span className="text-lime-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>+5 pts</span>
              ) : (
                <span className="text-zinc-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/>+0 pts</span>
              )}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-lime-400 text-black p-2 rounded-lg"><Crown className="w-5 h-5"/></div>
            <h3 className="font-display text-3xl">CAMPEÓN</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-4">¿Quién levantará la Copa el 19 de julio en MetLife Stadium?</p>
          <select value={champion} disabled={locked}
            onChange={e=>{setChampion(e.target.value); setDirty(true)}}
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white font-medium focus:border-lime-400 focus:outline-none disabled:opacity-50">
            <option value="">— Selecciona un país —</option>
            {sortedTeams.map(t => <option key={t} value={t}>{FLAG[t]} {TEAMS_ES[t]}</option>)}
          </select>
          {champion && (
            <div className="mt-4 p-4 bg-black border border-lime-400/30 rounded-lg flex items-center gap-3">
              <span className="text-4xl">{FLAG[champion]}</span>
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500">Tu apuesta</div>
                <div className="font-display text-2xl text-lime-400">{TEAMS_ES[champion]}</div>
              </div>
            </div>
          )}

          {/* Resultado oficial sutil */}
          {officialChampion && (
            <div className="mt-4 pt-4 border-t border-zinc-800 text-xs flex items-center justify-between text-zinc-500">
              <span>Campeón oficial: <span className="text-zinc-300 font-medium">{FLAG[officialChampion]} {TEAMS_ES[officialChampion]}</span></span>
              {championCorrect ? (
                <span className="text-lime-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>+5 pts</span>
              ) : (
                <span className="text-zinc-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/>+0 pts</span>
              )}
            </div>
          )}
        </div>
      </div>

      {!locked && (
        <div className="mt-6">
          {savedAt ? (
            <div className="bg-lime-500 text-black py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
              <Check className="w-4 h-4"/>Guardado
            </div>
          ) : (
            <button onClick={save} disabled={!dirty || saving}
              className={`w-full py-3 rounded-lg font-bold uppercase tracking-wide flex items-center justify-center gap-2 ${
                dirty ? 'bg-lime-400 text-black hover:bg-lime-300' : 'bg-zinc-800 text-zinc-500'
              } disabled:opacity-50`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              Guardar Bonus
            </button>
          )}
        </div>
      )}
    </div>
  );
}
