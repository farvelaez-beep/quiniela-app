'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Save, Loader2, Check, Trophy, Star } from 'lucide-react';
import { GROUPS, ALL_MATCHES, TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { createClient } from '@/lib/supabase/client';
import { scoreMatch, scoreGroupPositions } from '@/lib/scoring';
import { calculateGroupStandings, calculateBestThirdPlaces, type TeamStats } from '@/lib/standings';

type Score = { home_score: number | ''; away_score: number | '' };
type PredMap = Record<string, Score>;
type RealResult = { home_score: number; away_score: number };

export default function GroupStageClient({
  initialPredictions, results, locked, userId,
}: {
  initialPredictions: Record<string, { home_score: number; away_score: number }>;
  results: Record<string, RealResult>;
  locked: boolean;
  userId: string;
}) {
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

  let pointsTotal = 0;
  Object.entries(draft).forEach(([id, pred]) => {
    if (pred.home_score === '' || pred.away_score === '') return;
    const real = results[id];
    if (!real) return;
    pointsTotal += scoreMatch(
      { home_score: pred.home_score as number, away_score: pred.away_score as number },
      real
    );
  });

  const cleanPreds = useMemo(() => {
    const m: Record<string, { home_score: number; away_score: number }> = {};
    Object.entries(draft).forEach(([k, v]) => {
      if (v.home_score !== '' && v.away_score !== '') {
        m[k] = { home_score: v.home_score as number, away_score: v.away_score as number };
      }
    });
    return m;
  }, [draft]);

  const top8Thirds = useMemo(() => {
    const set = new Set<string>();
    calculateBestThirdPlaces(cleanPreds).forEach(t => set.add(t.team));
    return set;
  }, [cleanPreds]);

  // Top 8 mejores 3ros oficial (para tabla oficial)
  const top8ThirdsOfficial = useMemo(() => {
    const set = new Set<string>();
    calculateBestThirdPlaces(results).forEach(t => set.add(t.team));
    return set;
  }, [results]);

  // Bonus total por posiciones acertadas
  const totalPositionBonus = useMemo(() => {
    let sum = 0;
    Object.keys(GROUPS).forEach(g => {
      sum += scoreGroupPositions(g, cleanPreds, results);
    });
    return sum;
  }, [cleanPreds, results]);

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-5xl leading-none">FASE DE GRUPOS</h2>
          <p className="text-zinc-400 text-sm mt-1">72 partidos · Marcador exacto = 3 pts · Resultado = 1 pt · Acertar 1° o 2° del grupo = +1 pt c/u</p>
        </div>
        <div className="flex items-center gap-4">
          {(pointsTotal + totalPositionBonus) > 0 && (
            <div className="text-right">
              <div className="font-display text-3xl text-lime-400 leading-none">{pointsTotal + totalPositionBonus}</div>
              <div className="text-xs text-zinc-500 uppercase">Pts ganados</div>
            </div>
          )}
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
          const userStandings = groupFilled === 6 ? calculateGroupStandings(gKey, cleanPreds) : null;

          // Tabla oficial si hay 6 resultados oficiales del grupo
          const officialFilled = matches.filter(m => results[m.id] !== undefined).length;
          const officialStandings = officialFilled === 6 ? calculateGroupStandings(gKey, results) : null;

          const positionBonus = (userStandings && officialStandings) ? scoreGroupPositions(gKey, cleanPreds, results) : 0;

          return (
            <div key={gKey} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <button onClick={() => setOpenGroup(isOpen ? null : gKey)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50">
                <div className="flex items-center gap-4">
                  <div className="font-display text-3xl text-lime-400 leading-none">GRUPO {gKey}</div>
                  <div className="flex items-center gap-1 text-xl">
                    {teams.map(t => <span key={t}>{FLAG[t]}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {positionBonus > 0 && (
                    <span className="text-xs bg-lime-400/20 text-lime-400 px-2 py-0.5 rounded font-bold">
                      +{positionBonus}pts pos.
                    </span>
                  )}
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
                        const real = results[m.id];
                        const hasReal = !!real;
                        const hasPred = d.home_score !== '' && d.away_score !== '';
                        const points = (hasReal && hasPred) ? scoreMatch(
                          { home_score: d.home_score as number, away_score: d.away_score as number },
                          real
                        ) : null;

                        return (
                          <div key={m.id} className="py-2.5">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
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

                            {hasReal && (
                              <div className="text-center text-xs mt-1.5 flex items-center justify-center gap-3 text-zinc-500">
                                <span>Resultado: <span className="text-zinc-300 font-medium">{real.home_score}–{real.away_score}</span></span>
                                {points !== null && (
                                  <span className={`font-bold ${
                                    points === 3 ? 'text-lime-400' : points === 1 ? 'text-yellow-400' : 'text-zinc-600'
                                  }`}>
                                    {points === 3 ? '✓ +3 exacto' : points === 1 ? '✓ +1 resultado' : '+0 pts'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Tablas: Tu pronóstico vs Oficial */}
                  {userStandings && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 grid lg:grid-cols-2 gap-5">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5 text-lime-400"/>
                          Tu pronóstico (calculado)
                        </div>
                        <StandingsTable standings={userStandings} top8Thirds={top8Thirds} />
                      </div>
                      {officialStandings ? (
                        <div>
                          <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5 text-yellow-400"/>
                            Tabla oficial
                            {positionBonus > 0 && (
                              <span className="text-[10px] bg-lime-400/20 text-lime-400 px-1.5 py-0.5 rounded font-bold ml-1">
                                +{positionBonus} pts
                              </span>
                            )}
                          </div>
                          <StandingsTable
                            standings={officialStandings}
                            top8Thirds={top8ThirdsOfficial}
                            comparison={userStandings}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-xs text-zinc-600 italic">
                          Tabla oficial aparecerá cuando se carguen los 6 resultados
                        </div>
                      )}
                    </div>
                  )}
                  {!userStandings && groupFilled < 6 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 text-center text-xs text-zinc-500">
                      Llena los 6 partidos para ver la tabla calculada
                    </div>
                  )}
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

function StandingsTable({
  standings, top8Thirds, comparison,
}: {
  standings: TeamStats[];
  top8Thirds: Set<string>;
  comparison?: TeamStats[]; // si está, marca las posiciones donde el usuario acertó
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[420px]">
        <thead>
          <tr className="text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
            <th className="text-left py-1.5 px-1 w-8">#</th>
            <th className="text-left py-1.5 px-1">Equipo</th>
            <th className="text-center py-1.5 px-1">PJ</th>
            <th className="text-center py-1.5 px-1">G</th>
            <th className="text-center py-1.5 px-1">E</th>
            <th className="text-center py-1.5 px-1">P</th>
            <th className="text-center py-1.5 px-1">DG</th>
            <th className="text-right py-1.5 px-1 font-display">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const passes = i < 2;
            const passes3rd = i === 2 && top8Thirds.has(s.team);
            // Si hay comparación, ¿el usuario acertó esta posición?
            const userHit = comparison && i < 3 && comparison[i] && comparison[i].team === s.team;
            return (
              <tr key={s.team} className={`border-b border-zinc-800/50 ${
                passes ? 'bg-lime-400/5' : passes3rd ? 'bg-yellow-400/5' : ''
              }`}>
                <td className="py-1.5 px-1 font-bold text-zinc-400">{i+1}°</td>
                <td className="py-1.5 px-1">
                  <div className="flex items-center gap-1.5">
                    <span>{FLAG[s.team]}</span>
                    <span className="font-medium">{TEAMS_ES[s.team]}</span>
                    {passes && <Star className="w-3 h-3 text-lime-400 fill-lime-400"/>}
                    {passes3rd && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400"/>}
                    {userHit && i < 2 && (
                      <span className="text-[10px] bg-lime-400 text-black px-1 rounded font-bold ml-1">+1</span>
                    )}
                  </div>
                </td>
                <td className="text-center py-1.5 px-1 text-zinc-400">{s.played}</td>
                <td className="text-center py-1.5 px-1 text-zinc-300">{s.won}</td>
                <td className="text-center py-1.5 px-1 text-zinc-300">{s.drawn}</td>
                <td className="text-center py-1.5 px-1 text-zinc-300">{s.lost}</td>
                <td className={`text-center py-1.5 px-1 font-medium ${s.gd > 0 ? 'text-lime-400' : s.gd < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {s.gd > 0 ? '+' : ''}{s.gd}
                </td>
                <td className="text-right py-1.5 px-1 font-display text-lime-400 text-base">{s.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
