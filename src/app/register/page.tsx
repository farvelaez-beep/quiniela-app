'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Loader2, CheckCircle, FileText } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '+1',   flag: '🇺🇸', name: 'EE.UU./Canadá' },
  { code: '+52',  flag: '🇲🇽', name: 'México' },
  { code: '+34',  flag: '🇪🇸', name: 'España' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+51',  flag: '🇵🇪', name: 'Perú' },
  { code: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: '+55',  flag: '🇧🇷', name: 'Brasil' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+44',  flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+33',  flag: '🇫🇷', name: 'Francia' },
  { code: '+49',  flag: '🇩🇪', name: 'Alemania' },
  { code: '+39',  flag: '🇮🇹', name: 'Italia' },
];

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [alias, setAlias] = useState('');
  const [countryCode, setCountryCode] = useState('+57');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);

    const trimmedFullName = fullName.trim();
    if (!trimmedFullName || trimmedFullName.length < 3) {
      setErr('Por favor ingresa tu nombre completo (mínimo 3 caracteres)');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErr('La contraseña debe tener mínimo 6 caracteres');
      setLoading(false);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 6) {
      setErr('Ingresa un número de celular válido');
      setLoading(false);
      return;
    }

    const fullPhone = `${countryCode} ${cleanPhone}`;

    // Si el alias está vacío, derivamos del primer nombre
    const trimmedAlias = alias.trim();
    const finalAlias = trimmedAlias || trimmedFullName.split(' ')[0];

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          full_name: trimmedFullName,
          display_name: finalAlias,
          phone_number: fullPhone,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) { setErr(error.message); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-lime-400 mx-auto mb-4"/>
          <h2 className="font-display text-3xl mb-2">¡Listo!</h2>
          <p className="text-zinc-400 mb-6">
            Te enviamos un email a <strong className="text-white">{email}</strong> para confirmar tu cuenta.
            Una vez confirmado, podrás entrar.
          </p>
          <Link href="/login" className="inline-block bg-lime-400 text-black font-bold px-6 py-2.5 rounded-lg">
            Ir al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-black"></div>
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(239,68,68,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(163,230,53,0.15) 0%, transparent 40%), radial-gradient(circle at 50% 100%, rgba(251,191,36,0.1) 0%, transparent 50%)'
      }}></div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-full px-5 py-2.5 text-xs uppercase tracking-widest text-zinc-300 mb-5">
              <span className="text-3xl leading-none">🇨🇦</span>
              <span className="text-3xl leading-none">🇺🇸</span>
              <span className="text-3xl leading-none">🇲🇽</span>
              <span className="text-zinc-500 mx-1">·</span>
              <span className="font-bold">11 JUN — 19 JUL 2026</span>
            </div>

            <h1 className="font-display text-7xl leading-[0.85] mb-2">
              <span className="block text-white">MUNDIAL</span>
              <span className="block bg-gradient-to-r from-lime-400 via-yellow-300 to-red-500 bg-clip-text text-transparent">2026</span>
            </h1>
            <div className="inline-block bg-lime-400 text-black px-3 py-0.5 font-display text-xl mt-2 -rotate-2 shadow-lg shadow-lime-400/20">QUINIELA</div>
          </div>

          <form onSubmit={submit} className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h2 className="font-display text-3xl">REGISTRARME</h2>

            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Nombre completo</label>
              <input value={fullName} onChange={e=>setFullName(e.target.value)}
                required
                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition"
                placeholder="Ej: Luis Martínez" />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">
                Alias <span className="text-zinc-500 normal-case font-normal">(opcional)</span>
              </label>
              <input value={alias} onChange={e=>setAlias(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition"
                placeholder="Cómo quieres aparecer en la tabla" />
              <div className="text-[11px] text-zinc-500 mt-1">
                Si lo dejas vacío, usaremos tu primer nombre.
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition" />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Celular</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="bg-black border border-zinc-700 rounded-lg px-2 py-3 text-white focus:border-lime-400 focus:outline-none w-32"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code + c.name} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition"
                  placeholder="3001234567"
                />
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">Sin guiones ni espacios. Ej: 3001234567</div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1 block">Contraseña</label>
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition"
                placeholder="Mínimo 6 caracteres" />
            </div>

            {err && <div className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-lime-400 hover:bg-lime-300 text-black font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
              CREAR CUENTA
            </button>

            <div className="text-center text-sm text-zinc-400">
              ¿Ya tienes cuenta? <Link href="/login" className="text-lime-400 font-bold hover:underline">Entra</Link>
            </div>
          </form>

          <Link href="/rules" className="mt-4 flex items-center justify-center gap-2 text-zinc-500 hover:text-lime-400 text-sm transition">
            <FileText className="w-4 h-4" />
            Ver reglas de la quiniela
          </Link>
        </div>
      </div>
    </div>
  );
}
