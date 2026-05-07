import Link from 'next/link';
import { ArrowLeft, Trophy, Target, Crown, Calendar, DollarSign, ShieldCheck, Lock, AlertCircle, Award, ListChecks } from 'lucide-react';

export const metadata = {
  title: 'Reglas · Quiniela Mundial 2026',
};

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-lime-400 text-sm mb-8 transition">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="mb-10">
          <div className="inline-flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-full px-5 py-2.5 text-xs uppercase tracking-widest text-zinc-300 mb-5">
            <span className="text-2xl leading-none">🇨🇦</span>
            <span className="text-2xl leading-none">🇺🇸</span>
            <span className="text-2xl leading-none">🇲🇽</span>
            <span className="text-zinc-500 mx-1">·</span>
            <span className="font-bold">11 JUN — 19 JUL 2026</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-5xl text-white leading-none">MUNDIAL</span>
            <span className="font-display text-5xl bg-gradient-to-r from-lime-400 via-yellow-300 to-red-500 bg-clip-text text-transparent leading-none">2026</span>
          </div>
          <div className="inline-block bg-lime-400 text-black px-3 py-0.5 font-display text-xl -rotate-2 shadow-lg shadow-lime-400/20 mb-4">QUINIELA</div>
          <h1 className="font-display text-6xl leading-none mb-2 mt-4">REGLAS</h1>
          <p className="text-zinc-400">Cómo funciona la quiniela del Mundial 2026</p>
        </div>

        {/* SECCIÓN 1: Cómo jugar */}
        <Section icon={<Trophy className="w-5 h-5"/>} title="Cómo jugar">
          <ol className="list-decimal list-inside space-y-2 text-zinc-300">
            <li><strong className="text-white">Regístrate</strong> con tu email, nombre y celular (con código de país). Confirma tu email cuando llegue el correo.</li>
            <li><strong className="text-white">Paga la cuota de entrada</strong> al organizador (por Nequi, Daviplata, transferencia, Zelle o efectivo).</li>
            <li><strong className="text-white">Pronostica los 72 partidos</strong> de fase de grupos y los 32 de eliminatorias.</li>
            <li><strong className="text-white">Elige al goleador del torneo</strong> (Bota de Oro). El campeón se deriva automáticamente de tu bracket.</li>
            <li>El <strong className="text-white">11 de junio</strong> arranca el Mundial. Los pronósticos se cierran automáticamente.</li>
            <li>Tu posición en la <strong className="text-white">Tabla</strong> se actualiza en tiempo real con cada resultado oficial.</li>
          </ol>
        </Section>

        {/* SECCIÓN 2: Sistema de puntos */}
        <Section icon={<Target className="w-5 h-5"/>} title="Sistema de puntos">
          <div className="grid sm:grid-cols-2 gap-3">
            <PointCard pts="3" label="Marcador exacto" desc="Pronosticaste 2-1 y el partido terminó 2-1" />
            <PointCard pts="1" label="Resultado correcto" desc="Pronosticaste 2-1 y el partido terminó 3-0 (acertaste el ganador)" />
            <PointCard pts="0" label="Sin acierto" desc="Pronosticaste 2-1 y el partido terminó 0-2" />
            <PointCard pts="+1" label="Acertar 1° lugar de un grupo" desc="Bonificación adicional por cada grupo donde el equipo que tú dejaste 1° quedó 1° oficial" highlight />
            <PointCard pts="+1" label="Acertar 2° lugar de un grupo" desc="Misma idea para la posición 2 de cada grupo" highlight />
            <PointCard pts="+5" label="Acertar el goleador" desc="El nombre debe coincidir exactamente" highlight />
            <PointCard pts="+5" label="Acertar el campeón" desc="El país que levante la copa el 19 de julio" highlight />
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            La bonificación de posiciones (1°/2°) se aplica una vez se hayan jugado los 6 partidos del grupo. Como hay 12 grupos, hay hasta <strong className="text-zinc-300">24 puntos</strong> en juego solo por posiciones de grupo.
          </p>
        </Section>

        {/* SECCIÓN: Desempate entre jugadores */}
        <Section icon={<ListChecks className="w-5 h-5"/>} title="Reglas de desempate (entre jugadores)">
          <p className="text-zinc-300 mb-4 text-sm">
            Si dos o más jugadores terminan empatados en puntos al final del torneo, los desempates se aplican <strong className="text-white">en este orden</strong>:
          </p>
          <ol className="space-y-2 text-zinc-300 text-sm">
            <li className="flex gap-3">
              <span className="font-display text-2xl text-lime-400 leading-none w-8 flex-shrink-0">1.</span>
              <div><strong className="text-white">Acertar el campeón.</strong> Quien acertó el campeón gana sobre quien no.</div>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-2xl text-lime-400 leading-none w-8 flex-shrink-0">2.</span>
              <div><strong className="text-white">Acertar el goleador.</strong> Si persiste el empate, gana quien acertó el goleador.</div>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-2xl text-lime-400 leading-none w-8 flex-shrink-0">3.</span>
              <div><strong className="text-white">Más marcadores exactos.</strong> Quien tenga más partidos con marcador exacto (3 puntos).</div>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-2xl text-lime-400 leading-none w-8 flex-shrink-0">4.</span>
              <div><strong className="text-white">Más resultados acertados.</strong> Quien tenga más partidos con resultado correcto (1 punto).</div>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-2xl text-lime-400 leading-none w-8 flex-shrink-0">5.</span>
              <div><strong className="text-white">Reparto en partes iguales.</strong> Si todavía hay empate, el premio del puesto se reparte equitativamente entre los jugadores empatados.</div>
            </li>
          </ol>
        </Section>

        {/* SECCIÓN: Desempate dentro de un grupo (FIFA) */}
        <Section icon={<ListChecks className="w-5 h-5"/>} title="Desempate dentro de un grupo (reglamento FIFA)">
          <p className="text-zinc-300 mb-4 text-sm">
            Las tablas de grupos en esta quiniela siguen el reglamento oficial FIFA. Si dos o más selecciones terminan empatadas en puntos, se aplican <strong className="text-white">en este orden</strong>:
          </p>
          <ol className="space-y-2 text-zinc-300 text-sm">
            <li className="flex gap-3">
              <span className="font-display text-2xl text-lime-400 leading-none w-8 flex-shrink-0">1.</span>
              <div><strong className="text-white">Cabeza a cabeza.</strong> Entre los empatados: puntos en sus partidos directos, luego diferencia de goles directa, luego goles a favor directos.</div>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-2xl text-lime-400 leading-none w-8 flex-shrink-0">2.</span>
              <div><strong className="text-white">Tablas globales.</strong> Si sigue el empate: diferencia de goles total y goles a favor totales del grupo.</div>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-2xl text-lime-400 leading-none w-8 flex-shrink-0">3.</span>
              <div>
                <strong className="text-white">Si TODO sigue empatado.</strong> En la realidad FIFA seguiría con fair play (tarjetas), ranking FIFA y sorteo. Como en una quiniela no se predicen tarjetas y el ranking/sorteo no son determinísticos, el sistema te avisa y te pide que <strong className="text-yellow-400">predigas el orden</strong> que crees que pondrá FIFA. El admin hace lo mismo con el resultado oficial cuando se den los resultados reales. Así nadie queda con una tabla determinada por un fallback alfabético.
              </div>
            </li>
          </ol>
          <p className="text-xs text-zinc-500 mt-3">
            El mismo criterio se aplica para elegir los <strong>8 mejores 3ros lugares</strong>, excepto que como vienen de distintos grupos no hay cabeza a cabeza: solo puntos → diferencia de goles → goles a favor.
          </p>
        </Section>

        {/* SECCIÓN 4: Premios */}
        <Section icon={<Award className="w-5 h-5"/>} title="Premios">
          <p className="text-zinc-300 mb-4 text-sm">
            Del total recaudado en cuotas (el <strong className="text-white">pozo</strong>), se reparte así:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <PrizeCard rank="1°" pct="50%" desc="Primer lugar de la tabla" tone="gold" />
            <PrizeCard rank="2°" pct="25%" desc="Segundo lugar de la tabla" tone="silver" />
            <PrizeCard rank="3°" pct="10%" desc="Tercer lugar de la tabla" tone="bronze" />
            <PrizeCard rank="Admin" pct="15%" desc="Operación y administración de la quiniela" tone="zinc" />
          </div>

          <div className="bg-zinc-900 border border-lime-400/30 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wider text-lime-400 font-bold mb-3">Ejemplo de reparto</div>
            <p className="text-sm text-zinc-300 mb-3">
              50 jugadores pagan <strong className="text-white">$15 USD</strong> cada uno. Pozo total: <strong className="text-lime-400">$750 USD</strong>.
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between border-b border-zinc-800 pb-1.5"><span className="text-yellow-400">🥇 1° lugar (50%)</span> <strong className="text-white">$375 USD</strong></div>
              <div className="flex justify-between border-b border-zinc-800 pb-1.5"><span className="text-zinc-300">🥈 2° lugar (25%)</span> <strong className="text-white">$187.50 USD</strong></div>
              <div className="flex justify-between border-b border-zinc-800 pb-1.5"><span className="text-orange-400">🥉 3° lugar (10%)</span> <strong className="text-white">$75 USD</strong></div>
              <div className="flex justify-between"><span className="text-zinc-500">Administración (15%)</span> <strong className="text-zinc-400">$112.50 USD</strong></div>
            </div>
          </div>

          <p className="text-xs text-zinc-500 mt-3">
            Los pagos se realizan al día siguiente de la final (20 de julio de 2026). El admin coordina con cada ganador el método de pago (Nequi, Zelle, transferencia, etc.) en la moneda local del jugador.
          </p>
        </Section>

        {/* SECCIÓN 5: Fechas clave */}
        <Section icon={<Calendar className="w-5 h-5"/>} title="Fechas importantes">
          <ul className="space-y-2 text-zinc-300">
            <li><span className="text-zinc-500">Cierre de pronósticos:</span> <strong className="text-white">10 de junio de 2026</strong> (un día antes del primer partido)</li>
            <li><span className="text-zinc-500">Inauguración:</span> <strong className="text-white">11 de junio de 2026</strong> en Ciudad de México</li>
            <li><span className="text-zinc-500">Final:</span> <strong className="text-white">19 de julio de 2026</strong> en MetLife Stadium (Nueva Jersey)</li>
            <li><span className="text-zinc-500">Anuncio de ganadores:</span> <strong className="text-white">20 de julio de 2026</strong></li>
          </ul>
        </Section>

        {/* SECCIÓN 6: Reglas justas */}
        <Section icon={<ShieldCheck className="w-5 h-5"/>} title="Reglas justas">
          <ul className="space-y-2 text-zinc-300 text-sm">
            <li className="flex gap-2"><span className="text-lime-400">✓</span> Solo cuentan en la tabla los jugadores que pagaron la cuota antes del cierre.</li>
            <li className="flex gap-2"><span className="text-lime-400">✓</span> Una persona = una cuenta. No se permiten cuentas múltiples por usuario.</li>
            <li className="flex gap-2"><span className="text-lime-400">✓</span> Los pronósticos se pueden cambiar libremente hasta el cierre. Después no.</li>
            <li className="flex gap-2"><span className="text-lime-400">✓</span> El admin (organizador) carga los resultados oficiales según FIFA. Si hay un error, repórtalo.</li>
            <li className="flex gap-2"><span className="text-lime-400">✓</span> Para el goleador: si dos jugadores empatan en goles oficiales (Bota de Oro), gana quien dio más asistencias (regla FIFA).</li>
          </ul>
        </Section>

        {/* SECCIÓN 7: Privacidad */}
        <Section icon={<Lock className="w-5 h-5"/>} title="Privacidad">
          <p className="text-zinc-300 text-sm">
            Tu email y celular se usan solo para confirmar tu cuenta y notificarte sobre la quiniela (recordatorios, ganadores, pago). No se comparten con terceros. Los demás jugadores solo ven tu nombre en la tabla, no tu correo ni tu teléfono.
          </p>
        </Section>

        <div className="mt-10 p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"/>
            <div className="text-xs text-zinc-400">
              <p className="text-yellow-400 font-bold mb-1">Aviso</p>
              <p>Esta quiniela es un juego entre amigos/colaboradores con fines de entretenimiento. No es una operación de juegos de azar regulada. La participación es voluntaria y los premios se entregan en efectivo o transferencia entre los participantes.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/register" className="bg-lime-400 hover:bg-lime-300 text-black font-bold px-6 py-3 rounded-lg transition">
            Crear mi cuenta y jugar
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-lime-400 text-black p-2 rounded-lg">{icon}</div>
        <h2 className="font-display text-3xl">{title}</h2>
      </div>
      <div className="pl-1">{children}</div>
    </section>
  );
}

