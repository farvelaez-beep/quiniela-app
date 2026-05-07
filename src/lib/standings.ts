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

// Calcula tabla de un grupo aplicando desempates oficiales FIFA.
// Si después de todos los criterios calculables aún hay empate, usa userRanking
// (lista de teams en el orden preferido del usuario o admin) como último desempate.
export function calculateGroupStandings(
  groupKey: string,
  predictions: Record<string, Score>,
  userRanking?: string[]
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
    if (p.home_score > p.away_score) { home.won++; away.lost++; home.points += 3; }
    else if (p.home_score < p.away_score) { away.won++; home.lost++; away.points += 3; }
    else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
  }
  Object.values(stats).forEach(s => { s.gd = s.gf - s.ga; });

  return sortStandingsFifa(Object.values(stats), predictions, userRanking);
}

function sortStandingsFifa(
  teams: TeamStats[],
  predictions: Record<string, Score>,
  userRanking?: string[]
): TeamStats[] {
  const byPoints = [...teams].sort((a, b) => b.points - a.points);
  const result: TeamStats[] = [];
  let i = 0;
  while (i < byPoints.length) {
    let j = i;
    while (j < byPoints.length && byPoints[j].points === byPoints[i].points) j++;
    const tied = byPoints.slice(i, j);
    if (tied.length === 1) result.push(tied[0]);
    else result.push(...resolveTie(tied, predictions, userRanking));
    i = j;
  }
  return result;
}

function computeH2H(
  tied: TeamStats[],
  predictions: Record<string, Score>
): Record<string, { points: number; gd: number; gf: number }> {
  const h2h: Record<string, { points: number; gd: number; gf: number }> = {};
  tied.forEach(t => { h2h[t.team] = { points: 0, gd: 0, gf: 0 }; });
  for (let a = 0; a < tied.length; a++) {
    for (let b = a + 1; b < tied.length; b++) {
      const teamA = tied[a].team;
      const teamB = tied[b].team;
      const match = ALL_MATCHES.find(m =>
        (m.home === teamA && m.away === teamB) || (m.home === teamB && m.away === teamA)
      );
      if (!match) continue;
      const p = predictions[match.id];
      if (!p || typeof p.home_score !== 'number' || typeof p.away_score !== 'number') continue;
      const aIsHome = match.home === teamA;
      const aScore = aIsHome ? p.home_score : p.away_score;
      const bScore = aIsHome ? p.away_score : p.home_score;
      h2h[teamA].gf += aScore;
      h2h[teamA].gd += aScore - bScore;
      h2h[teamB].gf += bScore;
      h2h[teamB].gd += bScore - aScore;
      if (aScore > bScore) h2h[teamA].points += 3;
      else if (bScore > aScore) h2h[teamB].points += 3;
      else { h2h[teamA].points += 1; h2h[teamB].points += 1; }
    }
  }
  return h2h;
}

function resolveTie(
  tied: TeamStats[],
  predictions: Record<string, Score>,
  userRanking?: string[]
): TeamStats[] {
  const h2h = computeH2H(tied, predictions);
  return [...tied].sort((a, b) => {
    const ha = h2h[a.team]; const hb = h2h[b.team];
    if (hb.points !== ha.points) return hb.points - ha.points;
    if (hb.gd !== ha.gd) return hb.gd - ha.gd;
    if (hb.gf !== ha.gf) return hb.gf - ha.gf;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // Sigue empate → usar ranking del usuario/admin si existe
    if (userRanking) {
      const aIdx = userRanking.indexOf(a.team);
      const bIdx = userRanking.indexOf(b.team);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    }
    return a.team.localeCompare(b.team);
  });
}

// Detecta empates que ningún criterio calculable resuelve.
// Devuelve los subgrupos de equipos (códigos) que quedan empatados después de FIFA.
export function detectUnbreakableTies(
  groupKey: string,
  predictions: Record<string, Score>
): string[][] {
  const teams = GROUPS[groupKey] ?? [];
  const groupMatches = ALL_MATCHES.filter(m => m.group === groupKey);
  // Solo si hay 6 partidos predichos completos
  const allFilled = groupMatches.every(m => {
    const p = predictions[m.id];
    return p && typeof p.home_score === 'number' && typeof p.away_score === 'number';
  });
  if (!allFilled || teams.length === 0) return [];

  // Calcular tabla SIN ranking (para detectar empates "puros")
  const standings = calculateGroupStandings(groupKey, predictions);
  const result: string[][] = [];
  let i = 0;
  while (i < standings.length) {
    let j = i + 1;
    while (j < standings.length && standings[j].points === standings[i].points) j++;
    // Subgrupo empatado en puntos: standings[i..j)
    if (j - i > 1) {
      const sub = standings.slice(i, j);
      const h2h = computeH2H(sub, predictions);
      // Dentro del subgrupo, encontrar sub-runs con fingerprint idéntico
      const fp = (t: TeamStats) =>
        `${h2h[t.team].points}-${h2h[t.team].gd}-${h2h[t.team].gf}-${t.gd}-${t.gf}`;
      let a = 0;
      while (a < sub.length) {
        let b = a + 1;
        while (b < sub.length && fp(sub[a]) === fp(sub[b])) b++;
        if (b - a > 1) result.push(sub.slice(a, b).map(s => s.team));
        a = b;
      }
    }
    i = j;
  }
  return result;
}

// Top 8 mejores 3ros lugares según FIFA: pts → DG → GF → fair play → sorteo
export function calculateBestThirdPlaces(
  predictions: Record<string, Score>,
  thirdsRanking?: string[] // ranking del usuario/admin como último desempate entre 3ros
): TeamStats[] {
  const allThird: (TeamStats & { group: string })[] = [];
  for (const groupKey of Object.keys(GROUPS)) {
    const standings = calculateGroupStandings(groupKey, predictions);
    if (standings.length >= 3) allThird.push({ ...standings[2], group: groupKey });
  }
  const sorted = [...allThird].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    if (thirdsRanking) {
      const aIdx = thirdsRanking.indexOf(a.team);
      const bIdx = thirdsRanking.indexOf(b.team);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    }
    return a.team.localeCompare(b.team);
  });
  return sorted.slice(0, 8);
}

export function bestThirdPlacesByGroup(
  predictions: Record<string, Score>
): Record<string, string> {
  const all3rd: Record<string, string> = {};
  for (const groupKey of Object.keys(GROUPS)) {
    const standings = calculateGroupStandings(groupKey, predictions);
    if (standings.length >= 3) all3rd[standings[2].team] = groupKey;
  }
  const top8 = calculateBestThirdPlaces(predictions);
  const result: Record<string, string> = {};
  top8.forEach(t => { result[t.team] = all3rd[t.team]; });
  return result;
}
