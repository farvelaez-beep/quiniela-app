import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AllPredictionsClient from './AllPredictionsClient';
import { isEffectivelyLocked } from '@/lib/lock';

export const dynamic = 'force-dynamic';

export default async function AllPredictionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verificar si la quiniela está bloqueada (manual o por fecha)
  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('is_locked, lock_at')
    .eq('id', 1)
    .single();

  const locked = isEffectivelyLocked(settings);

  // Si NO está bloqueada, no se puede ver esta página todavía
  if (!locked) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="font-display text-4xl mb-3">PRONÓSTICOS DE TODOS</h1>
          <p className="text-zinc-400 mb-2">
            Esta sección estará disponible <strong className="text-white">cuando se bloqueen las predicciones</strong>.
          </p>
          <p className="text-zinc-500 text-sm">
            Así garantizamos que nadie vea ni copie pronósticos antes de tiempo.
          </p>
        </div>
      </div>
    );
  }

  // Cargar todo en paralelo
  const [
    { data: profiles },
    { data: predictions },
    { data: bonus },
    { data: allTiebreakers },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, full_name, email, paid'),
    supabase.from('match_predictions').select('user_id, match_id, home_score, away_score, winner_team'),
    supabase.from('bonus_predictions').select('user_id, top_scorer, champion'),
    supabase.from('user_group_tiebreaker').select('user_id, group_key, ranking'),
  ]);

  // Sólo usuarios que hayan registrado al menos una predicción
  // (lo usamos solo para mostrar info, no para filtrar — todos los jugadores aparecen)
  const usersWithPreds = new Set<string>();
  (predictions ?? []).forEach((p: any) => usersWithPreds.add(p.user_id));
  (bonus ?? []).forEach((b: any) => usersWithPreds.add(b.user_id));

  const playerList = ((profiles ?? []) as Array<{ id: string; display_name: string | null; full_name: string | null; email: string | null; paid: boolean | null }>)
    // Mostramos a TODOS los jugadores registrados, hayan pronosticado o no.
    // Los que no pronosticaron aparecen con celdas "—" en la matriz.
    .map(p => ({
      id: p.id,
      name: p.display_name || 'Sin nombre',
      fullName: p.full_name || '',
      email: p.email || '',
      paid: p.paid === true,
      hasPredictions: usersWithPreds.has(p.id),
    }))
    .sort((a, b) => {
      // Primero los que tienen pronósticos, luego los que no
      if (a.hasPredictions !== b.hasPredictions) return a.hasPredictions ? -1 : 1;
      return a.name.localeCompare(b.name, 'es');
    });

  // Estructurar predicciones por usuario
  type Pred = { home_score: number; away_score: number; winner_team: string | null };
  const predsByUser: Record<string, { groups: Record<string, Pred>; knockout: Record<string, Pred> }> = {};

  (predictions ?? []).forEach((p: any) => {
    if (!predsByUser[p.user_id]) {
      predsByUser[p.user_id] = { groups: {}, knockout: {} };
    }
    const isKnockout = p.match_id.startsWith('r32_') || p.match_id.startsWith('r16_') ||
                       p.match_id.startsWith('qf_') || p.match_id.startsWith('sf_') ||
                       p.match_id === 'tp' || p.match_id === 'final';
    const target = isKnockout ? predsByUser[p.user_id].knockout : predsByUser[p.user_id].groups;
    target[p.match_id] = {
      home_score: p.home_score,
      away_score: p.away_score,
      winner_team: p.winner_team ?? null,
    };
  });

  const bonusByUser: Record<string, { top_scorer: string | null; champion: string | null }> = {};
  (bonus ?? []).forEach((b: any) => {
    bonusByUser[b.user_id] = { top_scorer: b.top_scorer, champion: b.champion };
  });

  // Tiebreakers de grupo por usuario: tbByUser[user_id][group_key] = [team1, team2, ...]
  const tbByUser: Record<string, Record<string, string[]>> = {};
  (allTiebreakers ?? []).forEach((t: any) => {
    if (!tbByUser[t.user_id]) tbByUser[t.user_id] = {};
    tbByUser[t.user_id][t.group_key] = t.ranking as string[];
  });

  // Si no hay jugadores pagados con predicciones, mostrar mensaje
  if (playerList.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10">
          <div className="text-6xl mb-4">📋</div>
          <h1 className="font-display text-4xl mb-3">PRONÓSTICOS DE TODOS</h1>
          <p className="text-zinc-400">
            Aún no hay jugadores con pago confirmado y pronósticos registrados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AllPredictionsClient
      currentUserId={user.id}
      players={playerList}
      predsByUser={predsByUser}
      bonusByUser={bonusByUser}
      tiebreakersByUser={tbByUser}
    />
  );
}
