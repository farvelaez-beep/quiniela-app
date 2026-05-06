import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import KnockoutClient from './KnockoutClient';
import { calculateGroupStandings, calculateBestThirdPlaces, bestThirdPlacesByGroup } from '@/lib/standings';
import { GROUPS } from '@/lib/tournament-data';
import { THIRD_PLACE_SLOTS } from '@/lib/bracket';

export const dynamic = 'force-dynamic';

export default async function KnockoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: predictions },
    { data: thirdPicks },
    { data: results },
    { data: settings },
  ] = await Promise.all([
    supabase.from('match_predictions')
      .select('match_id, home_score, away_score, winner_team')
      .eq('user_id', user.id),
    supabase.from('user_third_place_picks')
      .select('slot_id, team')
      .eq('user_id', user.id),
    supabase.from('match_results').select('match_id, home_score, away_score'),
    supabase.from('tournament_settings').select('is_locked').eq('id', 1).single(),
  ]);

  // Predicciones grupos
  const groupPreds: Record<string, { home_score: number; away_score: number }> = {};
  // Predicciones eliminatorias
  const knockoutPreds: Record<string, { home_score: number; away_score: number; winner_team: string | null }> = {};

  (predictions ?? []).forEach((p: any) => {
    if (p.match_id.startsWith('r32_') || p.match_id.startsWith('r16_') ||
        p.match_id.startsWith('qf_') || p.match_id.startsWith('sf_') ||
        p.match_id === 'tp' || p.match_id === 'final') {
      knockoutPreds[p.match_id] = {
        home_score: p.home_score, away_score: p.away_score,
        winner_team: p.winner_team
      };
    } else {
      groupPreds[p.match_id] = { home_score: p.home_score, away_score: p.away_score };
    }
  });

  // Picks de 3ros
  const thirdPlacePicks: Record<string, string> = {};
  (thirdPicks ?? []).forEach((p: any) => {
    if (p.team) thirdPlacePicks[p.slot_id] = p.team;
  });

  // Calcular tablas y top 8 de 3ros
  const standings: Record<string, ReturnType<typeof calculateGroupStandings>> = {};
  Object.keys(GROUPS).forEach(g => {
    standings[g] = calculateGroupStandings(g, groupPreds);
  });

  const top8Thirds = calculateBestThirdPlaces(groupPreds);
  const thirdsByGroup = bestThirdPlacesByGroup(groupPreds);

  // Resultados oficiales
  const resultsMap: Record<string, { home_score: number; away_score: number }> = {};
  (results ?? []).forEach(r => {
    resultsMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score };
  });

  return (
    <KnockoutClient
      userId={user.id}
      groupPredictions={groupPreds}
      knockoutPredictions={knockoutPreds}
      thirdPlacePicks={thirdPlacePicks}
      thirdPlaceSlots={THIRD_PLACE_SLOTS}
      standings={standings}
      top8Thirds={top8Thirds.map(t => t.team)}
      thirdsByGroup={thirdsByGroup}
      results={resultsMap}
      isLocked={settings?.is_locked ?? false}
    />
  );
}
