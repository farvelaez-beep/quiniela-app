import { createClient } from '@/lib/supabase/server';
import { calculatePoints } from '@/lib/scoring';
import { Trophy, Users, Target, Crown, Check, X } from 'lucide-react';

export const dynamic = 'force-dynamic';

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

      {/* Leyenda de puntos */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-lime-400"/><b className="text-white">EX</b> = Marcador exacto (3 pts)</span>
        <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-lime-400"/><b className="text-white">RES</b> = Resultado (1 pt)</span>
        <span className="flex items-center gap-1.5"><span className="text-lime-400">⚽</span><b className="text-white">GOL</b> = Goleador (5 pts)</span>
        <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-lime-400"/><b className="text-white">CAMP</b> = Campeón (5 pts)</span>
      </div>

      {ranking.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3"/>
          <p className="text-zinc-400">Aún no hay jugadores. Comparte el link para que se registren.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                <th className="px-3 py-3 text-left w-12">#</th>
                <th className="px-3 py-3 text-left">Jugador</th>
                <th className="px-2 py-3 text-center w-14">EX</th>
                <th className="px-2 py-3 text-center w-14">RES</th>
                <th className="px-2 py-3 text-center w-14">GOL</th>
                <th className="px-2 py-3 text-center w-14">CAMP</th>
                <th className="px-3 py-3 text-right w-20">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.id} className={`border-b border-zinc-800 last:border-0 ${i === 0 ? 'bg-lime-400/5' : ''}`}>
                  <td className="px-3 py-3 font-display text-2xl text-zinc-500">
                    {i === 0 ? <Trophy className="w-6 h-6 text-lime-400"/> : (i+1)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-bold flex items-center gap-2">
                      {r.name}
                      {!r.paid && <span title="No ha pagado" className="w-2 h-2 rounded-full bg-red-500"></span>}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center font-medium text-zinc-300">{r.exact}</td>
                  <td className="px-2 py-3 text-center font-medium text-zinc-300">{r.outcome}</td>
                  <td className="px-2 py-3 text-center">
                    {r.scorer ? <Check className="w-4 h-4 text-lime-400 inline"/> : <X className="w-4 h-4 text-zinc-700 inline"/>}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {r.champion ? <Check className="w-4 h-4 text-lime-400 inline"/> : <X className="w-4 h-4 text-zinc-700 inline"/>}
                  </td>
                  <td className="px-3 py-3 text-right font-display text-2xl text-lime-400">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
