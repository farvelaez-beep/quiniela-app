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

// Calcula tabla de un grupo aplicando desempates oficiales FIFA (Art. 13).
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

// Calcula h2h (puntos, dg, gf) considerando solo los partidos entre los equipos del subset.
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

// Aplica criterios FIFA Step 1 (a-c: h2h points, gd, gf) sobre el subset.
// Retorna los equipos ordenados y los sub-grupos que siguen empatados (misma firma h2h).
function applyH2H(
  tied: TeamStats[],
  predictions: Record<string, Score>
): { ordered: TeamStats[]; tiedSubRuns: TeamStats[][] } {
  const h2h = computeH2H(tied, predictions);
  const ordered = [...tied].sort((a, b) => {
    const ha = h2h[a.team]; const hb = h2h[b.team];
    if (hb.points !== ha.points) return hb.points - ha.points;
    if (hb.gd !== ha.gd) return hb.gd - ha.gd;
    return hb.gf - ha.gf;
  });
  const tiedSubRuns: TeamStats[][] = [];
  let i = 0;
  while (i < ordered.length) {
    let j = i + 1;
    while (j < ordered.length) {
      const ha = h2h[ordered[i].team];
      const hb = h2h[ordered[j].team];
      if (ha.points !== hb.points || ha.gd !== hb.gd || ha.gf !== hb.gf) break;
      j++;
    }
    if (j - i > 1) tiedSubRuns.push(ordered.slice(i, j));
    i = j;
  }
  return { ordered, tiedSubRuns };
}

function resolveByGlobal(
  tied: TeamStats[],
  userRanking?: string[]
): TeamStats[] {
  return [...tied].sort((a, b) => {
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    if (userRanking) {
      const aIdx = userRanking.indexOf(a.team);
      const bIdx = userRanking.indexOf(b.team);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    }
    return a.team.localeCompare(b.team);
  });
}

// FIFA Art. 13:
//   Step 1 (a-c): h2h points -> h2h gd -> h2h gf  sobre el subset original
//   Step 2 (re-aplicacion): si despues del Step 1 quedan sub-grupos empatados Y el sub-grupo
//                           se redujo respecto al original, RE-aplicar a-c solo entre ellos
//   Step 2 (d-e):  gd global -> gf global  para lo que siga empatado
//   Ultimo recurso (no FIFA, pero para evitar empate en la app): userRanking -> alfabetico
function resolveTie(
  tied: TeamStats[],
  predictions: Record<string, Score>,
  userRanking?: string[]
): TeamStats[] {
  const pass1 = applyH2H(tied, predictions);
  if (pass1.tiedSubRuns.length === 0) return pass1.ordered;

  const result: TeamStats[] = [];
  let i = 0;
  while (i < pass1.ordered.length) {
    const subRun = pass1.tiedSubRuns.find(sr => sr.includes(pass1.ordered[i]));
    if (!subRun) {
      result.push(pass1.ordered[i]);
      i++;
      continue;
    }
    result.push(...resolveSubRun(subRun, tied.length, predictions, userRanking));
    i += subRun.length;
  }
  return result;
}

function resolveSubRun(
  subRun: TeamStats[],
  originalSubsetSize: number,
  predictions: Record<string, Score>,
  userRanking?: string[]
): TeamStats[] {
  let afterH2H: TeamStats[];
  let stillTied: TeamStats[][];

  if (subRun.length < originalSubsetSize) {
    // Se redujo: FIFA exige re-aplicar a-c solo entre los que quedan empatados.
    const pass2 = applyH2H(subRun, predictions);
    afterH2H = pass2.ordered;
    stillTied = pass2.tiedSubRuns;
  } else {
    // No se redujo: re-aplicar h2h daria exactamente el mismo resultado.
    // Pasar directo a global gd/gf.
    afterH2H = [...subRun];
    stillTied = [subRun];
  }

  const result: TeamStats[] = [];
  let i = 0;
  while (i < afterH2H.length) {
    const subSub = stillTied.find(sr => sr.includes(afterH2H[i]));
    if (!subSub) {
      result.push(afterH2H[i]);
      i++;
      continue;
    }
    result.push(...resolveByGlobal(subSub, userRanking));
    i += subSub.length;
  }
  return result;
}

