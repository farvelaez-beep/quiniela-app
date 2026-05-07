import { ALL_MATCHES, GROUPS } from './tournament-data';
import { BRACKET } from './bracket';
import { calculateGroupStandings } from './standings';

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
  exact: number;
  outcome: number;
  knockoutExact: number;
  knockoutOutcome: number;
  groupPositions: number; // bonificaciones por acertar 1°, 2°, 3° en grupos (1 pt c/u)
  scorer: boolean;
  champion: boolean;
};

const KNOCKOUT_IDS = BRACKET.map(m => m.id);

// Devuelve cuántas posiciones (1°, 2°, 3°) acertó el usuario en un grupo
export function scoreGroupPositions(
  groupKey: string,
  predictions: Record<string, Score>,
  results: Record<string, Score>
): number {
  // Necesita 6 predicciones y 6 resultados oficiales del grupo
  const groupMatches = ALL_MATCHES.filter(m => m.group === groupKey);
  const allPredFilled = groupMatches.every(m => predictions[m.id] !== undefined);
  const allResFilled = groupMatches.every(m => results[m.id] !== undefined);
  if (!allPredFilled || !allResFilled) return 0;

  const userTable = calculateGroupStandings(groupKey, predictions);
  const realTable = calculateGroupStandings(groupKey, results);
  let pts = 0;
  for (let i = 0; i < 3; i++) {
    if (userTable[i] && realTable[i] && userTable[i].team === realTable[i].team) pts++;
  }
  return pts;
}

export function calculatePoints(
  predictionsByMatch: Record<string, Score>,
  bonusPred: { top_scorer?: string | null; champion?: string | null },
  results: Record<string, Score>,
  officialTopScorer?: string | null,
  officialChampion?: string | null
): Breakdown {
  let total = 0, exact = 0, outcome = 0, knockoutExact = 0, knockoutOutcome = 0, groupPositions = 0;

  // Grupos
  for (const m of ALL_MATCHES) {
    const pts = scoreMatch(predictionsByMatch[m.id], results[m.id]);
    if (pts === 3) exact++;
    else if (pts === 1) outcome++;
    total += pts;
  }

  // Bonificación: 1 pt por cada posición (1°, 2°, 3°) acertada por grupo
  for (const gKey of Object.keys(GROUPS)) {
    const gp = scoreGroupPositions(gKey, predictionsByMatch, results);
    groupPositions += gp;
  }
  total += groupPositions;

  // Eliminatorias
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

  return { total, exact, outcome, knockoutExact, knockoutOutcome, groupPositions, scorer, champion };
}
