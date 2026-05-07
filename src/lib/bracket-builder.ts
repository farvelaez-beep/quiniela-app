import { BRACKET, type BracketMatch, type SlotSpec } from './bracket';
import { calculateGroupStandings, calculateBestThirdPlaces, bestThirdPlacesByGroup } from './standings';
import { FIFA_ANEXO_C } from './fifa-anexo-c';

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
  winner: string | null;
};

function determineWinner(
  home: string | null, away: string | null,
  pred?: Prediction
): string | null {
  if (!home || !away || !pred) return null;
  if (pred.home_score > pred.away_score) return home;
  if (pred.away_score > pred.home_score) return away;
  if (pred.winner_team === home || pred.winner_team === away) return pred.winner_team;
  return home;
}

// Asigna 3ros lugares a slots R32 según el Anexo C oficial FIFA
// Devuelve { slot_id: teamCode } basado en cuáles 8 grupos tienen los mejores 3ros
export function computeFifaThirdAssignments(
  predictions: Record<string, Score>
): {
  assignments: Record<string, string>;
  fifaKey: string | null;
  optionNumber: number | null;
  groupOfTeam: Record<string, string>;
} {
  const top8 = calculateBestThirdPlaces(predictions);
  if (top8.length < 8) return { assignments: {}, fifaKey: null, optionNumber: null, groupOfTeam: {} };

  // Map team -> group para los 8 que clasifican
  const teamToGroup = bestThirdPlacesByGroup(predictions);
  const groupToTeam: Record<string, string> = {};
  Object.entries(teamToGroup).forEach(([team, group]) => { groupToTeam[group] = team; });

  // Construir key alfabética de los 8 grupos clasificados
  const groups = top8.map(t => teamToGroup[t.team]).filter(Boolean);
  const uniqueGroups = [...new Set(groups)].sort();
  if (uniqueGroups.length !== 8) return { assignments: {}, fifaKey: null, optionNumber: null, groupOfTeam: teamToGroup };
  const fifaKey = uniqueGroups.join('');

  const fifaMap = FIFA_ANEXO_C[fifaKey];
  if (!fifaMap) return { assignments: {}, fifaKey, optionNumber: null, groupOfTeam: teamToGroup };

  // Para cada slot R32, asignar el equipo correspondiente al grupo FIFA
  const assignments: Record<string, string> = {};
  Object.entries(fifaMap).forEach(([slotId, groupLetter]) => {
    if (groupToTeam[groupLetter]) {
      assignments[slotId] = groupToTeam[groupLetter];
    }
  });

  return { assignments, fifaKey, optionNumber: null, groupOfTeam: teamToGroup };
}

export function buildUserBracket(
  groupPredictions: Record<string, Score>,
  knockoutPredictions: Record<string, Prediction>
): ResolvedMatch[] {
  const groupTops: Record<string, { first: string | null; second: string | null }> = {};
  const groupKeys = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  for (const g of groupKeys) {
    const standings = calculateGroupStandings(g, groupPredictions);
    groupTops[g] = {
      first: standings[0]?.team ?? null,
      second: standings[1]?.team ?? null,
    };
  }

  const { assignments: fifaThirdAssignments } = computeFifaThirdAssignments(groupPredictions);

  const resolved: Record<string, ResolvedMatch> = {};

  const resolveSlot = (slot: SlotSpec): string | null => {
    if (slot.type === 'first') return groupTops[slot.group]?.first ?? null;
    if (slot.type === 'second') return groupTops[slot.group]?.second ?? null;
    if (slot.type === 'third_pick') return fifaThirdAssignments[slot.slot_id] ?? null;
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
