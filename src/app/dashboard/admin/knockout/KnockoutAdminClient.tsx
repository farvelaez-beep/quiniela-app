'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Save, Loader2, Check, Trophy, ListOrdered, CalendarClock } from 'lucide-react';
import { BRACKET, PHASE_LABELS, PHASE_SHORT, type BracketMatch } from '@/lib/bracket';
import { buildUserBracket } from '@/lib/bracket-builder';
import { TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { createClient } from '@/lib/supabase/client';

type Score = { home_score: number | ''; away_score: number | '' };
type SortMode = 'slot' | 'date';

function teamLabel(code: string | null) {
  if (!code) {
    return <span className="text-zinc-600 italic">Por confirmar</span>;
  }
  return (
    <span className="text-zinc-100 font-semibold whitespace-nowrap">
      {FLAG[code] ?? ''} {TEAMS_ES[code] ?? code}
    </span>
  );
}

// Fecha (y hora, solo para R32 y final, que tienen hora real) en hora Colombia.
function fmtWhen(m: BracketMatch) {
  const d = new Date(m.match_date);
  const date = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  const showTime = m.phase === 'r32' || m.phase === 'final';
  if (!showTime) return date;
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

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
  // Ganador en penales por partido (solo aplica en empates).
  const [winners, setWinners] = useState<Record<string, string | null>>({});
  const [openPhase, setOpenPhase] = useState<BracketMatch['phase'] | null>('r32');
  const [sortMode, setSortMode] = useState<SortMode>('slot');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [groupResults, setGroupResults] = useState<Record<string, { home_score: number; away_score: number }>>({});
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Trae resultados oficiales (incluido el ganador en penales) una vez al montar.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('match_results')
        .select('match_id, home_score, away_score, winner_team');
      const all: Record<string, { home_score: number; away_score: number }> = {};
      const w: Record<string, string | null> = {};
      (data ?? []).forEach((r: { match_id: string; home_score: number; away_score: number; winner_team: string | null }) => {
        all[r.match_id] = { home_score: r.home_score, away_score: r.away_score };
        if (r.winner_team) w[r.match_id] = r.winner_team;
      });
      setGroupResults(all);
      setWinners(w);
      setLoadingTeams(false);
    })();
  }, []);

  // Resuelve los equipos de cada cruce. Incluye el ganador en penales para que
  // en los empates avance el equipo correcto a la siguiente ronda.
  const resolvedTeams = useMemo(() => {
    const knockoutLive: Record<string, { home_score: number; away_score: number; winner_team: string | null }> = {};
    Object.entries(scores).forEach(([id, s]) => {
      if (s.home_score !== '' && s.away_score !== '') {
        knockoutLive[id] = {
          home_score: s.home_score as number,
          away_score: s.away_score as number,
          winner_team: winners[id] ?? null,
        };
      }
    });
    const resolved = buildUserBracket(groupResults, { ...groupResults, ...knockoutLive });
    const map: Record<string, { home: string | null; away: string | null }> = {};
    resolved.forEach(r => { map[r.id] = { home: r.home_team, away: r.away_team }; });
    return map;
  }, [groupResults, scores, winners]);

  const updateScore = (matchId: string, side: 'home_score'|'away_score', val: string) => {
    if (val !== '' && (isNaN(+val) || +val < 0 || +val > 30)) return;
    const cur = scores[matchId] ?? { home_score: '' as const, away_score: '' as const };
    const next: Score = { ...cur, [side]: val === '' ? '' : +val };
    // Si deja de ser empate, se borra el ganador en penales.
    if (next.home_score !== '' && next.away_score !== '' && next.home_score !== next.away_score) {
      if (winners[matchId]) {
        const w = { ...winners }; delete w[matchId]; setWinners(w);
      }
    }
    setScores({ ...scores, [matchId]: next });
    setDirty(true);
  };

  const setWinner = (matchId: string, team: string) => {
    setWinners({ ...winners, [matchId]: team });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const supabase = createClient();

    const toUpsert = Object.entries(scores)
      .filter(([_, s]) => s.home_score !== '' && s.away_score !== '')
      .map(([match_id, s]) => {
        const isDraw = s.home_score === s.away_score;
        return {
          match_id,
          home_score: s.home_score as number,
          away_score: s.away_score as number,
          winner_team: isDraw ? (winners[match_id] ?? null) : null,
        };
      });

    const toDelete = Object.entries(scores)
      .filter(([_, s]) => s.home_score === '' || s.away_score === '')
      .map(([match_id]) => match_id);

    if (toUpsert.length > 0) {
      await supabase.from('match_results').upsert(toUpsert, { onConflict: 'match_id' });
    }
    if (toDelete.length > 0) {
      await supabase.from('match_results').delete().in('match_id', toDelete);
    }

    setSaving(false);
    setDirty(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
    router.refresh();
  };

  const phasesInOrder: BracketMatch['phase'][] = ['r32', 'r16', 'qf', 'sf', 'tp', 'final'];

  const sortMatches = (matches: BracketMatch[]) =>
    [...matches].sort((a, b) =>
      sortMode === 'date'
        ? new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        : a.position - b.position
    );

  return (
    <div className="pb-24">
      <div className="mb-4">
        <h2 className="font-display text-5xl leading-none">RESULTADOS ELIMINATORIAS (ADMIN)</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Carga los marcadores oficiales de cada partido eliminatorio. Los puntos se calculan automaticamente para cada jugador.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold mr-1">Ordenar:</span>
        <button
          onClick={() => setSortMode('slot')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition border ${
            sortMode === 'slot'
              ? 'bg-lime-400 text-black border-lime-400'
              : 'bg-transparent text-zinc-400 border-zinc-700 hover:text-white'
          }`}>
          <ListOrdered className="w-3.5 h-3.5" /> Por slot
        </button>
        <button
          onClick={() => setSortMode('date')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition border ${
            sortMode === 'date'
              ? 'bg-lime-400 text-black border-lime-400'
              : 'bg-transparent text-zinc-400 border-zinc-700 hover:text-white'
          }`}>
          <CalendarClock className="w-3.5 h-3.5" /> Por fecha y hora
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 text-blue-200 rounded-lg p-4 mb-4 text-sm">
        <strong>Como funciona:</strong> Los equipos de cada cruce se calculan automaticamente con los resultados de la fase de grupos. Las fechas y horas estan en hora Colombia. En empates de eliminatoria, elige quien gano en penales para que avance al cuadro. Para borrar un resultado, vacia las dos casillas y guarda.
      </div>

      <div className="space-y-3">
        {phasesInOrder.map(phaseKey => {
          const phaseMatches = sortMatches(BRACKET.filter(m => m.phase === phaseKey));
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
                    const teams = resolvedTeams[m.id];
                    const isDraw = s.home_score !== '' && s.away_score !== '' && s.home_score === s.away_score;
                    const canPenalties = isDraw && !!teams?.home && !!teams?.away && m.phase !== 'tp';
                    return (
                      <div key={m.id} className="bg-black/40 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
                            {PHASE_SHORT[m.phase]} #{m.position}
                          </span>
                          <span className="text-xs text-zinc-500">{fmtWhen(m)}</span>
                        </div>

                        <div className="flex items-center justify-center gap-3 mb-2 text-sm">
                          {loadingTeams
                            ? <span className="text-zinc-600 italic">Cargando&hellip;</span>
                            : <>
                                {teamLabel(teams?.home ?? null)}
                                <span className="text-zinc-600 text-xs">vs</span>
                                {teamLabel(teams?.away ?? null)}
                              </>
                          }
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

                        {/* Selector de ganador en penales (solo en empates) */}
                        {canPenalties && (
                          <div className="mt-3 pt-3 border-t border-zinc-800">
                            <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2 text-center">
                              ¿Quien gano en penales?
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setWinner(m.id, teams!.home!)}
                                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                                  winners[m.id] === teams!.home ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                }`}>
                                {FLAG[teams!.home!]} {TEAMS_ES[teams!.home!]}
                              </button>
                              <button onClick={() => setWinner(m.id, teams!.away!)}
                                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                                  winners[m.id] === teams!.away ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                }`}>
                                {FLAG[teams!.away!]} {TEAMS_ES[teams!.away!]}
                              </button>
                            </div>
                            {!winners[m.id] && (
                              <p className="text-[11px] text-yellow-400/80 mt-2 text-center">
                                Empate: elige quien avanza por penales.
                              </p>
                            )}
                          </div>
                        )}
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
