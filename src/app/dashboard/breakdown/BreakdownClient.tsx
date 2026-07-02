'use client';

import { useState, useMemo } from 'react';
import { GROUPS, ALL_MATCHES, TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { BRACKET, PHASE_LABELS } from '@/lib/bracket';
import { buildUserBracket } from '@/lib/bracket-builder';
import { scoreMatch, scoreGroupPositions, calculatePoints } from '@/lib/scoring';
import { Users, ChevronDown, ChevronRight, Calculator } from 'lucide-react';

type Pred = { home_score: number; away_score: number; winner_team: string | null };
type Score = { home_score: number; away_score: number };

// Nombre de equipo con bandera; tolera codigos desconocidos y vacios.
function teamTxt(code: string | null | undefined) {
  if (!code) return <span className="text-zinc-600">—</span>;
  return <span className="whitespace-nowrap">{FLAG[code] ?? ''} {TEAMS_ES[code] ?? code}</span>;
}

// El shape de ALL_MATCHES puede usar home/away o home_team/away_team.
function homeOf(m: any): string | undefined { return m.home ?? m.home_team ?? m.homeTeam; }
function awayOf(m: any): string | undefined { return m.away ?? m.away_team ?? m.awayTeam; }

function PtsBadge({ pts }: { pts: number }) {
  if (pts === 3) return <span className="text-lime-400 font-bold whitespace-nowrap">+3 exacto</span>;
  if (pts === 1) return <span className="text-yellow-400 font-bold whitespace-nowrap">+1 resultado</span>;
  return <span className="text-zinc-600 whitespace-nowrap">+0</span>;
}

export default function BreakdownClient({
  currentUserId, players, predsByUser, bonusByUser, tiebreakersByUser, results, officialTiebreakers, officialTopScorer, officialChampion,
}: {
  currentUserId: string;
  players: { id: string; name: string; fullName: string; email: string }[];
  predsByUser: Record<string, Record<string, Pred>>;
  bonusByUser: Record<string, { top_scorer: string | null; champion: string | null }>;
  tiebreakersByUser: Record<string, Record<string, string[]>>;
  results: Record<string, { home_score: number; away_score: number; winner_team: string | null }>;
  officialTiebreakers: Record<string, string[]>;
  officialTopScorer: string | null;
  officialChampion: string | null;
}) {
  const initialUserId = players.find(p => p.id === currentUserId)?.id ?? players[0]?.id ?? '';
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const selectedPlayer = players.find(p => p.id === selectedUserId);
  const flatPreds: Record<string, Pred> = predsByUser[selectedUserId] ?? {};
  const userBonus = bonusByUser[selectedUserId] ?? { top_scorer: null, champion: null };
  const userTb = tiebreakersByUser[selectedUserId] ?? {};

  // Separar predicciones de grupos y eliminatorias
  const { groupPreds, knockoutPreds } = useMemo(() => {
    const g: Record<string, Pred> = {}; const k: Record<string, Pred> = {};
    Object.entries(flatPreds).forEach(([id, p]) => {
      const isK = id.startsWith('r32_') || id.startsWith('r16_') || id.startsWith('qf_') ||
                  id.startsWith('sf_') || id === 'tp' || id === 'final';
      (isK ? k : g)[id] = p;
    });
    return { groupPreds: g, knockoutPreds: k };
  }, [flatPreds]);

  // Bracket del jugador (sus cruces) y bracket real (cruces reales)
  const userBracket = useMemo(
    () => buildUserBracket(groupPreds, knockoutPreds, userTb),
    [groupPreds, knockoutPreds, userTb]
  );
  const realBracket = useMemo(() => buildUserBracket(results, results), [results]);

  // Totales oficiales (misma formula de la Tabla)
  const breakdown = useMemo(() => calculatePoints(
    flatPreds as Record<string, Score>,
    userBonus,
    results,
    officialTopScorer,
    officialChampion,
    userTb,
    officialTiebreakers,
    knockoutPreds['final']?.winner_team ?? null,
  ), [flatPreds, userBonus, results, officialTopScorer, officialChampion, userTb, officialTiebreakers, knockoutPreds]);

  // Filas de eliminatorias con resultado cargado
  const phaseOrder: Array<'r32'|'r16'|'qf'|'sf'|'tp'|'final'> = ['r32','r16','qf','sf','tp','final'];
  const knockoutRows = useMemo(() => {
    return BRACKET
      .filter(m => results[m.id])
      .sort((a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase) || a.position - b.position)
      .map(m => {
        const mine = userBracket.find(x => x.id === m.id);
        const real = realBracket.find(x => x.id === m.id);
        const pred = knockoutPreds[m.id];
        const res = results[m.id];
        const pts = scoreMatch(pred, res);
        return { id: m.id, phase: m.phase, mine, real, pred, res, pts };
      });
  }, [userBracket, realBracket, knockoutPreds, results]);

  const knockoutTotal = knockoutRows.reduce((s, r) => s + r.pts, 0);

  return (
    <div className="pb-16">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-widest mb-2">
          <Calculator className="w-4 h-4"/>
          <span>Auditoria de puntos · misma formula de la Tabla</span>
        </div>
        <h1 className="font-display text-5xl leading-none mb-2">DESGLOSE DE PUNTOS</h1>
        <p className="text-zinc-400 text-sm">
          Punto por punto, de donde sale el puntaje de cada jugador. Las eliminatorias se puntuan <strong className="text-white">por llave (slot)</strong>: tu pronostico de cada llave se compara con el resultado real de esa misma llave.
        </p>
      </div>

      {/* Selector de jugador */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-5">
        <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2 flex items-center gap-2">
          <Users className="w-4 h-4"/> Selecciona un jugador
        </label>
        <div className="relative">
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="w-full appearance-none bg-black border border-zinc-700 rounded-xl px-4 py-3 pr-10 text-white text-lg font-bold cursor-pointer hover:border-lime-400 transition"
          >
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.fullName && p.fullName !== p.name ? ` (${p.fullName})` : ''}{p.email ? ` · ${p.email}` : ''}{p.id === currentUserId ? ' — tu' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none"/>
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <Card label={`G-EX · ${breakdown.exact} marcador${breakdown.exact === 1 ? '' : 'es'} exacto${breakdown.exact === 1 ? '' : 's'} en Grupos × 3 pts`} value={`${breakdown.exact * 3} pts`} />
        <Card label={`G-RES · ${breakdown.outcome} resultado${breakdown.outcome === 1 ? '' : 's'} acertado${breakdown.outcome === 1 ? '' : 's'} en Grupos (gana local, empate o visitante) × 1 pt`} value={`${breakdown.outcome} pts`} />
        <Card label={`POS · ${breakdown.groupPositions} posicion${breakdown.groupPositions === 1 ? '' : 'es'} 1° y 2° acertada${breakdown.groupPositions === 1 ? '' : 's'} por grupo × 1 pt`} value={`${breakdown.groupPositions} pts`} />
        <Card label={`E-EX · ${breakdown.knockoutExact} marcador${breakdown.knockoutExact === 1 ? '' : 'es'} exacto${breakdown.knockoutExact === 1 ? '' : 's'} en Eliminatorias × 3 pts`} value={`${breakdown.knockoutExact * 3} pts`} />
        <Card label={`E-RES · ${breakdown.knockoutOutcome} resultado${breakdown.knockoutOutcome === 1 ? '' : 's'} acertado${breakdown.knockoutOutcome === 1 ? '' : 's'} en Eliminatorias × 1 pt`} value={`${breakdown.knockoutOutcome} pts`} />
        <Card label={`GOL · Acertar el goleador del Mundial (5 pts)${breakdown.scorer ? ' · acertado' : ''}`} value={`${breakdown.scorer ? 5 : 0} pts`} />
        <Card label={`CAMP · Acertar el campeón (5 pts)${breakdown.champion ? ' · acertado' : ''}`} value={`${breakdown.champion ? 5 : 0} pts`} />
        <Card label="TOTAL DE PUNTOS (suma de todas las tarjetas)" value={`${breakdown.total} pts`} highlight />
      </div>

      {/* Aviso: regla de puntaje por llave */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-xl p-4 mb-5 text-sm">
        ⚠️ <strong>Cómo se puntúan las eliminatorias:</strong> cada llave (R32_1, R32_2…) se compara contra esa <strong>misma llave</strong> en la realidad. Sumas +3 si tu marcador es exacto y +1 si aciertas el resultado (gana local, empate o gana visitante), <strong>aunque los equipos de tu llave sean distintos a los reales</strong> — porque tu cuadro se armó con tus pronósticos de grupos. Por eso puedes sumar en llaves donde tienes otros equipos, y también un acierto "de partido" puede no sumar si en tu cuadro quedó en otra llave.
      </div>

      {/* ELIMINATORIAS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-5">
        <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-800 flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-2xl text-lime-400">ELIMINATORIAS · LLAVE POR LLAVE</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            {knockoutRows.length} llaves con resultado · subtotal <strong className="text-lime-400">{knockoutTotal} pts</strong>
          </span>
        </div>
        {knockoutRows.length === 0 ? (
          <p className="text-zinc-500 text-sm italic p-5">Aun no hay resultados de eliminatorias cargados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                <tr className="border-b border-zinc-800">
                  <th className="px-3 py-2 text-left">Llave</th>
                  <th className="px-3 py-2 text-left">Tu cruce y marcador</th>
                  <th className="px-3 py-2 text-left">Cruce real y resultado</th>
                  <th className="px-3 py-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {knockoutRows.map((r, idx) => (
                  <tr key={r.id} className={`border-t border-zinc-800 align-top ${idx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-900/50'}`}>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-bold text-zinc-300 uppercase">{r.id}</div>
                      <div className="text-[10px] text-zinc-600 uppercase">{PHASE_LABELS[r.phase]}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-zinc-300 text-xs">
                        {teamTxt(r.mine?.home_team)} <span className="text-zinc-600">vs</span> {teamTxt(r.mine?.away_team)}
                      </div>
                      <div className="font-display text-lime-400/90 mt-0.5">
                        {r.pred ? `${r.pred.home_score} - ${r.pred.away_score}` : <span className="text-zinc-600 text-xs">sin pronostico</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-zinc-300 text-xs">
                        {teamTxt(r.real?.home_team)} <span className="text-zinc-600">vs</span> {teamTxt(r.real?.away_team)}
                      </div>
                      <div className="font-display text-zinc-200 mt-0.5">
                        {r.res.home_score} - {r.res.away_score}
                        {r.res.winner_team && r.res.home_score === r.res.away_score && (
                          <span className="text-[10px] text-yellow-400 ml-2">pen: {TEAMS_ES[r.res.winner_team] ?? r.res.winner_team}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right"><PtsBadge pts={r.pts}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-zinc-500 px-5 py-3 border-t border-zinc-800">
          Se compara el marcador de tu llave contra el de la misma llave real, aunque los equipos sean distintos (tu cuadro depende de tus grupos).
        </p>
      </div>

      {/* FASE DE GRUPOS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-5">
        <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-800 flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-2xl text-lime-400">FASE DE GRUPOS</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            subtotal <strong className="text-lime-400">{breakdown.exact * 3 + breakdown.outcome + breakdown.groupPositions} pts</strong> (incluye posiciones)
          </span>
        </div>
        <div className="divide-y divide-zinc-800">
          {Object.keys(GROUPS).map(gKey => {
            const matches = ALL_MATCHES.filter((m: any) => m.group === gKey);
            const rows = matches.map((m: any) => {
              const pred = flatPreds[m.id];
              const res = results[m.id];
              const pts = scoreMatch(pred, res);
              return { m, pred, res, pts };
            }).filter(r => r.res);
            if (rows.length === 0) return null;
            const matchPts = rows.reduce((s, r) => s + r.pts, 0);
            const posPts = scoreGroupPositions(gKey, flatPreds as Record<string, Score>, results, userTb[gKey], officialTiebreakers[gKey]);
            const isOpen = openGroup === gKey;
            return (
              <div key={gKey}>
                <button onClick={() => setOpenGroup(isOpen ? null : gKey)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-zinc-800/40 transition">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl text-zinc-200">GRUPO {gKey}</span>
                    <span className="text-xs text-zinc-500">
                      {matchPts} pts en partidos {posPts > 0 && <span className="text-lime-400">· +{posPts} posiciones</span>}
                    </span>
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-400"/> : <ChevronRight className="w-4 h-4 text-zinc-400"/>}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4">
                    <table className="w-full text-xs">
                      <tbody>
                        {rows.map(({ m, pred, res, pts }) => (
                          <tr key={m.id} className="border-t border-zinc-800/60">
                            <td className="py-1.5 pr-2 text-zinc-300">
                              {teamTxt(homeOf(m))} <span className="text-zinc-600">vs</span> {teamTxt(awayOf(m))}
                            </td>
                            <td className="py-1.5 px-2 text-center text-zinc-400 whitespace-nowrap">
                              tuyo: <span className="text-lime-400/90 font-bold">{pred ? `${pred.home_score}-${pred.away_score}` : '—'}</span>
                            </td>
                            <td className="py-1.5 px-2 text-center text-zinc-400 whitespace-nowrap">
                              real: <span className="text-zinc-200 font-bold">{res.home_score}-{res.away_score}</span>
                            </td>
                            <td className="py-1.5 pl-2 text-right"><PtsBadge pts={pts}/></td>
                          </tr>
                        ))}
                        {posPts > 0 && (
                          <tr className="border-t border-zinc-800/60">
                            <td colSpan={3} className="py-1.5 pr-2 text-zinc-400">Posiciones acertadas del grupo (1&deg;/2&deg;)</td>
                            <td className="py-1.5 pl-2 text-right text-lime-400 font-bold">+{posPts}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BONOS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-800">
          <span className="font-display text-2xl text-lime-400">BONOS</span>
        </div>
        <div className="p-5 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">⚽ Goleador: <strong className="text-zinc-200">{userBonus.top_scorer ?? '—'}</strong>
              {officialTopScorer && <span className="text-zinc-500"> · oficial: {officialTopScorer}</span>}
            </span>
            <span className={breakdown.scorer ? 'text-lime-400 font-bold' : 'text-zinc-600'}>{breakdown.scorer ? '+5' : officialTopScorer ? '+0' : 'pendiente'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">🏆 Campeon: <strong className="text-zinc-200">{(userBonus.champion || knockoutPreds['final']?.winner_team) ? (TEAMS_ES[(userBonus.champion || knockoutPreds['final']?.winner_team)!] ?? (userBonus.champion || knockoutPreds['final']?.winner_team)) : '—'}</strong>
              {officialChampion && <span className="text-zinc-500"> · oficial: {TEAMS_ES[officialChampion] ?? officialChampion}</span>}
            </span>
            <span className={breakdown.champion ? 'text-lime-400 font-bold' : 'text-zinc-600'}>{breakdown.champion ? '+5' : officialChampion ? '+0' : 'pendiente'}</span>
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <p className="text-xs text-zinc-500 mt-4">
          Desglose de <strong className="text-zinc-300">{selectedPlayer.name}</strong> calculado con la misma formula de la Tabla. Total: <strong className="text-lime-400">{breakdown.total} pts</strong>.
        </p>
      )}
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'bg-lime-400/10 border-lime-400/40' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className={`font-display text-2xl leading-none ${highlight ? 'text-lime-400' : 'text-zinc-200'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
