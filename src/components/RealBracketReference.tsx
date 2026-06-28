'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Globe } from 'lucide-react';
import { BRACKET, PHASE_LABELS, type BracketMatch } from '@/lib/bracket';
import { buildUserBracket } from '@/lib/bracket-builder';
import { TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { createClient } from '@/lib/supabase/client';

// Bloque de SOLO REFERENCIA con los cruces reales del Mundial.
// No afecta el bracket del jugador ni sus puntos; es solo informativo.
// Muestra cada ronda a medida que se va definiendo (R32 ahora, y luego
// octavos, cuartos, etc. conforme se cargan los resultados reales).
//
// Uso: importarlo en KnockoutClient.tsx y colocarlo donde quieras, ej:
//   import RealBracketReference from '@/components/RealBracketReference';
//   ...
//   <RealBracketReference />
export default function RealBracketReference() {
  const [results, setResults] = useState<Record<string, { home_score: number; away_score: number }>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('match_results')
        .select('match_id, home_score, away_score');
      const all: Record<string, { home_score: number; away_score: number }> = {};
      (data ?? []).forEach((r: { match_id: string; home_score: number; away_score: number }) => {
        all[r.match_id] = { home_score: r.home_score, away_score: r.away_score };
      });
      setResults(all);
      setLoading(false);
    })();
  }, []);

  // Resuelve los equipos reales de cada cruce reutilizando la logica del bracket.
  const resolved = useMemo(() => {
    const map: Record<string, { home: string | null; away: string | null }> = {};
    const built = buildUserBracket(results, results);
    built.forEach(r => { map[r.id] = { home: r.home_team, away: r.away_team }; });
    return map;
  }, [results]);

  // Orden de fases y cuales tienen al menos un cruce definido.
  const phasesInOrder: BracketMatch['phase'][] = ['r32', 'r16', 'qf', 'sf', 'tp', 'final'];
  const visiblePhases = phasesInOrder.filter(phase =>
    BRACKET.some(m => m.phase === phase && resolved[m.id]?.home && resolved[m.id]?.away)
  );

  const totalDefined = BRACKET.filter(m => resolved[m.id]?.home && resolved[m.id]?.away).length;

  const teamCell = (code: string | null, align: 'right' | 'left') => {
    if (!code) {
      return <span className="text-zinc-600 italic text-xs">Por confirmar</span>;
    }
    return (
      <span className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span>{FLAG[code] ?? ''}</span>
        <span className="text-zinc-200">{TEAMS_ES[code] ?? code}</span>
      </span>
    );
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/40 transition"
      >
        <div className="flex items-center gap-2.5 text-left">
          <Globe className="w-4 h-4 text-zinc-400" />
          <span className="font-display text-lg text-zinc-200 leading-none">
            CRUCES REALES DEL MUNDIAL
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            {totalDefined} definidos
          </span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
      </button>

      {open && (
        <div className="border-t border-zinc-800 p-3">
          <p className="text-[11px] text-zinc-500 mb-3">
            Solo de referencia · estos son los cruces reales del torneo y <strong>no afectan tu bracket ni tus puntos</strong>.
          </p>

          {loading ? (
            <p className="text-zinc-600 text-sm italic py-2 text-center">Cargando&hellip;</p>
          ) : visiblePhases.length === 0 ? (
            <p className="text-zinc-600 text-sm italic py-2 text-center">
              Aun no hay cruces definidos. Apareceran cuando termine la fase de grupos.
            </p>
          ) : (
            <div className="space-y-4">
              {visiblePhases.map(phase => {
                const phaseMatches = BRACKET
                  .filter(m => m.phase === phase && resolved[m.id]?.home && resolved[m.id]?.away);
                return (
                  <div key={phase}>
                    <div className="font-display text-base text-lime-400/80 mb-1.5 px-2">
                      {PHASE_LABELS[phase].toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      {phaseMatches.map(m => {
                        const t = resolved[m.id];
                        const score = results[m.id];
                        return (
                          <div
                            key={m.id}
                            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 px-2 rounded-md hover:bg-black/30 text-sm"
                          >
                            <div className="text-right">{teamCell(t?.home ?? null, 'right')}</div>
                            <div className="px-2 text-center min-w-[42px]">
                              {score
                                ? <span className="font-display text-lime-400">{score.home_score}-{score.away_score}</span>
                                : <span className="text-zinc-600 text-xs">vs</span>}
                            </div>
                            <div className="text-left">{teamCell(t?.away ?? null, 'left')}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
