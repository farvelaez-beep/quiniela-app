import { ALL_MATCHES, GROUPS } from './tournament-data';

type Score = { home_score: number; away_score: number };

export type TeamStats = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

// Calcula tabla de un grupo basado en predicciones del usuario
export function calculateGroupStandings(
  groupKey: string,
  predictions: Record<string, Score>
): TeamStats[] {
  const teams = GROUPS[groupKey] ?? [];
  const stats: Record<string, TeamStats> = {};
  teams.forEach(t => {
    stats[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  });

  const groupMatches = ALL_MATCHES.filter(m => m.group === groupKey);
  for (const m of groupMatches) {
    const p = predictions[m.id];
    if (!p) continue;
    if (typeof p.home_score !== 'number' || typeof p.away_score !== 'number') continue;

    const home = stats[m.home];
    const away = stats[m.away];
    home.played++; away.played++;
    home.gf += p.home_score; home.ga += p.away_score;
    away.gf += p.away_score; away.ga += p.home_score;

    if (p.home_score > p.away_score) {
      home.won++; away.lost++;
      home.points += 3;
    } else if (p.home_score < p.away_score) {
      away.won++; home.lost++;
      away.points += 3;
    } else {
      home.drawn++; away.drawn++;
      home.points += 1; away.points += 1;
    }
  }

  Object.values(stats).forEach(s => { s.gd = s.gf - s.ga; });

  // Ordenar por: pts → DG → GF → enfrentamiento directo (entre empatados) → alfabético
  return sortStandings(Object.values(stats), predictions);
}

function sortStandings(teams: TeamStats[], predictions: Record<string, Score>): TeamStats[] {
  return [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // Enfrentamiento directo
    const direct = headToHead(a.team, b.team, predictions);
    if (direct !== 0) return direct;
    // Fallback alfabético
    return a.team.localeCompare(b.team);
  });
}

function headToHead(teamA: string, teamB: string, predictions: Record<string, Score>): number {
  // Buscar el partido entre teamA y teamB
  const match = ALL_MATCHES.find(m =>
    (m.home === teamA && m.away === teamB) || (m.home === teamB && m.away === teamA)
  );
  if (!match) return 0;
  const p = predictions[match.id];
  if (!p || typeof p.home_score !== 'number') return 0;

  const aIsHome = match.home === teamA;
  const aScore = aIsHome ? p.home_score : p.away_score;
  const bScore = aIsHome ? p.away_score : p.home_score;
  if (aScore > bScore) return -1; // a gana, va antes
  if (aScore < bScore) return 1;
  return 0;
}

// Calcula los 8 mejores 3ros lugares de los 12 grupos
export function calculateBestThirdPlaces(
  predictions: Record<string, Score>
): TeamStats[] {
  const allThird: (TeamStats & { group: string })[] = [];
  for (const groupKey of Object.keys(GROUPS)) {
    const standings = calculateGroupStandings(groupKey, predictions);
    if (standings.length >= 3) {
      allThird.push({ ...standings[2], group: groupKey });
    }
  }
  // Mismo orden de desempate
  const sorted = [...allThird].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  });
  return sorted.slice(0, 8);
}

// Devuelve un map de team -> grupo de los 8 mejores 3ros lugares
export function bestThirdPlacesByGroup(
  predictions: Record<string, Score>
): Record<string, string> {
  const all3rd: Record<string, string> = {};
  for (const groupKey of Object.keys(GROUPS)) {
    const standings = calculateGroupStandings(groupKey, predictions);
    if (standings.length >= 3) {
      all3rd[standings[2].team] = groupKey;
    }
  }
  const top8 = calculateBestThirdPlaces(predictions);
  const result: Record<string, string> = {};
  top8.forEach(t => { result[t.team] = all3rd[t.team]; });
  return result;
}
