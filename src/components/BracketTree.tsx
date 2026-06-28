'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Trophy } from 'lucide-react';
import { buildUserBracket } from '@/lib/bracket-builder';
import { TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { createClient } from '@/lib/supabase/client';

// Vista de LLAVES (bracket visual) con el fixture real del Mundial.
// Dos lados que convergen en la final. Se llena solo con los resultados
// reales que cargas en el admin. No afecta el bracket ni los puntos de nadie.
//
// Prop opcional:
//   standalone = true  -> se renderiza expandido y sin el cabezote colapsable
//                         (para usarlo en su propia pagina/pestania "Fixture").

type Resolved = { id: string; phase: string; position: number; home_team: string | null; away_team: string | null };
type ScoreMap = Record<string, { home_score: number; away_score: number }>;

function TeamRow({ code, score, win, dim }: { code: string | null; score?: number; win: boolean; dim: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-1 ${win ? 'bg-lime-400/15' : ''}`}>
      <span className="text-sm leading-none">{code ? (FLAG[code] ?? '') : '⚽'}</span>
      <span className={`truncate flex-1 text-[11px] leading-tight ${
        win ? 'text-lime-400 font-bold' : code ? (dim ? 'text-zinc-500' : 'text-zinc-300') : 'text-zinc-600 italic'
      }`}>
        {code ? (TEAMS_ES[code] ?? code) : '—'}
      </span>
      <span className={`font-display text-xs w-3 text-right ${win ? 'text-lime-400' : 'text-zinc-500'}`}>
        {score ?? ''}
      </span>
    </div>
  );
}

function MatchBox({ m, results }: { m: Resolved; results: ScoreMap }) {
  const score = results[m.id];
  const hs = score?.home_score;
  const as = score?.away_score;
  const homeWin = !!score && hs! > as!;
  const awayWin = !!score && as! > hs!;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md w-[108px] overflow-hidden shadow-sm">
      <TeamRow code={m.home_team} score={hs} win={homeWin} dim={awayWin} />
      <div className="border-t border-zinc-800" />
      <TeamRow code={m.away_team} score={as} win={awayWin} dim={homeWin} />
    </div>
  );
}

function Column({ matches, label, results, gapClass }:
  { matches: Resolved[]; label: string; results: ScoreMap; gapClass?: string }) {
  return (
    <div className="flex flex-col">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold text-center mb-2 h-3">
        {label}
      </div>
      <div className={`flex-1 flex flex-col justify-around ${gapClass ?? ''}`}>
        {matches.map(m => <MatchBox key={m.id} m={m} results={results} />)}
      </div>
    </div>
  );
}

export default function BracketTree({ standalone = false }: { standalone?: boolean }) {
  const [results, setResults] = useState<ScoreMap>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('match_results')
        .select('match_id, home_score, away_score');
      const all: ScoreMap = {};
      (data ?? []).forEach((r: { match_id: string; home_score: number; away_score: number }) => {
        all[r.match_id] = { home_score: r.home_score, away_score: r.away_score };
      });
      setResults(all);
      setLoading(false);
    })();
  }, []);

  const built = useMemo(() => buildUserBracket(results, results) as Resolved[], [results]);

  const byPhase = (ph: string) =>
    built.filter(m => m.phase === ph).sort((a, b) => a.position - b.position);

  const r32 = byPhase('r32');
  const r16 = byPhase('r16');
  const qf = byPhase('qf');
  const sf = byPhase('sf');
  const final = byPhase('final');
  const third = byPhase('tp');

  const totalDefined = built.filter(m => m.home_team && m.away_team).length;

  const leftR32 = r32.slice(0, 8), rightR32 = r32.slice(8);
  const leftR16 = r16.slice(0, 4), rightR16 = r16.slice(4);
  const leftQF = qf.slice(0, 2), rightQF = qf.slice(2);
  const leftSF = sf.slice(0, 1), rightSF = sf.slice(1);

  const definedFinal = final[0] && final[0].home_team && final[0].away_team;

  const intro = (
    <p className="text-[11px] text-zinc-500 mb-3">
      Asi va el fixture real del torneo · se llena solo al cargar resultados · <strong>no afecta tu bracket</strong>. Desliza para ver todo &rarr;
    </p>
  );

  const bracket = loading ? (
    <p className="text-zinc-600 text-sm italic py-6 text-center">Cargando&hellip;</p>
  ) : (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-2 items-stretch min-w-max" style={{ minHeight: 560 }}>
        {/* MITAD IZQUIERDA */}
        <Column matches={leftR32} label="32avos" results={results} gapClass="gap-3" />
        <Column matches={leftR16} label="8vos" results={results} />
        <Column matches={leftQF} label="4tos" results={results} />
        <Column matches={leftSF} label="Semi" results={results} />

        {/* CENTRO: FINAL (+ 3er puesto) */}
        <div className="flex flex-col justify-center items-center px-1">
          <div className="text-[9px] uppercase tracking-wider text-yellow-400 font-bold text-center mb-2 h-3">
            Final
          </div>
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className={`rounded-md overflow-hidden border ${definedFinal ? 'border-yellow-400/60' : 'border-zinc-800'}`}>
              {final[0] && <MatchBox m={final[0]} results={results} />}
            </div>
            {third[0] && (
              <div className="opacity-80">
                <div className="text-[8px] uppercase tracking-wider text-amber-500/80 font-bold text-center mb-1">🥉 3er puesto</div>
                <MatchBox m={third[0]} results={results} />
              </div>
            )}
          </div>
        </div>

        {/* MITAD DERECHA (espejo) */}
        <Column matches={rightSF} label="Semi" results={results} />
        <Column matches={rightQF} label="4tos" results={results} />
        <Column matches={rightR16} label="8vos" results={results} />
        <Column matches={rightR32} label="32avos" results={results} gapClass="gap-3" />
      </div>
    </div>
  );

  // Modo pagina propia (pestania Fixture): sin colapsable, siempre expandido.
  if (standalone) {
    return (
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
          {totalDefined} cruces definidos
        </div>
        {intro}
        {bracket}
      </div>
    );
  }

  // Modo bloque colapsable (embebido en otra pantalla).
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/40 transition"
      >
        <div className="flex items-center gap-2.5 text-left">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="font-display text-lg text-zinc-200 leading-none">
            LLAVES DEL MUNDIAL · FIXTURE
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            {totalDefined} definidos
          </span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
      </button>

      {open && (
        <div className="border-t border-zinc-800 p-3">
          {intro}
          {bracket}
        </div>
      )}
    </div>
  );
}
