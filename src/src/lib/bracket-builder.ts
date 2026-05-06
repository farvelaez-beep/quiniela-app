import { BRACKET, type BracketMatch, type SlotSpec } from './bracket';
import { calculateGroupStandings, bestThirdPlacesByGroup } from './standings';

type Score = { home_score: number; away_score: number };
type Prediction = Score & { winner_team?: string | null };

export type ResolvedMatch = {
  id: string;
  phase: BracketMatch['phase'];
  position: number;
  match_date: string;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  winner: string | null; // ganador del partido (con desempate de penales si empate)
};

// Determina ganador de un partido eliminatorio
// Si predicciones empate → usa winner_team. Si no hay → usa home como fallback
function determineWinner(
  home: string | null, away: string | null,
  pred?: Prediction
): string | null {
  if (!home || !away || !pred) return null;
  if (pred.home_score > pred.away_score) return home;
  if (pred.away_score > pred.home_score) return away;
  // empate → penales
  if (pred.winner_team === home || pred.winner_team === away) return pred.winner_team;
  // sin pick → fallback al home
  return home;
}

function determineLoser(
  home: string | null, away: string | null,
  pred?: Prediction
): string | null {
  const winner = determineWinner(home, away, pred);
  if (!home || !away || !winner) return null;
  return winner === home ? away : home;
}

export function buildUserBracket(
  groupPredictions: Record<string, Score>,
  knockoutPredictions: Record<string, Prediction>,
  thirdPlacePicks: Record<string, string> // slot_id -> team
): ResolvedMatch[] {
  // Calcular tablas de grupos
  const groupTops: Record<string, { first: string | null; second: string | null }> = {};
  const groupKeys = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  for (const g of groupKeys) {
    const standings = calculateGroupStandings(g, groupPredictions);
    groupTops[g] = {
      first: standings[0]?.team ?? null,
      second: standings[1]?.team ?? null,
    };
  }

  // Map de equipos por id de partido (resolvemos en orden)
  const resolved: Record<string, ResolvedMatch> = {};

  // Iterar en orden del bracket (que está en orden de fase)
  const resolveSlot = (slot: SlotSpec): string | null => {
    if (slot.type === 'first') return groupTops[slot.group]?.first ?? null;
    if (slot.type === 'second') return groupTops[slot.group]?.second ?? null;
    if (slot.type === 'third_pick') return thirdPlacePicks[slot.slot_id] ?? null;
    if (slot.type === 'winner_of') {
      const prev = resolved[slot.matchId];
      if (!prev) return null;
      return prev.winner;
    }
    if (slot.type === 'loser_of') {
      const prev = resolved[slot.matchId];
      if (!prev || !prev.home_team || !prev.away_team) return null;
      return prev.winner === prev.home_team ? prev.away_team : prev.home_team;
    }
    return null;
  };

  for (const match of BRACKET) {
    const home = resolveSlot(match.home);
    const away = resolveSlot(match.away);
    const pred = knockoutPredictions[match.id];
    const home_score = pred ? pred.home_score : null;
    const away_score = pred ? pred.away_score : null;
    const winner = (home && away && pred) ? determineWinner(home, away, pred) : null;

    resolved[match.id] = {
      id: match.id, phase: match.phase, position: match.position, match_date: match.match_date,
      home_team: home, away_team: away,
      home_score, away_score, winner,
    };
  }

  return BRACKET.map(m => resolved[m.id]);
}
