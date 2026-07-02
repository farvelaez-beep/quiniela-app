import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BreakdownClient from './BreakdownClient';
import { isEffectivelyLocked } from '@/lib/lock';

export const dynamic = 'force-dynamic';

export default async function BreakdownPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('is_locked, lock_at, official_top_scorer, official_champion')
    .eq('id', 1)
    .single();

  const locked = isEffectivelyLocked(settings);

  // Igual que "Todos los Pronosticos": solo visible con la quiniela bloqueada.
  if (!locked) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="font-display text-4xl mb-3">DESGLOSE DE PUNTOS</h1>
          <p className="text-zinc-400">
            Esta seccion estara disponible cuando se bloqueen las predicciones.
          </p>
        </div>
      </div>
    );
  }

  const [
    { data: profiles },
    { data: predictions },
    { data: bonus },
    { data: results },
    { data: userTiebreakers },
    { data: officialTiebreakers },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, full_name, email'),
    supabase.from('match_predictions')
      .select('user_id, match_id, home_score, away_score, winner_team')
      .range(0, 9999),
    supabase.from('bonus_predictions').select('user_id, top_scorer, champion').range(0, 9999),
    supabase.from('match_results').select('match_id, home_score, away_score, winner_team'),
    supabase.from('user_group_tiebreaker').select('user_id, group_key, ranking').range(0, 9999),
    supabase.from('official_group_tiebreaker').select('group_key, ranking'),
  ]);

  // Predicciones planas por usuario
  const predsByUser: Record<string, Record<string, { home_score: number; away_score: number; winner_team: string | null }>> = {};
  (predictions ?? []).forEach((p: any) => {
    if (!predsByUser[p.user_id]) predsByUser[p.user_id] = {};
    predsByUser[p.user_id][p.match_id] = {
      home_score: p.home_score, away_score: p.away_score, winner_team: p.winner_team ?? null,
    };
  });

  const bonusByUser: Record<string, { top_scorer: string | null; champion: string | null }> = {};
  (bonus ?? []).forEach((b: any) => { bonusByUser[b.user_id] = { top_scorer: b.top_scorer, champion: b.champion }; });

  const tbByUser: Record<string, Record<string, string[]>> = {};
  (userTiebreakers ?? []).forEach((t: any) => {
    if (!tbByUser[t.user_id]) tbByUser[t.user_id] = {};
    tbByUser[t.user_id][t.group_key] = t.ranking as string[];
  });

  const officialTbMap: Record<string, string[]> = {};
  (officialTiebreakers ?? []).forEach((t: any) => { officialTbMap[t.group_key] = t.ranking as string[]; });

  const resultsMap: Record<string, { home_score: number; away_score: number; winner_team: string | null }> = {};
  (results ?? []).forEach((r: any) => {
    resultsMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score, winner_team: r.winner_team ?? null };
  });

  const playerList = ((profiles ?? []) as Array<{ id: string; display_name: string | null; full_name: string | null; email: string | null }>)
    .filter(p => predsByUser[p.id]) // solo jugadores con pronosticos (los demas no tienen puntos que auditar)
    .map(p => ({
      id: p.id,
      name: p.display_name || 'Sin nombre',
      fullName: p.full_name || '',
      email: p.email || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <BreakdownClient
      currentUserId={user.id}
      players={playerList}
      predsByUser={predsByUser}
      bonusByUser={bonusByUser}
      tiebreakersByUser={tbByUser}
      results={resultsMap}
      officialTiebreakers={officialTbMap}
      officialTopScorer={settings?.official_top_scorer ?? null}
      officialChampion={settings?.official_champion ?? null}
    />
  );
}
