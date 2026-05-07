import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import KnockoutClient from './KnockoutClient';
import { calculateBestThirdPlaces, bestThirdPlacesByGroup } from '@/lib/standings';
import { isEffectivelyLocked } from '@/lib/lock';

export const dynamic = 'force-dynamic';

export default async function KnockoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: predictions },
    { data: results },
    { data: settings },
  ] = await Promise.all([
    supabase.from('match_predictions')
      .select('match_id, home_score, away_score, winner_team')
      .eq('user_id', user.id),
    supabase.from('match_results').select('match_id, home_score, away_score'),
    supabase.from('tournament_settings').select('is_locked, lock_at').eq('id', 1).single(),
  ]);

  const groupPreds: Record<string, { home_score: number; away_score: number }> = {};
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

  const top8Thirds = calculateBestThirdPlaces(groupPreds);
  const thirdsByGroup = bestThirdPlacesByGroup(groupPreds);

  const resultsMap: Record<string, { home_score: number; away_score: number }> = {};
  (results ?? []).forEach(r => {
    resultsMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score };
  });

  return (
    <KnockoutClient
      userId={user.id}
      groupPredictions={groupPreds}
      knockoutPredictions={knockoutPreds}
      top8Thirds={top8Thirds.map(t => t.team)}
      thirdsByGroup={thirdsByGroup}
      results={resultsMap}
      isLocked={isEffectivelyLocked(settings)}
    />
  );
}
