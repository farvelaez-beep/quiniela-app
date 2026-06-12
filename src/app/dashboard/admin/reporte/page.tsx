import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { calculatePoints } from '@/lib/scoring';
import { TEAMS_ES, FLAG, ALL_MATCHES } from '@/lib/tournament-data';
import { BRACKET } from '@/lib/bracket';
import ReporteClient from './ReporteClient';

export const dynamic = 'force-dynamic';

export default async function ReportePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: profiles },
    { data: predictions },
    { data: bonuses },
    { data: results },
    { data: settings },
    { data: userTiebreakers },
    { data: officialTiebreakers },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, full_name, paid'),
    supabase.from('match_predictions').select('user_id, match_id, home_score, away_score, winner_team').range(0, 9999),
    supabase.from('bonus_predictions').select('user_id, top_scorer, champion').range(0, 9999),
    supabase.from('match_results').select('match_id, home_score, away_score, updated_at').order('updated_at', { ascending: false }),
    supabase.from('tournament_settings').select('entry_fee, currency, official_top_scorer, official_champion').eq('id', 1).single(),
    supabase.from('user_group_tiebreaker').select('user_id, group_key, ranking').range(0, 9999),
    supabase.from('official_group_tiebreaker').select('group_key, ranking'),
  ]);

  // Maps
  const resultsMap: Record<string, { home_score: number; away_score: number }> = {};
  (results ?? []).forEach((r: { match_id: string; home_score: number; away_score: number }) => {
    resultsMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score };
  });

  const predsByUser: Record<string, Record<string, { home_score: number; away_score: number }>> = {};
  const finalWinnerByUser: Record<string, string | null> = {};
  (predictions ?? []).forEach((p: { user_id: string; match_id: string; home_score: number; away_score: number; winner_team: string | null }) => {
    if (!predsByUser[p.user_id]) predsByUser[p.user_id] = {};
    predsByUser[p.user_id][p.match_id] = { home_score: p.home_score, away_score: p.away_score };
    if (p.match_id === 'final') finalWinnerByUser[p.user_id] = p.winner_team ?? null;
  });

  const bonusByUser: Record<string, { top_scorer: string | null; champion: string | null }> = {};
  (bonuses ?? []).forEach((b: { user_id: string; top_scorer: string | null; champion: string | null }) => {
    bonusByUser[b.user_id] = { top_scorer: b.top_scorer, champion: b.champion };
  });

  const tbByUser: Record<string, Record<string, string[]>> = {};
  (userTiebreakers ?? []).forEach((t: { user_id: string; group_key: string; ranking: string[] }) => {
    if (!tbByUser[t.user_id]) tbByUser[t.user_id] = {};
    tbByUser[t.user_id][t.group_key] = t.ranking;
  });
  const officialTbMap: Record<string, string[]> = {};
  (officialTiebreakers ?? []).forEach((t: { group_key: string; ranking: string[] }) => {
    officialTbMap[t.group_key] = t.ranking;
  });

  // Calcula ranking
  const ranking = ((profiles ?? []) as Array<{ id: string; display_name: string | null; full_name: string | null; paid: boolean | null }>)
    .map(p => {
      const breakdown = calculatePoints(
        predsByUser[p.id] ?? {},
        bonusByUser[p.id] ?? {},
        resultsMap,
        settings?.official_top_scorer,
        settings?.official_champion,
        tbByUser[p.id] ?? {},
        officialTbMap,
        finalWinnerByUser[p.id]
      );
      return {
        id: p.id,
        name: p.display_name || 'Sin nombre',
        fullName: p.full_name || '',
        paid: p.paid === true,
        ...breakdown,
      };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.exact !== a.exact) return b.exact - a.exact;
      if (b.knockoutExact !== a.knockoutExact) return b.knockoutExact - a.knockoutExact;
      return a.name.localeCompare(b.name, 'es');
    });

  // Pozo
  const paid = ranking.filter(r => r.paid).length;
  const fee = settings?.entry_fee ?? 0;
  const pot = paid * fee;
  const currency = settings?.currency ?? 'USD';

  // Partido del día: el último resultado guardado (puede ser grupos o eliminatorias)
  const lastResult = (results ?? [])[0]; // ya viene ordenado desc por updated_at
  let partidoDelDia: null | { home: string; away: string; homeScore: number; awayScore: number; phase: string } = null;
  if (lastResult) {
    const groupMatch = ALL_MATCHES.find(m => m.id === lastResult.match_id);
    if (groupMatch) {
      partidoDelDia = {
        home: groupMatch.home,
        away: groupMatch.away,
        homeScore: lastResult.home_score,
        awayScore: lastResult.away_score,
        phase: `Grupo ${groupMatch.group} · Jornada ${groupMatch.matchday}`,
      };
    } else {
      // Eliminatoria: los equipos dependen del bracket oficial
      const koMatch = BRACKET.find(m => m.id === lastResult.match_id);
      if (koMatch) {
        partidoDelDia = {
          home: lastResult.match_id, // ID como placeholder (puede mejorar después)
          away: '',
          homeScore: lastResult.home_score,
          awayScore: lastResult.away_score,
          phase: lastResult.match_id.toUpperCase(),
        };
      }
    }
  }

  return (
    <ReporteClient
      ranking={ranking}
      stats={{
        totalPlayers: ranking.length,
        paid,
        pot,
        currency,
      }}
      partidoDelDia={partidoDelDia}
      teamsEs={TEAMS_ES}
      flags={FLAG}
    />
  );
}