// Detecta empates que ningun criterio calculable resuelve.
// Usa la misma logica FIFA completa (h2h doble + global gd/gf) que calculateGroupStandings.
// Devuelve los subgrupos de equipos (codigos) que quedan empatados despues de todo.
export function detectUnbreakableTies(
  groupKey: string,
  predictions: Record<string, Score>
): string[][] {
  const teams = GROUPS[groupKey] ?? [];
  const groupMatches = ALL_MATCHES.filter(m => m.group === groupKey);
  const allFilled = groupMatches.every(m => {
    const p = predictions[m.id];
    return p && typeof p.home_score === 'number' && typeof p.away_score === 'number';
  });
  if (!allFilled || teams.length === 0) return [];

  // Construir stats
  const stats: Record<string, TeamStats> = {};
  teams.forEach(t => {
    stats[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  });
  for (const m of groupMatches) {
    const p = predictions[m.id];
    if (!p) continue;
    const home = stats[m.home]; const away = stats[m.away];
    home.played++; away.played++;
    home.gf += p.home_score; home.ga += p.away_score;
    away.gf += p.away_score; away.ga += p.home_score;
    if (p.home_score > p.away_score) { home.won++; away.lost++; home.points += 3; }
    else if (p.home_score < p.away_score) { away.won++; home.lost++; away.points += 3; }
    else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
  }
  Object.values(stats).forEach(s => { s.gd = s.gf - s.ga; });

  const result: string[][] = [];
  const byPoints = Object.values(stats).sort((a, b) => b.points - a.points);
  let i = 0;
  while (i < byPoints.length) {
    let j = i + 1;
    while (j < byPoints.length && byPoints[j].points === byPoints[i].points) j++;
    if (j - i > 1) {
      const subset = byPoints.slice(i, j);
      const pass1 = applyH2H(subset, predictions);
      for (const subRun of pass1.tiedSubRuns) {
        let stillTied: TeamStats[][];
        if (subRun.length < subset.length) {
          const pass2 = applyH2H(subRun, predictions);
          stillTied = pass2.tiedSubRuns;
        } else {
          stillTied = [subRun];
        }
        for (const subSub of stillTied) {
          const sortedGlobal = [...subSub].sort((a, b) => {
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
          });
          let k = 0;
          while (k < sortedGlobal.length) {
            let l = k + 1;
            while (l < sortedGlobal.length &&
                   sortedGlobal[k].gd === sortedGlobal[l].gd &&
                   sortedGlobal[k].gf === sortedGlobal[l].gf) l++;
            if (l - k > 1) result.push(sortedGlobal.slice(k, l).map(s => s.team));
            k = l;
          }
        }
      }
    }
    i = j;
  }
  return result;
}

// Top 8 mejores 3ros lugares segun FIFA: pts -> DG -> GF -> ranking manual -> alfabetico
export function calculateBestThirdPlaces(
  predictions: Record<string, Score>,
  thirdsRanking?: string[],
  groupTiebreakers?: Record<string, string[]>
): TeamStats[] {
  const allThird: (TeamStats & { group: string })[] = [];
  for (const groupKey of Object.keys(GROUPS)) {
    const standings = calculateGroupStandings(groupKey, predictions, groupTiebreakers?.[groupKey]);
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
  predictions: Record<string, Score>,
  groupTiebreakers?: Record<string, string[]>
): Record<string, string> {
  const all3rd: Record<string, string> = {};
  for (const groupKey of Object.keys(GROUPS)) {
    const standings = calculateGroupStandings(groupKey, predictions, groupTiebreakers?.[groupKey]);
    if (standings.length >= 3) all3rd[standings[2].team] = groupKey;
  }
  const top8 = calculateBestThirdPlaces(predictions);
  const result: Record<string, string> = {};
  top8.forEach(t => { result[t.team] = all3rd[t.team]; });
  return result;
}
