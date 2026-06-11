import { createClient } from '@/lib/supabase/server';
import { calculatePoints } from '@/lib/scoring';
import { Trophy, Users, Target, Crown, Check, X, Award, DollarSign } from 'lucide-react';
import { isEffectivelyLocked } from '@/lib/lock';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: predictions },
    { data: bonuses },
    { data: results },
    { data: settings },
    { data: userTiebreakers },
    { data: officialTiebreakers },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, full_name, email, paid'),
    supabase.from('match_predictions')
      .select('user_id, match_id, home_score, away_score')
      .range(0, 9999),
    supabase.from('bonus_predictions').select('user_id, top_scorer, champion').range(0, 9999),
    supabase.from('match_results').select('match_id, home_score, away_score'),
    supabase.from('tournament_settings').select('is_locked, lock_at, entry_fee, currency, official_top_scorer, official_champion').eq('id', 1).single(),
    supabase.from('user_group_tiebreaker').select('user_id, group_key, ranking').range(0, 9999),
    supabase.from('official_group_tiebreaker').select('group_key, ranking'),
  ]);

  const locked = isEffectivelyLocked(settings);

  const resultsMap: Record<string, { home_score: number; away_score: number }> = {};
  (results ?? []).forEach(r => { resultsMap[r.match_id] = { home_score: r.home_score, away_score: r.away_score }; });

  const predsByUser: Record<string, Record<string, { home_score: number; away_score: number }>> = {};
  (predictions ?? []).forEach(p => {
    if (!predsByUser[p.user_id]) predsByUser[p.user_id] = {};
    predsByUser[p.user_id][p.match_id] = { home_score: p.home_score, away_score: p.away_score };
  });

  const bonusByUser: Record<string, { top_scorer: string | null; champion: string | null }> = {};
  (bonuses ?? []).forEach(b => { bonusByUser[b.user_id] = { top_scorer: b.top_scorer, champion: b.champion }; });

  // Tiebreakers manuales por usuario y por grupo
  const tbByUser: Record<string, Record<string, string[]>> = {};
  (userTiebreakers ?? []).forEach((t: any) => {
    if (!tbByUser[t.user_id]) tbByUser[t.user_id] = {};
    tbByUser[t.user_id][t.group_key] = t.ranking as string[];
  });

  // Tiebreakers oficiales por grupo
  const officialTbMap: Record<string, string[]> = {};
  (officialTiebreakers ?? []).forEach((t: any) => {
    officialTbMap[t.group_key] = t.ranking as string[];
  });

  const fullRanking = (profiles ?? []).map(p => {
    const breakdown = calculatePoints(
      predsByUser[p.id] ?? {},
      bonusByUser[p.id] ?? {},
      resultsMap,
      settings?.official_top_scorer,
      settings?.official_champion,
      tbByUser[p.id] ?? {},
      officialTbMap
    );
    return { id: p.id, name: p.display_name, fullName: p.full_name, email: p.email, paid: p.paid, ...breakdown };
  }).sort((a,b) => {
    // Orden por total, luego desempates: campeón > goleador > exactos > resultados
    if (b.total !== a.total) return b.total - a.total;
    if (b.champion !== a.champion) return (b.champion ? 1 : 0) - (a.champion ? 1 : 0);
    if (b.scorer !== a.scorer) return (b.scorer ? 1 : 0) - (a.scorer ? 1 : 0);
    const bExact = b.exact + b.knockoutExact;
    const aExact = a.exact + a.knockoutExact;
    if (bExact !== aExact) return bExact - aExact;
    return (b.outcome + b.knockoutOutcome) - (a.outcome + a.knockoutOutcome);
  });

  // Mostramos a TODOS los jugadores siempre. El filtro por pago se aplica
  // SOLO al cálculo del pozo y los premios (ya hecho abajo), no a la visibilidad.
  const ranking = fullRanking;

  const totalPlayers = fullRanking.length;
  const fee = settings?.entry_fee ?? 0;
  const currency = settings?.currency ?? 'COP';
  const paidCount = fullRanking.filter(r => r.paid).length;
  const pot = paidCount * fee;
  const prize1 = Math.floor(pot * 0.5);
  const prize2 = Math.floor(pot * 0.25);
  const prize3 = Math.floor(pot * 0.10);

  return (
    <div>
      <h2 className="font-display text-5xl leading-none mb-6">TABLA</h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Jugadores" value={totalPlayers.toString()} />
        <Stat label={`Pozo (${currency})`} value={pot.toLocaleString('es-CO')} />
        <Stat label="Pagaron" value={`${paidCount}/${totalPlayers}`} />
      </div>

      {pot > 0 && (
        <div className="bg-zinc-900/50 border border-lime-400/20 rounded-lg p-4 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          <div className="text-zinc-500 sm:col-span-1 self-center"><Award className="w-3.5 h-3.5 text-lime-400 inline mr-1"/>Premios estimados</div>
          <div><span className="text-yellow-400">🥇 1°</span> <strong className="text-white">{prize1.toLocaleString('es-CO')}</strong> {currency}</div>
          <div><span className="text-zinc-300">🥈 2°</span> <strong className="text-white">{prize2.toLocaleString('es-CO')}</strong> {currency}</div>
          <div><span className="text-orange-400">🥉 3°</span> <strong className="text-white">{prize3.toLocaleString('es-CO')}</strong> {currency}</div>
        </div>
      )}

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-lime-400"/><b className="text-white">G-EX / E-EX</b> = Marcador exacto Grupos / Eliminatorias (3 pts)</span>
        <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-lime-400"/><b className="text-white">G-RES / E-RES</b> = Resultado correcto (1 pt)</span>
        <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-lime-400"/><b className="text-white">POS</b> = Posiciones de grupo acertadas (1 pt c/u)</span>
        <span className="flex items-center gap-1.5"><span className="text-lime-400">⚽</span><b className="text-white">GOL</b> = Goleador (5 pts)</span>
        <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-lime-400"/><b className="text-white">CAMP</b> = Campeón (5 pts)</span>
      </div>

      {paidCount < totalPlayers && (
        <div className="bg-zinc-900/50 border border-blue-500/20 rounded-lg px-4 py-3 mb-4 text-xs text-zinc-400 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-400 flex-shrink-0"/>
          <span>
            <strong className="text-blue-300">{totalPlayers - paidCount}</strong> jugador{(totalPlayers - paidCount) > 1 ? 'es' : ''} sin pago confirmado aparece{(totalPlayers - paidCount) > 1 ? 'n' : ''} con un punto rojo 🔴.
            Los premios se reparten solo entre los <strong className="text-lime-300">{paidCount}</strong> que pagaron.
          </span>
        </div>
      )}

      {ranking.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3"/>
          <p className="text-zinc-400">
            Aún no hay jugadores. Comparte el link para que se registren.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                <th className="px-3 py-3 text-left w-12">#</th>
                <th className="px-3 py-3 text-left">Jugador</th>
                <th className="px-2 py-3 text-center w-14">G-EX</th>
                <th className="px-2 py-3 text-center w-14">G-RES</th>
                <th className="px-2 py-3 text-center w-12">POS</th>
                <th className="px-2 py-3 text-center w-14">E-EX</th>
                <th className="px-2 py-3 text-center w-14">E-RES</th>
                <th className="px-2 py-3 text-center w-14">GOL</th>
                <th className="px-2 py-3 text-center w-14">CAMP</th>
                <th className="px-3 py-3 text-right w-20">TOTAL</th>
                <th className="px-3 py-3 text-center w-16">PAGÓ</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.id} className={`border-b border-zinc-800 last:border-0 ${
                  i === 0 ? 'bg-lime-400/5' : i === 1 ? 'bg-zinc-300/5' : i === 2 ? 'bg-orange-400/5' : ''
                }`}>
                  <td className="px-3 py-3 font-display text-2xl text-zinc-500">
                    {i === 0 ? <Trophy className="w-6 h-6 text-lime-400"/> :
                     i === 1 ? <span className="text-zinc-300">2</span> :
                     i === 2 ? <span className="text-orange-400">3</span> :
                     (i+1)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-bold flex items-center gap-2">
                      {r.name}
                      {!r.paid && <span title="No ha pagado" className="w-2 h-2 rounded-full bg-red-500"></span>}
                    </div>
                    {r.fullName && (
                      <div className="text-[11px] text-zinc-400 font-normal mt-0.5 truncate max-w-[260px]" title={r.fullName}>
                        {r.fullName}
                      </div>
                    )}
                    {r.email && (
                      <div className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[260px]" title={r.email}>
                        {r.email}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center font-medium text-zinc-300">{r.exact}</td>
                  <td className="px-2 py-3 text-center font-medium text-zinc-300">{r.outcome}</td>
                  <td className="px-2 py-3 text-center font-medium text-lime-400">{r.groupPositions}</td>
                  <td className="px-2 py-3 text-center font-medium text-zinc-300">{r.knockoutExact}</td>
                  <td className="px-2 py-3 text-center font-medium text-zinc-300">{r.knockoutOutcome}</td>
                  <td className="px-2 py-3 text-center">
                    {r.scorer ? <Check className="w-4 h-4 text-lime-400 inline"/> : <X className="w-4 h-4 text-zinc-700 inline"/>}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {r.champion ? <Check className="w-4 h-4 text-lime-400 inline"/> : <X className="w-4 h-4 text-zinc-700 inline"/>}
                  </td>
                  <td className="px-3 py-3 text-right font-display text-2xl text-lime-400">{r.total}</td>
                  <td className="px-3 py-3 text-center">
                    {r.paid ? (
                      <span className="inline-flex items-center gap-1 bg-lime-400/10 text-lime-400 text-xs font-bold uppercase px-2 py-1 rounded-full">
                        <Check className="w-3 h-3"/> Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 text-xs font-bold uppercase px-2 py-1 rounded-full">
                        <X className="w-3 h-3"/> No
                      </span>
                    )}
                  </td>
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
