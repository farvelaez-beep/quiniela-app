import { createClient } from '@/lib/supabase/server';
import { calculatePoints } from '@/lib/scoring';
import { Trophy, Users } from 'lucide-react';

export const dynamic = 'force-dynamic'; // recalcular siempre

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: predictions },
    { data: bonuses },
    { data: results },
    { data: settings },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, paid'),
    supabase.from('match_predictions').select('user_id, match_id, home_score, away_score'),
    supabase.from('bonus_predictions').select('user_id, top_scorer, champion'),
    supabase.from('match_results').select('match_id, home_score, away_score'),
    supabase.from('tournament_settings').select('entry_fee, currency, official_top_scorer, official_champion').eq('id', 1).single(),
  ]);

  const resultsMap: Record<string, { home_score: number; away_score: number }> = {};
  (results ?? []).forEach(r => { resultsMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score }; });

  const predsByUser: Record<string, Record<string, { home_score: number; away_score: number }>> = {};
  (predictions ?? []).forEach(p => {
    if (!predsByUser[p.user_id]) predsByUser[p.user_id] = {};
    predsByUser[p.user_id][p.match_id] = { home_score: p.home_score, away_score: p.away_score };
  });

  const bonusByUser: Record<string, { top_scorer: string | null; champion: string | null }> = {};
  (bonuses ?? []).forEach(b => { bonusByUser[b.user_id] = { top_scorer: b.top_scorer, champion: b.champion }; });

  const ranking = (profiles ?? []).map(p => {
    const breakdown = calculatePoints(
      predsByUser[p.id] ?? {},
      bonusByUser[p.id] ?? {},
      resultsMap,
      settings?.official_top_scorer,
      settings?.official_champion
    );
    return { id: p.id, name: p.display_name, paid: p.paid, ...breakdown };
  }).sort((a,b) => b.total - a.total || b.exact - a.exact);

  const totalPlayers = ranking.length;
  const fee = settings?.entry_fee ?? 0;
  const currency = settings?.currency ?? 'COP';
  const pot = totalPlayers * fee;
  const paidCount = ranking.filter(r => r.paid).length;

  return (
    <div>
      <h2 className="font-display text-5xl leading-none mb-6">TABLA</h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Jugadores" value={totalPlayers.toString()} />
        <Stat label={`${currency} en pozo`} value={pot.toLocaleString('es-CO')} />
        <Stat label="Pagaron" value={`${paidCount}/${totalPlayers}`} />
      </div>

      {ranking.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3"/>
          <p className="text-zinc-400">Aún no hay jugadores. Comparte el link para que se registren.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[40px_1fr_70px_70px_70px_70px_80px] items-center px-4 py-3 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-bold">
              <div>#</div><div>Jugador</div>
              <div className="text-center">Exactos</div>
              <div className="text-center">Resultados</div>
              <div className="text-center">Goleador</div>
              <div className="text-center">Campeón</div>
              <div className="text-right">Total</div>
            </div>
            {ranking.map((r, i) => (
              <div key={r.id}
                className={`grid grid-cols-[40px_1fr_70px_70px_70px_70px_80px] items-center px-4 py-3 border-b border-zinc-800 last:border-0 ${
                  i === 0 ? 'bg-lime-400/5' : ''
                }`}>
                <div className="font-display text-2xl text-zinc-500">
                  {i === 0 ? <Trophy className="w-6 h-6 text-lime-400"/> : (i+1)}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    {r.name}
                    {!r.paid && <span title="No ha pagado" className="w-2 h-2 rounded-full bg-red-500"></span>}
                  </div>
                </div>
                <div className="text-center font-medium text-zinc-400">{r.exact}</div>
                <div className="text-center font-medium text-zinc-400">{r.outcome}</div>
                <div className="text-center font-medium text-zinc-400">{r.scorer ? '✓' : '–'}</div>
                <div className="text-center font-medium text-zinc-400">{r.champion ? '✓' : '–'}</div>
                <div className="text-right font-display text-2xl text-lime-400">{r.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="font-display text-3xl text-lime-400 leading-none">{value}</div>
      <div className="text-xs uppercase tracking-wider text-zinc-400 mt-1">{label}</div>
    </div>
  );
}