function PointCard({ pts, label, desc, highlight }: { pts: string; label: string; desc: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-4 border ${highlight ? 'border-lime-400/40 bg-lime-400/5' : 'border-zinc-800 bg-zinc-900'}`}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`font-display text-3xl leading-none ${highlight ? 'text-lime-400' : 'text-white'}`}>{pts}</span>
        <span className="text-xs uppercase tracking-wider text-zinc-500">pts</span>
      </div>
      <div className="font-bold text-sm mb-1">{label}</div>
      <div className="text-xs text-zinc-400">{desc}</div>
    </div>
  );
}

function PrizeCard({ rank, pct, desc, tone }: { rank: string; pct: string; desc: string; tone: 'gold'|'silver'|'bronze'|'zinc' }) {
  const colors = {
    gold:   'border-yellow-400/50 bg-yellow-400/10 text-yellow-400',
    silver: 'border-zinc-300/30 bg-zinc-300/5 text-zinc-200',
    bronze: 'border-orange-500/40 bg-orange-500/5 text-orange-400',
    zinc:   'border-zinc-700 bg-zinc-900 text-zinc-400',
  }[tone];
  return (
    <div className={`rounded-lg p-4 border ${colors}`}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display text-3xl leading-none">{rank}</span>
        <span className="font-display text-2xl text-white">{pct}</span>
      </div>
      <div className="text-xs text-zinc-400 mt-1">{desc}</div>
    </div>
  );
}
