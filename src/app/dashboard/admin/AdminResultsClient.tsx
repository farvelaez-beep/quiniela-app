'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Save, Loader2, Lock, Unlock, Check, Trophy, Star, AlertTriangle, ArrowUp, ArrowDown, Trash2, Calendar, Download } from 'lucide-react';
import { GROUPS, ALL_MATCHES, ALL_TEAMS, TEAMS_ES, FLAG } from '@/lib/tournament-data';
import { createClient } from '@/lib/supabase/client';
import { calculateGroupStandings, calculateBestThirdPlaces, detectUnbreakableTies, type TeamStats } from '@/lib/standings';
import { formatLockAtMedellin, isEffectivelyLocked } from '@/lib/lock';

type Score = { home_score: number | ''; away_score: number | '' };

export default function AdminResultsClient({
  initialResults, initialLocked, initialLockAt, initialTopScorer, initialChampion, initialTiebreakers,
}: {
  initialResults: Record<string, { home_score: number; away_score: number }>;
  initialLocked: boolean;
  initialLockAt: string | null;
  initialTopScorer: string;
  initialChampion: string;
  initialTiebreakers: Record<string, string[]>;
}) {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, Score>>(() => {
    const m: Record<string, Score> = {};
    Object.entries(initialResults).forEach(([k, v]) => { m[k] = v; });
    return m;
  });
  const [tiebreakers, setTiebreakers] = useState<Record<string, string[]>>(initialTiebreakers);
  const [topScorer, setTopScorer] = useState(initialTopScorer);
  const [champion, setChampion] = useState(initialChampion);
  const [locked, setLocked] = useState(initialLocked);
  const [lockAt, setLockAt] = useState<string | null>(initialLockAt);
  const [savingLockAt, setSavingLockAt] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>('A');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [togglingLock, setTogglingLock] = useState(false);
  const [clearing, setClearing] = useState(false);
  // IDs que ya estaban guardados al cargar la página - para detectar borrados al guardar
  const [persistedIds] = useState<Set<string>>(() => new Set(Object.keys(initialResults)));

  // Auto-lock por fecha: si pasó la fecha lock_at, considerar bloqueada
  const effectivelyLocked = useMemo(
    () => isEffectivelyLocked({ is_locked: locked, lock_at: lockAt }),
    [locked, lockAt]
  );

  // Convierte una fecha ISO UTC a string compatible con <input type="datetime-local"> en hora Medellín
  const toMedellinInputValue = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    // Medellín = UTC-5
    const med = new Date(d.getTime() - 5 * 60 * 60 * 1000);
    const yyyy = med.getUTCFullYear();
    const mm = String(med.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(med.getUTCDate()).padStart(2, '0');
    const hh = String(med.getUTCHours()).padStart(2, '0');
    const mi = String(med.getUTCMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  // Convierte un string del input (interpretado como hora Medellín) a ISO UTC
  const fromMedellinInputValue = (val: string): string | null => {
    if (!val) return null;
    // val es "YYYY-MM-DDTHH:MM" — lo interpretamos como hora Medellín (UTC-5)
    // y devolvemos el ISO UTC equivalente
    const [datePart, timePart] = val.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    // Construir Date como si fuera UTC, luego sumar 5h para obtener el UTC real
    const asIfUtc = Date.UTC(y, m - 1, d, hh, mm);
    const utcMs = asIfUtc + 5 * 60 * 60 * 1000;
    return new Date(utcMs).toISOString();
  };

  const saveLockAt = async (newValue: string) => {
    setSavingLockAt(true);
    const supabase = createClient();
    const isoUtc = fromMedellinInputValue(newValue);
    await supabase.from('tournament_settings').update({ lock_at: isoUtc }).eq('id', 1);
    setLockAt(isoUtc);
    setSavingLockAt(false);
    router.refresh();
  };

  const clearLockAt = async () => {
    if (!confirm('¿Quitar el bloqueo automático? La quiniela solo se bloqueará cuando le des al botón manual.')) return;
    setSavingLockAt(true);
    const supabase = createClient();
    await supabase.from('tournament_settings').update({ lock_at: null }).eq('id', 1);
    setLockAt(null);
    setSavingLockAt(false);
    router.refresh();
  };

  const updateMatch = (id: string, side: 'home_score'|'away_score', val: string) => {
    if (val !== '' && (isNaN(+val) || +val < 0 || +val > 30)) return;
    const cur = results[id] ?? { home_score: '' as const, away_score: '' as const };
    setResults({ ...results, [id]: { ...cur, [side]: val === '' ? '' : +val } });
    setDirty(true);
  };

  const moveTiebreaker = (groupKey: string, idx: number, dir: -1 | 1) => {
    const current = tiebreakers[groupKey] ?? [];
    const newPos = idx + dir;
    if (newPos < 0 || newPos >= current.length) return;
    const next = [...current];
    [next[idx], next[newPos]] = [next[newPos], next[idx]];
    setTiebreakers({ ...tiebreakers, [groupKey]: next });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const rows = Object.entries(results)
      .filter(([_, s]) => s.home_score !== '' && s.away_score !== '')
      .map(([match_id, s]) => ({ match_id, home_score: s.home_score as number, away_score: s.away_score as number }));
    if (rows.length > 0) {
      await supabase.from('match_results').upsert(rows, { onConflict: 'match_id' });
    }

    // Detectar partidos que estaban guardados pero ahora se vaciaron -> borrarlos
    const filledIds = new Set(rows.map(r => r.match_id));
    const idsToDelete = Array.from(persistedIds).filter(id => !filledIds.has(id));
    if (idsToDelete.length > 0) {
      await supabase.from('match_results').delete().in('match_id', idsToDelete);
    }

    await supabase.from('tournament_settings').update({
      official_top_scorer: topScorer.trim() || null,
      official_champion: champion || null,
    }).eq('id', 1);

    const tbRows = Object.entries(tiebreakers)
      .filter(([_, ranking]) => ranking && ranking.length > 0)
      .map(([group_key, ranking]) => ({ group_key, ranking }));
    if (tbRows.length > 0) {
      await supabase.from('official_group_tiebreaker').upsert(tbRows, { onConflict: 'group_key' });
    }

    setSaving(false);
    setDirty(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
    router.refresh();
  };

  const clearAll = async () => {
    const ok = window.confirm(
      'Vas a borrar TODOS los resultados oficiales: marcadores, goleador, campeón y desempates manuales. Esta acción no se puede deshacer. ¿Continuar?'
    );
    if (!ok) return;
    setClearing(true);
    const supabase = createClient();
    await supabase.from('match_results').delete().neq('match_id', '__sentinel__');
    await supabase.from('official_group_tiebreaker').delete().neq('group_key', '__sentinel__');
    await supabase.from('tournament_settings').update({
      official_top_scorer: null,
      official_champion: null,
    }).eq('id', 1);
    setResults({});
    setTiebreakers({});
    setTopScorer('');
    setChampion('');
    setDirty(false);
    setClearing(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
    router.refresh();
  };

  const toggleLock = async () => {
    setTogglingLock(true);
    const supabase = createClient();
    const newLocked = !locked;
    await supabase.from('tournament_settings').update({ is_locked: newLocked }).eq('id', 1);
    setLocked(newLocked);
    setTogglingLock(false);
    router.refresh();
  };

  const sortedTeams = [...ALL_TEAMS].sort((a,b) => TEAMS_ES[a].localeCompare(TEAMS_ES[b]));

  const cleanResults = useMemo(() => {
    const m: Record<string, { home_score: number; away_score: number }> = {};
    Object.entries(results).forEach(([k, v]) => {
      if (v.home_score !== '' && v.away_score !== '') {
        m[k] = { home_score: v.home_score as number, away_score: v.away_score as number };
      }
    });
    return m;
  }, [results]);

  const top8ThirdsOfficial = useMemo(() => {
    const set = new Set<string>();
    calculateBestThirdPlaces(cleanResults).forEach(t => set.add(t.team));
    return set;
  }, [cleanResults]);

  const tiesPerGroup = useMemo(() => {
    const map: Record<string, string[][]> = {};
    Object.keys(GROUPS).forEach(g => {
      map[g] = detectUnbreakableTies(g, cleanResults);
    });
    return map;
  }, [cleanResults]);

  // Inicializar tiebreakers default cuando se detecta empate sin ranking
  useEffect(() => {
    Object.entries(tiesPerGroup).forEach(([gKey, tieGroups]) => {
      if (tieGroups.length > 0 && !tiebreakers[gKey]) {
        const standings = calculateGroupStandings(gKey, cleanResults);
        const initial = standings.map(s => s.team);
        setTiebreakers(prev => ({ ...prev, [gKey]: initial }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiesPerGroup]);

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-5xl leading-none">RESULTADOS OFICIALES</h2>
          <p className="text-zinc-400 text-sm mt-1">Carga los marcadores reales para que se calculen los puntos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/api/admin/export-predictions" download
            className="px-4 py-2 rounded-lg font-bold uppercase text-sm flex items-center gap-2 bg-lime-400/10 text-lime-300 border border-lime-400/40 hover:bg-lime-400/20 transition">
            <Download className="w-4 h-4"/>
            Descargar Excel
          </a>
          <button onClick={clearAll} disabled={clearing}
            className="px-4 py-2 rounded-lg font-bold uppercase text-sm flex items-center gap-2 bg-red-900/40 text-red-300 border border-red-800 hover:bg-red-900/60 disabled:opacity-50">
            {clearing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
            Borrar todo
          </button>
          <button onClick={toggleLock} disabled={togglingLock}
            className={`px-4 py-2 rounded-lg font-bold uppercase text-sm flex items-center gap-2 disabled:opacity-50 ${
              locked ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}>
            {togglingLock ? <Loader2 className="w-4 h-4 animate-spin"/> : (locked ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>)}
            {locked ? 'Bloqueado' : 'Bloquear quiniela'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar className="w-5 h-5 text-lime-400"/>
            <span className="font-display text-xl text-white">BLOQUEO AUTOMÁTICO</span>
          </div>
          <div className="flex-1 min-w-[280px]">
            <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">
              Fecha y hora (Medellín, UTC-5)
            </label>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="datetime-local"
                value={toMedellinInputValue(lockAt)}
                onChange={e => saveLockAt(e.target.value)}
                disabled={savingLockAt || locked}
                className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm flex-1 min-w-[200px] disabled:opacity-50"
              />
              {savingLockAt && <Loader2 className="w-4 h-4 animate-spin text-zinc-400"/>}
              {lockAt && !locked && (
                <button onClick={clearLockAt} disabled={savingLockAt}
                  className="text-xs text-red-400 hover:text-red-300 underline disabled:opacity-50">
                  Quitar
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">
              {lockAt && !locked && (
                <>La quiniela se bloqueará automáticamente el <strong className="text-zinc-300">{formatLockAtMedellin(lockAt)}</strong> hora Medellín.</>
              )}
              {!lockAt && !locked && (
                <>Sin bloqueo automático. Solo se bloqueará si presionas el botón manualmente.</>
              )}
              {locked && (
                <>La quiniela está bloqueada manualmente. La fecha automática queda inhabilitada.</>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4 grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Goleador oficial</label>
          <input value={topScorer} onChange={e=>{setTopScorer(e.target.value); setDirty(true)}}
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white" placeholder="Nombre exacto" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Campeón oficial</label>
          <select value={champion} onChange={e=>{setChampion(e.target.value); setDirty(true)}}
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white">
            <option value="">— Sin definir —</option>
            {sortedTeams.map(t => <option key={t} value={t}>{FLAG[t]} {TEAMS_ES[t]}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(GROUPS).map(([gKey]) => {
          const matches = ALL_MATCHES.filter(m => m.group === gKey);
          const filled = matches.filter(m => {
            const r = results[m.id]; return r && r.home_score !== '' && r.away_score !== '';
          }).length;
          const isOpen = openGroup === gKey;
          const ranking = tiebreakers[gKey];
          const officialStandings = filled === 6
            ? calculateGroupStandings(gKey, cleanResults, ranking)
            : null;
          const tiedSubgroups = tiesPerGroup[gKey] ?? [];
          const hasUnbreakableTie = tiedSubgroups.length > 0;

          return (
            <div key={gKey} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <button onClick={()=>setOpenGroup(isOpen?null:gKey)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50">
                <div className="flex items-center gap-4">
                  <div className="font-display text-3xl text-lime-400 leading-none">GRUPO {gKey}</div>
                  <div className="text-xs text-zinc-500 uppercase font-bold">{filled}/6 cargados</div>
                  {hasUnbreakableTie && (
                    <span className="text-yellow-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5"/>Definir orden
                    </span>
                  )}
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
              </button>
              {isOpen && (
                <div className="border-t border-zinc-800 p-4 space-y-2">
                  {matches.map(m => {
                    const r = results[m.id] ?? { home_score: '', away_score: '' };
                    return (
                      <div key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium text-right">{TEAMS_ES[m.home]}</span>
                          <span className="text-xl">{FLAG[m.home]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" max="30"
                            value={r.home_score} onChange={e=>updateMatch(m.id,'home_score',e.target.value)}
                            className="w-12 h-10 bg-black border border-zinc-700 rounded text-center font-display text-xl text-lime-400" />
                          <span className="text-zinc-600">:</span>
                          <input type="number" min="0" max="30"
                            value={r.away_score} onChange={e=>updateMatch(m.id,'away_score',e.target.value)}
                            className="w-12 h-10 bg-black border border-zinc-700 rounded text-center font-display text-xl text-lime-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{FLAG[m.away]}</span>
                          <span className="font-medium">{TEAMS_ES[m.away]}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Desempate manual oficial */}
                  {officialStandings && hasUnbreakableTie && (
                    <div className="mt-4 pt-4 border-t border-yellow-500/30 bg-yellow-500/5 -mx-4 px-4 pb-4 rounded-b-xl">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"/>
                        <div>
                          <div className="text-yellow-400 font-bold text-sm">Empate sin resolver con criterios calculables</div>
                          <div className="text-xs text-zinc-400 mt-1">
                            Los equipos abajo están empatados después de aplicar puntos, cabeza-a-cabeza y diferencia/goles globales. <strong className="text-zinc-300">Asigna el orden según la decisión oficial FIFA</strong> (fair play, ranking o sorteo). Esto define la tabla oficial.
                          </div>
                        </div>
                      </div>
                      {tiedSubgroups.map((sub, sIdx) => (
                        <div key={sIdx} className="mb-3 last:mb-0">
                          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5">
                            Empate #{sIdx + 1}: {sub.length} equipos
                          </div>
                          {(ranking ?? []).filter(t => sub.includes(t)).map((team, idx, arr) => {
                            const fullIdx = (ranking ?? []).indexOf(team);
                            return (
                              <div key={team} className="flex items-center gap-2 bg-black/40 rounded p-2 mb-1.5">
                                <span className="font-display text-lg text-lime-400 w-8">
                                  {(officialStandings.findIndex(s => s.team === team) + 1)}°
                                </span>
                                <span className="text-xl">{FLAG[team]}</span>
                                <span className="font-medium flex-1">{TEAMS_ES[team]}</span>
                                <button onClick={() => moveTiebreaker(gKey, fullIdx, -1)} disabled={idx === 0}
                                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed">
                                  <ArrowUp className="w-3.5 h-3.5"/>
                                </button>
                                <button onClick={() => moveTiebreaker(gKey, fullIdx, 1)} disabled={idx === arr.length - 1}
                                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed">
                                  <ArrowDown className="w-3.5 h-3.5"/>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tabla oficial calculada */}
                  {officialStandings && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3 flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400"/>Tabla oficial (calculada)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[480px]">
                          <thead>
                            <tr className="text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                              <th className="text-left py-1.5 px-1 w-8">#</th>
                              <th className="text-left py-1.5 px-1">Equipo</th>
                              <th className="text-center py-1.5 px-1">PJ</th>
                              <th className="text-center py-1.5 px-1">G</th>
                              <th className="text-center py-1.5 px-1">E</th>
                              <th className="text-center py-1.5 px-1">P</th>
                              <th className="text-center py-1.5 px-1">GF</th>
                              <th className="text-center py-1.5 px-1">GC</th>
                              <th className="text-center py-1.5 px-1">DG</th>
                              <th className="text-right py-1.5 px-1 font-display">PTS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {officialStandings.map((s, i) => {
                              const passes = i < 2;
                              const passes3rd = i === 2 && top8ThirdsOfficial.has(s.team);
                              return (
                                <tr key={s.team} className={`border-b border-zinc-800/50 ${
                                  passes ? 'bg-lime-400/5' : passes3rd ? 'bg-yellow-400/5' : ''
                                }`}>
                                  <td className="py-1.5 px-1 font-bold text-zinc-400">{i+1}°</td>
                                  <td className="py-1.5 px-1">
                                    <div className="flex items-center gap-1.5">
                                      <span>{FLAG[s.team]}</span>
                                      <span className="font-medium">{TEAMS_ES[s.team]}</span>
                                      {passes && <Star className="w-3 h-3 text-lime-400 fill-lime-400"/>}
                                      {passes3rd && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400"/>}
                                    </div>
                                  </td>
                                  <td className="text-center py-1.5 px-1 text-zinc-400">{s.played}</td>
                                  <td className="text-center py-1.5 px-1 text-zinc-300">{s.won}</td>
                                  <td className="text-center py-1.5 px-1 text-zinc-300">{s.drawn}</td>
                                  <td className="text-center py-1.5 px-1 text-zinc-300">{s.lost}</td>
                                  <td className="text-center py-1.5 px-1 text-zinc-400">{s.gf}</td>
                                  <td className="text-center py-1.5 px-1 text-zinc-400">{s.ga}</td>
                                  <td className={`text-center py-1.5 px-1 font-medium ${s.gd > 0 ? 'text-lime-400' : s.gd < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                                    {s.gd > 0 ? '+' : ''}{s.gd}
                                  </td>
                                  <td className="text-right py-1.5 px-1 font-display text-lime-400 text-base">{s.points}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        {savedAt ? (
          <div className="bg-lime-500 text-black px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2">
            <Check className="w-4 h-4"/>Guardado
          </div>
        ) : dirty ? (
          <button onClick={save} disabled={saving}
            className="bg-lime-400 text-black px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            Guardar cambios
          </button>
        ) : null}
      </div>
    </div>
  );
}
