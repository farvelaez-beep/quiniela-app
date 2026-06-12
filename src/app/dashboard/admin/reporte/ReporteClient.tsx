'use client';

import { useRef, useState, type FC } from 'react';
import Link from 'next/link';
import { toPng, toBlob } from 'html-to-image';
import { Download, Copy, ChevronLeft, Loader2, Check } from 'lucide-react';

type RankingItem = {
  id: string;
  name: string;
  fullName: string;
  paid: boolean;
  total: number;
  exact: number;
  outcome: number;
  groupPositions: number;
  knockoutExact: number;
  knockoutOutcome: number;
  scorer: boolean;
  champion: boolean;
};

type Stats = {
  totalPlayers: number;
  paid: number;
  pot: number;
  currency: string;
};

type PartidoDelDia = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  phase: string;
} | null;

export default function ReporteClient({
  ranking, stats, partidoDelDia, teamsEs, flags,
}: {
  ranking: RankingItem[];
  stats: Stats;
  partidoDelDia: PartidoDelDia;
  teamsEs: Record<string, string>;
  flags: Record<string, string>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const today = new Date().toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Bogota',
  }).toUpperCase();

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  // ---------- DOWNLOAD PNG ----------
  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // mejor resolución
        backgroundColor: '#0a0a0a',
      });
      const link = document.createElement('a');
      link.download = `polla-mundial-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generando PNG:', err);
      alert('No se pudo generar la imagen. Intenta de nuevo.');
    } finally {
      setDownloading(false);
    }
  }

  // ---------- COPY TO CLIPBOARD ----------
  async function handleCopy() {
    if (!cardRef.current) return;
    setCopying(true);
    setCopied(false);
    try {
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
      });
      if (!blob) throw new Error('Blob no generado');
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
      alert('No se pudo copiar. Tu navegador puede no soportar copiar imágenes — usa "Descargar PNG" en su lugar.');
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Acciones arriba */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link href="/dashboard/admin" className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm">
          <ChevronLeft className="w-4 h-4"/> Volver al admin
        </Link>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleCopy} disabled={copying || downloading}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase text-sm rounded-lg flex items-center gap-2 disabled:opacity-50 border border-zinc-700">
            {copying ? <Loader2 className="w-4 h-4 animate-spin"/> : copied ? <Check className="w-4 h-4 text-lime-400"/> : <Copy className="w-4 h-4"/>}
            {copied ? '¡Copiado!' : 'Copiar imagen'}
          </button>
          <button onClick={handleDownload} disabled={downloading || copying}
            className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black font-bold uppercase text-sm rounded-lg flex items-center gap-2 disabled:opacity-50">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
            Descargar PNG
          </button>
        </div>
      </div>

      <p className="text-zinc-400 text-sm mb-4">
        Esta es la vista previa. Click en <strong className="text-lime-300">Copiar imagen</strong> para pegarla directo en WhatsApp, o <strong className="text-lime-300">Descargar PNG</strong> para guardarla.
      </p>

      {/* Card visual */}
      <div className="overflow-x-auto">
      <div
        ref={cardRef}
        style={{
          width: 680,
          background: '#0a0a0a',
          padding: '40px 40px 32px 40px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
          borderTop: '4px solid #a3e635',
        }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#a3e635', fontWeight: 700, letterSpacing: 4 }}>POLLA MUNDIAL</div>
          <div style={{ fontSize: 64, color: '#ffffff', fontWeight: 900, lineHeight: 1, marginTop: 4, letterSpacing: -1 }}>2026</div>
          <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500, letterSpacing: 2, marginTop: 10 }}>{today}</div>
          <div style={{ fontSize: 22, marginTop: 12 }}>🇨🇦 &nbsp; 🇺🇸 &nbsp; 🇲🇽</div>
        </div>

        {/* TITLE BAR */}
        <div style={{ background: '#fbbf24', padding: '18px 0', borderRadius: 6, textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0a0a0a', letterSpacing: 2 }}>TABLA DE POSICIONES</div>
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatBox value={stats.totalPlayers.toString()} label="JUGADORES"/>
          <StatBox value={stats.pot.toString()} label={`POZO ${stats.currency}`}/>
          <StatBox value={`${stats.paid}/${stats.totalPlayers}`} label="PAGARON"/>
        </div>

        {/* TOP 3 */}
        {top3.length > 0 && (
          <>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#a1a1aa', fontWeight: 700, letterSpacing: 3, marginBottom: 12 }}>— TOP 3 —</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
              {top3.map((p, i) => (
                <PodiumCard
                  key={p.id}
                  position={i + 1}
                  name={p.name}
                  fullName={p.fullName}
                  points={p.total}
                />
              ))}
            </div>
          </>
        )}

        {/* RESTO */}
        {rest.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>RESTO DE LA TABLA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 22 }}>
              {rest.map((p, i) => {
                const pos = i + 4;
                const ptsColor = p.total === 0 ? '#71717a' : p.total > 0 && p.total < 3 ? '#d4d4d8' : '#a3e635';
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: i % 2 === 0 ? '#18181b' : '#0f0f0f',
                    padding: '8px 14px', borderRadius: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 13, color: '#71717a', fontWeight: 900, width: 22, textAlign: 'center' }}>{pos}</div>
                      <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 700 }}>{p.name}</div>
                    </div>
                    <div style={{ fontSize: 14, color: ptsColor, fontWeight: 900 }}>
                      {p.total} {p.total === 1 ? 'pt' : 'pts'}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* PARTIDO DEL DÍA */}
        {partidoDelDia && (
          <div style={{
            background: '#18181b',
            border: '1px solid #a3e635',
            borderRadius: 8,
            padding: '14px 18px',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 10, color: '#a3e635', fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>RESULTADO RECIENTE</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 16, color: '#ffffff', fontWeight: 900 }}>
                {partidoDelDia.away ? (
                  <>
                    {flags[partidoDelDia.home]} {teamsEs[partidoDelDia.home] || partidoDelDia.home} {' '}
                    <span style={{ color: '#a3e635' }}>{partidoDelDia.homeScore} - {partidoDelDia.awayScore}</span> {' '}
                    {teamsEs[partidoDelDia.away] || partidoDelDia.away} {flags[partidoDelDia.away]}
                  </>
                ) : (
                  <>
                    {partidoDelDia.phase}: <span style={{ color: '#a3e635' }}>{partidoDelDia.homeScore} - {partidoDelDia.awayScore}</span>
                  </>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#a1a1aa', whiteSpace: 'nowrap' }}>{partidoDelDia.phase}</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#71717a', marginTop: 8 }}>
          quiniela-app-wine.vercel.app
        </div>
      </div>
      </div>

      <p className="text-zinc-500 text-xs mt-4 text-center">
        💡 Tip: en el celular, "Descargar PNG" guarda la imagen en tus Descargas.
        En la computadora, "Copiar imagen" la deja lista para pegar (Cmd+V) directo en WhatsApp Web.
      </p>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS (todos inline-styled para html-to-image)
// =============================================================================

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      background: '#18181b', border: '1px solid #27272a', borderRadius: 8,
      padding: '14px 8px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#a3e635', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#a1a1aa', letterSpacing: 2, marginTop: 8 }}>{label}</div>
    </div>
  );
}

type PodiumCardProps = { position: number; name: string; fullName: string; points: number };

const PodiumCard: FC<PodiumCardProps> = (props) => {
  const { position, name, fullName, points } = props;
  const colors: Record<number, { border: string; bg: string }> = {
    1: { border: '#fbbf24', bg: '#fbbf24' },
    2: { border: '#a1a1aa', bg: '#d4d4d8' },
    3: { border: '#ea580c', bg: '#f97316' },
  };
  const c = colors[position];
  return (
    <div style={{
      background: '#18181b',
      border: `2px solid ${c.border}`,
      borderRadius: 10,
      padding: '14px 8px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', background: c.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 10px', fontSize: 18, fontWeight: 900, color: '#0a0a0a',
      }}>
        {position}°
      </div>
      <div style={{ fontSize: 17, fontWeight: 900, color: '#ffffff', marginBottom: 2 }}>
        {name.length > 14 ? name.slice(0, 14) + '…' : name}
      </div>
      {fullName && fullName !== name && (
        <div style={{ fontSize: 10, color: '#a1a1aa', marginBottom: 6 }}>
          {fullName.length > 22 ? fullName.slice(0, 22) + '…' : fullName}
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 900, color: '#a3e635', marginTop: 4 }}>
        {points} {points === 1 ? 'PT' : 'PTS'}
      </div>
    </div>
  );
};
