'use client';

import { useState, useMemo } from 'react';
import { GROUPS, ALL_MATCHES, TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { BRACKET, PHASE_LABELS } from '@/lib/bracket';
import { buildUserBracket } from '@/lib/bracket-builder';
import { calculateGroupStandings } from '@/lib/standings';
import { Eye, ChevronDown, Trophy, Users } from 'lucide-react';

type Pred = { home_score: number; away_score: number; winner_team: string | null };
type PredsByUser = Record<string, { groups: Record<string, Pred>; knockout: Record<string, Pred> }>;
type BonusByUser = Record<string, { top_scorer: string | null; champion: string | null }>;

export default function AllPredictionsClient({
  currentUserId, players, predsByUser, bonusByUser, tiebreakersByUser,
}: {
  currentUserId: string;
  players: { id: string; name: string; fullName: string; email: string }[];
  predsByUser: PredsByUser;
  bonusByUser: BonusByUser;
  tiebreakersByUser?: Record<string, Record<string, string[]>>;
}) {
  const initialUserId = players.find(p => p.id === currentUserId)?.id ?? players[0]?.id ?? '';
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId);
  const [tab, setTab] = useState<'groups' | 'knockout' | 'bonus'>('groups');

  const selectedPlayer = players.find(p => p.id === selectedUserId);
  const userPreds = predsByUser[selectedUserId] ?? { groups: {}, knockout: {} };
  const userBonus = bonusByUser[selectedUserId] ?? { top_scorer: null, champion: null };
  const userTb = tiebreakersByUser?.[selectedUserId] ?? {};

  // Construir bracket del usuario seleccionado (con sus tiebreakers)
  const userBracket = useMemo(
    () => buildUserBracket(userPreds.groups, userPreds.knockout, userTb),
    [userPreds.groups, userPreds.knockout, userTb]
  );

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-widest mb-2">
          <Eye className="w-4 h-4"/>
          <span>Predicciones públicas · {players.length} jugadores</span>
        </div>
        <h1 className="font-display text-5xl leading-none mb-2">PRONÓSTICOS DE TODOS</h1>
        <p className="text-zinc-400 text-sm">
          Las predicciones quedaron registradas al momento del bloqueo. Total transparencia.
        </p>
      </div>

      {/* Selector de jugador */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-5">
        <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2 block flex items-center gap-2">
          <Users className="w-4 h-4"/>
          Selecciona un jugador
        </label>
        <div className="relative">
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="w-full appearance-none bg-black border border-zinc-700 rounded-xl px-4 py-3 pr-10 text-white text-lg font-bold cursor-pointer hover:border-lime-400 transition"
          >
            {players.map(p => {
              const fullPart = p.fullName && p.fullName !== p.name ? ` (${p.fullName})` : '';
              const youPart = p.id === currentUserId ? ' — tú' : '';
              const emailPart = p.email ? ` · ${p.email}` : '';
              return (
                <option key={p.id} value={p.id}>
                  {p.name}{fullPart}{emailPart}{youPart}
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none"/>
        </div>
        {selectedPlayer && (
          <p className="text-xs text-zinc-500 mt-2 truncate">
            Mostrando los pronósticos de <strong className="text-zinc-300">{selectedPlayer.name}</strong>
            {selectedPlayer.fullName && (
              <> <span className="text-zinc-400">— {selectedPlayer.fullName}</span></>
            )}
            {selectedPlayer.email && <> <span className="text-zinc-600">({selectedPlayer.email})</span></>}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-zinc-800 overflow-x-auto">
        <TabButton active={tab === 'groups'} onClick={() => setTab('groups')}>Fase de Grupos</TabButton>
        <TabButton active={tab === 'knockout'} onClick={() => setTab('knockout')}>Eliminatorias</TabButton>
        <TabButton active={tab === 'bonus'} onClick={() => setTab('bonus')}>Goleador & Campeón</TabButton>
      </div>

      {/* Contenido según tab */}
      {tab === 'groups' && <GroupsView preds={userPreds.groups} tiebreakers={userTb} />}
      {tab === 'knockout' && <KnockoutView bracket={userBracket} />}
      {tab === 'bonus' && <BonusView bonus={userBonus} />}

      {/* Stats del jugador */}
      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-400 flex flex-wrap gap-4">
        <span><strong className="text-white">{Object.keys(userPreds.groups).length}</strong> partidos de grupos</span>
        <span><strong className="text-white">{Object.keys(userPreds.knockout).length}</strong> partidos de eliminatorias</span>
        <span><strong className="text-white">{userBonus.top_scorer ? '✓' : '—'}</strong> goleador</span>
        <span><strong className="text-white">{userBonus.champion ? '✓' : '—'}</strong> campeón</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition ${
        active ? 'border-lime-400 text-white' : 'border-transparent text-zinc-500 hover:text-white'
      }`}>
      {children}
    </button>
  );
}

function GroupsView({ preds, tiebreakers }: { preds: Record<string, Pred>; tiebreakers: Record<string, string[]> }) {
  return (
    <div className="space-y-4">
      {Object.entries(GROUPS).map(([groupKey]) => {
        const matches = ALL_MATCHES.filter(m => m.group === groupKey);
        const allFilled = matches.every(m => preds[m.id]);
        // Convertir Pred a Score (sólo home_score y away_score) para calculateGroupStandings
        const predsAsScores: Record<string, { home_score: number; away_score: number }> = {};
        Object.entries(preds).forEach(([k, v]) => {
          predsAsScores[k] = { home_score: v.home_score, away_score: v.away_score };
        });
        const standings = allFilled ? calculateGroupStandings(groupKey, predsAsScores, tiebreakers[groupKey]) : null;

        return (
          <div key={groupKey} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-800 flex items-baseline gap-3">
              <span className="font-display text-2xl text-lime-400">GRUPO {groupKey}</span>
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                {matches.filter(m => preds[m.id]).length}/6 pronosticados
              </span>
            </div>
            <div className="divide-y divide-zinc-800">
              {matches.map(m => {
                const p = preds[m.id];
                return (
                  <div key={m.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                    <span className="text-zinc-500 text-xs w-12">J{m.matchday}</span>
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 flex-1 justify-end text-right">
                        <span className="text-white">{TEAMS_ES[m.home]}</span>
                        <span>{FLAG[m.home]}</span>
                      </span>
                      <div className="flex items-center gap-1.5 font-display text-xl text-white min-w-[60px] justify-center">
                        {p ? (
                          <>
                            <span className="text-lime-400">{p.home_score}</span>
                            <span className="text-zinc-600">–</span>
                            <span className="text-lime-400">{p.away_score}</span>
                          </>
                        ) : (
                          <span className="text-zinc-700 text-sm">— vs —</span>
                        )}
                      </div>
                      <span className="flex items-center gap-2 flex-1">
                        <span>{FLAG[m.away]}</span>
                        <span className="text-white">{TEAMS_ES[m.away]}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {standings && (
              <div className="bg-zinc-950 border-t border-zinc-800 p-4">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold">
                  Tabla calculada
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500">
                      <th className="text-left pb-1.5 font-medium">#</th>
                      <th className="text-left pb-1.5 font-medium">Equipo</th>
                      <th className="text-center pb-1.5 font-medium">PJ</th>
                      <th className="text-center pb-1.5 font-medium">DG</th>
                      <th className="text-right pb-1.5 font-medium">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.team} className={i < 2 ? 'text-lime-400' : i === 2 ? 'text-yellow-400' : 'text-zinc-400'}>
                        <td className="py-1">{i + 1}°</td>
                        <td className="py-1">{FLAG[s.team]} {TEAMS_ES[s.team]}</td>
                        <td className="text-center py-1">{s.played}</td>
                        <td className="text-center py-1">{s.gd > 0 ? '+' : ''}{s.gd}</td>
                        <td className="text-right py-1 font-bold">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KnockoutView({ bracket }: { bracket: ReturnType<typeof buildUserBracket> }) {
  // Agrupar por fase
  const phases: Record<string, typeof bracket> = { r32: [], r16: [], qf: [], sf: [], tp: [], final: [] };
  bracket.forEach(m => { phases[m.phase].push(m); });

  return (
    <div className="space-y-4">
      {(['r32', 'r16', 'qf', 'sf', 'tp', 'final'] as const).map(phase => {
        const matches = phases[phase];
        if (matches.length === 0) return null;
        return (
          <div key={phase} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-800">
              <span className="font-display text-2xl text-lime-400">{PHASE_LABELS[phase].toUpperCase()}</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {matches.map(m => {
                const hasTeams = m.home_team && m.away_team;
                const hasScore = m.home_score !== null && m.away_score !== null;
                return (
                  <div key={m.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                    <span className="text-zinc-500 text-xs w-16 uppercase">{m.id.toUpperCase()}</span>
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 flex-1 justify-end text-right">
                        {m.home_team ? (
                          <>
                            <span className={m.winner === m.home_team ? 'text-lime-400 font-bold' : 'text-white'}>
                              {TEAMS_ES[m.home_team]}
                            </span>
                            <span>{FLAG[m.home_team]}</span>
                          </>
                        ) : <span className="text-zinc-600 text-xs">por definir</span>}
                      </span>
                      <div className="flex items-center gap-1.5 font-display text-xl min-w-[60px] justify-center">
                        {hasScore ? (
                          <>
                            <span className="text-lime-400">{m.home_score}</span>
                            <span className="text-zinc-600">–</span>
                            <span className="text-lime-400">{m.away_score}</span>
                          </>
                        ) : (
                          <span className="text-zinc-700 text-sm">— vs —</span>
                        )}
                      </div>
                      <span className="flex items-center gap-2 flex-1">
                        {m.away_team ? (
                          <>
                            <span>{FLAG[m.away_team]}</span>
                            <span className={m.winner === m.away_team ? 'text-lime-400 font-bold' : 'text-white'}>
                              {TEAMS_ES[m.away_team]}
                            </span>
                          </>
                        ) : <span className="text-zinc-600 text-xs">por definir</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BonusView({ bonus }: { bonus: { top_scorer: string | null; champion: string | null } }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">
          <Trophy className="w-4 h-4 text-yellow-400"/>
          Goleador
        </div>
        <div className="font-display text-3xl text-white">
          {bonus.top_scorer || <span className="text-zinc-700">— sin pronóstico —</span>}
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">
          <Trophy className="w-4 h-4 text-yellow-400"/>
          Campeón
        </div>
        <div className="font-display text-3xl text-white flex items-center gap-3">
          {bonus.champion ? (
            <>
              <span className="text-4xl">{FLAG[bonus.champion]}</span>
              <span>{TEAMS_ES[bonus.champion]}</span>
            </>
          ) : (
            <span className="text-zinc-700">— sin pronóstico —</span>
          )}
        </div>
      </div>
    </div>
  );
}
