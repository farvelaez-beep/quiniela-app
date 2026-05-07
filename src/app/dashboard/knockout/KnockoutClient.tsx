'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Save, Loader2, Check, AlertCircle, Trophy, Lock, Sparkles } from 'lucide-react';
import { TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { BRACKET, PHASE_LABELS, PHASE_SHORT, type BracketMatch } from '@/lib/bracket';
import { buildUserBracket, computeFifaThirdAssignments } from '@/lib/bracket-builder';
import { scoreMatch } from '@/lib/scoring';
import { createClient } from '@/lib/supabase/client';

type KPred = { home_score: number | ''; away_score: number | ''; winner_team: string | null };

export default function KnockoutClient({
  userId, groupPredictions, knockoutPredictions, top8Thirds, thirdsByGroup, results, isLocked,
}: {
  userId: string;
  groupPredictions: Record<string, { home_score: number; away_score: number }>;
  knockoutPredictions: Record<string, { home_score: number; away_score: number; winner_team: string | null }>;
  top8Thirds: string[];
  thirdsByGroup: Record<string, string>;
  results: Record<string, { home_score: number; away_score: number }>;
  isLocked: boolean;
}) {
  const router = useRouter();

  const [preds, setPreds] = useState<Record<string, KPred>>(() => {
    const m: Record<string, KPred> = {};
    BRACKET.forEach(km => {
      const p = knockoutPredictions[km.id];
      m[km.id] = p
        ? { home_score: p.home_score, away_score: p.away_score, winner_team: p.winner_team }
        : { home_score: '', away_score: '', winner_team: null };
    });
    return m;
  });

  const [openPhase, setOpenPhase] = useState<BracketMatch['phase'] | null>('r32');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Bracket completo + asignaciones FIFA
  const userBracket = useMemo(() => {
    return buildUserBracket(
      groupPredictions,
      Object.fromEntries(
        Object.entries(preds).map(([id, p]) => [id, {
          home_score: p.home_score === '' ? 0 : (p.home_score as number),
          away_score: p.away_score === '' ? 0 : (p.away_score as number),
          winner_team: p.winner_team,
        }])
      )
    );
  }, [groupPredictions, preds]);

  const fifaInfo = useMemo(() => computeFifaThirdAssignments(groupPredictions), [groupPredictions]);

  const updateScore = (matchId: string, side: 'home_score'|'away_score', val: string) => {
    if (val !== '' && (isNaN(+val) || +val < 0 || +val > 30)) return;
    const cur = preds[matchId] ?? { home_score: '' as const, away_score: '' as const, winner_team: null };
    const next: KPred = { ...cur, [side]: val === '' ? '' : +val };
    if (next.home_score !== '' && next.away_score !== '' && next.home_score !== next.away_score) {
      next.winner_team = null;
    }
    setPreds({ ...preds, [matchId]: next });
    setDirty(true);
  };

  const updateWinner = (matchId: string, team: string | null) => {
    const cur = preds[matchId];
    setPreds({ ...preds, [matchId]: { ...cur, winner_team: team } });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const predRows = Object.entries(preds)
      .filter(([_, p]) => p.home_score !== '' && p.away_score !== '')
      .map(([match_id, p]) => ({
        user_id: userId, match_id,
        home_score: p.home_score as number,
        away_score: p.away_score as number,
        winner_team: p.winner_team,
      }));
    if (predRows.length > 0) {
      await supabase.from('match_predictions').upsert(predRows, { onConflict: 'user_id,match_id' });
    }
    setSaving(false);
    setDirty(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
    router.refresh();
  };

  const totalMatches = BRACKET.length;
  const matchesWithPred = BRACKET.filter(m => {
    const p = preds[m.id]; return p && p.home_score !== '' && p.away_score !== '';
  }).length;

  const pointsTotal = useMemo(() => {
    let total = 0;
    BRACKET.forEach(m => {
      const p = preds[m.id]; const r = results[m.id];
      if (!p || p.home_score === '' || p.away_score === '' || !r) return;
      total += scoreMatch(
        { home_score: p.home_score as number, away_score: p.away_score as number },
        r
      );
    });
    return total;
  }, [preds, results]);

  const phasesInOrder: BracketMatch['phase'][] = ['r32', 'r16', 'qf', 'sf', 'tp', 'final'];

  // Slots R32 que reciben un 3ro lugar (ordenados por la columna FIFA: 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L)
  const thirdSlotsOrdered = ['r32_11','r32_15','r32_7','r32_1','r32_8','r32_2','r32_16','r32_12'];
  const thirdSlotLabels: Record<string, string> = {
    'r32_11': '1A', 'r32_15': '1B', 'r32_7': '1D', 'r32_1': '1E',
    'r32_8': '1G',  'r32_2': '1I',  'r32_16': '1K', 'r32_12': '1L',
  };

  return (
    <div className="pb-24">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-5xl leading-none">ELIMINATORIAS</h2>
          <p className="text-zinc-400 text-sm mt-1">
            El bracket se arma solo con tus predicciones de grupos. Asignación oficial de 3ros según el Anexo C de FIFA.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {pointsTotal > 0 && (
            <div className="text-right">
              <div className="font-display text-3xl text-lime-400 leading-none">{pointsTotal}</div>
              <div className="text-xs text-zinc-500 uppercase">Pts ganados</div>
            </div>
          )}
          <div className="text-right">
            <div className="font-display text-3xl text-lime-400 leading-none">
              {matchesWithPred}<span className="text-zinc-600 text-2xl">/{totalMatches}</span>
            </div>
            <div className="text-xs text-zinc-500 uppercase">Pronosticados</div>
          </div>
        </div>
      </div>

      {/* Asignación FIFA de 3ros */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-lime-400/30 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-lime-400 text-black p-2 rounded-lg flex-shrink-0">
            <Sparkles className="w-5 h-5"/>
          </div>
          <div>
            <h3 className="font-display text-2xl">8 MEJORES 3ROS · ASIGNACIÓN FIFA</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Según el <strong className="text-white">Anexo C oficial de la FIFA</strong> (495 combinaciones), tu pronóstico determina automáticamente qué 3ro lugar va contra cada 1° de grupo.
            </p>
          </div>
        </div>

        {top8Thirds.length === 8 && fifaInfo.fifaKey ? (
          <>
            <div className="text-xs text-zinc-500 mb-3">
              Tus 8 mejores 3ros vienen de los grupos: <span className="font-mono text-lime-400">{fifaInfo.fifaKey.split('').join(', ')}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {thirdSlotsOrdered.map(slotId => {
                const team = fifaInfo.assignments[slotId];
                const groupLetter = team ? thirdsByGroup[team] : null;
                return (
                  <div key={slotId} className="flex items-center gap-2 rounded-lg p-2 bg-black/40">
                    <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold w-16 flex-shrink-0">
                      <div className="text-zinc-300">{thirdSlotLabels[slotId]} vs</div>
                      <div className="text-zinc-600 text-[10px]">{slotId.toUpperCase()}</div>
                    </span>
                    <div className="flex-1 bg-black border border-lime-400/20 rounded px-2 py-1.5 text-sm text-lime-400 flex items-center gap-2">
                      {team ? (
                        <>
                          <span>{FLAG[team]} {TEAMS_ES[team]}</span>
                          <span className="text-zinc-500 text-xs ml-auto">3°{groupLetter}</span>
                        </>
                      ) : (
                        <span className="text-zinc-600 italic">Calculando…</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-zinc-600"/>
            Completa los 72 partidos de fase de grupos para ver la asignación oficial FIFA
          </div>
        )}
      </div>

      {isLocked && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg p-4 mb-4 text-sm flex items-start gap-3">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5"/>
          <div>Pronósticos bloqueados. Solo lectura.</div>
        </div>
      )}

      <div className="space-y-3">
        {phasesInOrder.map(phaseKey => {
          const phaseMatches = userBracket.filter(m => m.phase === phaseKey);
          const phaseFilled = phaseMatches.filter(m => {
            const p = preds[m.id]; return p && p.home_score !== '' && p.away_score !== '';
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
                    {phaseFilled}/{phaseMatches.length} pronosticados
                  </div>
                  {phaseKey === 'final' && <Trophy className="w-5 h-5 text-yellow-400"/>}
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 p-4 space-y-3">
                  {phaseMatches.map(m => {
                    const pred = preds[m.id] ?? { home_score: '', away_score: '', winner_team: null };
                    const home = m.home_team;
                    const away = m.away_team;
                    const hasTeams = !!home && !!away;
                    const result = results[m.id];
                    const points = (result && pred.home_score !== '' && pred.away_score !== '') ? scoreMatch(
                      { home_score: pred.home_score as number, away_score: pred.away_score as number },
                      result
                    ) : null;
                    const isDraw = pred.home_score !== '' && pred.away_score !== '' && pred.home_score === pred.away_score;

                    return (
                      <div key={m.id} className={`rounded-lg p-3 ${hasTeams ? 'bg-black/40' : 'bg-zinc-950/50 border border-dashed border-zinc-800'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
                            {PHASE_SHORT[m.phase]} #{m.position}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(m.match_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div className="flex items-center justify-end gap-2 min-w-0">
                            <span className={`font-medium text-right truncate ${!home ? 'text-zinc-600 italic' : ''}`}>
                              {home ? TEAMS_ES[home] : 'Por definir'}
                            </span>
                            <span className="text-2xl">{home ? FLAG[home] : '⚽'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" max="30"
                              value={pred.home_score}
                              onChange={e => updateScore(m.id, 'home_score', e.target.value)}
                              disabled={!hasTeams || isLocked}
                              className="w-12 h-10 bg-black border border-zinc-700 rounded text-center font-display text-xl text-lime-400 disabled:opacity-30 disabled:cursor-not-allowed" />
                            <span className="text-zinc-600">:</span>
                            <input type="number" min="0" max="30"
                              value={pred.away_score}
                              onChange={e => updateScore(m.id, 'away_score', e.target.value)}
                              disabled={!hasTeams || isLocked}
                              className="w-12 h-10 bg-black border border-zinc-700 rounded text-center font-display text-xl text-lime-400 disabled:opacity-30 disabled:cursor-not-allowed" />
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-2xl">{away ? FLAG[away] : '⚽'}</span>
                            <span className={`font-medium truncate ${!away ? 'text-zinc-600 italic' : ''}`}>
                              {away ? TEAMS_ES[away] : 'Por definir'}
                            </span>
                          </div>
                        </div>

                        {isDraw && hasTeams && (
                          <div className="mt-3 pt-3 border-t border-zinc-800">
                            <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">
                              ¿Quién gana en penales?
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => updateWinner(m.id, home)} disabled={isLocked}
                                className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                                  pred.winner_team === home ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'
                                }`}>
                                {FLAG[home!]} {TEAMS_ES[home!]}
                              </button>
                              <button onClick={() => updateWinner(m.id, away)} disabled={isLocked}
                                className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                                  pred.winner_team === away ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'
                                }`}>
                                {FLAG[away!]} {TEAMS_ES[away!]}
                              </button>
                            </div>
                          </div>
                        )}

                        {result && (
                          <div className="mt-3 pt-2 border-t border-zinc-800 text-xs flex items-center justify-center gap-3 text-zinc-500">
                            <span>Resultado: <span className="text-zinc-300 font-medium">{result.home_score}–{result.away_score}</span></span>
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
              )}
            </div>
          );
        })}
      </div>

      {!isLocked && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          {savedAt ? (
            <div className="bg-lime-500 text-black px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2">
              <Check className="w-4 h-4"/>Guardado
            </div>
          ) : dirty ? (
            <button onClick={save} disabled={saving}
              className="bg-lime-400 text-black px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              Guardar pronósticos
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
