import { ALL_MATCHES } from './tournament-data';
import { BRACKET } from './bracket';

type Score = { home_score: number; away_score: number };

export function scoreMatch(pred?: Score, result?: Score): number {
  if (!pred || !result) return 0;
  if (pred.home_score === result.home_score && pred.away_score === result.away_score) return 3;
  const pOut = pred.home_score > pred.away_score ? 'H' : pred.home_score < pred.away_score ? 'A' : 'D';
  const rOut = result.home_score > result.away_score ? 'H' : result.home_score < result.away_score ? 'A' : 'D';
  if (pOut === rOut) return 1;
  return 0;
}

export type Breakdown = {
  total: number;
  exact: number;           // marcadores exactos en grupos
  outcome: number;         // resultados acertados en grupos
  knockoutExact: number;   // marcadores exactos en eliminatorias
  knockoutOutcome: number; // resultados acertados en eliminatorias
  scorer: boolean;
  champion: boolean;
};

const KNOCKOUT_IDS = BRACKET.map(m => m.id);

export function calculatePoints(
  predictionsByMatch: Record<string, Score>,
  bonusPred: { top_scorer?: string | null; champion?: string | null },
  results: Record<string, Score>,
  officialTopScorer?: string | null,
  officialChampion?: string | null
): Breakdown {
  let total = 0, exact = 0, outcome = 0, knockoutExact = 0, knockoutOutcome = 0;

  // Grupos
  for (const m of ALL_MATCHES) {
    const pts = scoreMatch(predictionsByMatch[m.id], results[m.id]);
    if (pts === 3) exact++;
    else if (pts === 1) outcome++;
    total += pts;
  }

  // Eliminatorias - score independiente del team match (per regla del usuario)
  for (const matchId of KNOCKOUT_IDS) {
    const pts = scoreMatch(predictionsByMatch[matchId], results[matchId]);
    if (pts === 3) knockoutExact++;
    else if (pts === 1) knockoutOutcome++;
    total += pts;
  }

  const scorer =
    !!officialTopScorer && !!bonusPred.top_scorer &&
    officialTopScorer.trim().toLowerCase() === bonusPred.top_scorer.trim().toLowerCase();
  if (scorer) total += 5;

  const champion = !!officialChampion && !!bonusPred.champion && officialChampion === bonusPred.champion;
  if (champion) total += 5;

  return { total, exact, outcome, knockoutExact, knockoutOutcome, scorer, champion };
}
