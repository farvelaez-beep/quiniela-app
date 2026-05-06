# Quiniela Mundial 2026 ⚽

App web standalone para vender accesos a tu quiniela del Mundial 2026. Stack moderno, gratis hasta ~50K usuarios/mes.

## ⚙️ Stack

- **Next.js 15** (App Router) + TypeScript
- **Supabase** — Postgres + Auth (email/password)
- **Tailwind CSS**
- Deploy en **Vercel** (gratis)

## 📋 Funcionalidades

- Registro y login con email/contraseña + confirmación por email
- 72 partidos de fase de grupos con pronóstico de marcador
- Bonus: goleador + campeón
- Tabla en vivo con cálculo de puntos
- Sistema clásico: 3 pts marcador exacto, 1 pt resultado correcto, +5 goleador, +5 campeón
- Panel admin: cargar resultados oficiales, bloquear pronósticos, marcar pagos, eliminar jugadores
- Mobile-friendly

## 🚀 Despliegue paso a paso

Esto te toma ~1 hora la primera vez. Necesitas: cuenta Gmail, GitHub, Supabase, Vercel.

### 1. Instala las herramientas

- [Node.js 20+](https://nodejs.org) (descargar LTS)
- [Git](https://git-scm.com/downloads)
- Un editor: [VS Code](https://code.visualstudio.com/) recomendado

### 2. Pon el código en GitHub

```bash
cd quiniela-mundial-2026
git init
git add .
git commit -m "Initial commit"
```

Luego en [github.com](https://github.com) crea un repo nuevo (privado), y sigue las instrucciones que te muestra para hacer push.

### 3. Crea el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea cuenta (gratis)
2. **New Project**:
   - Nombre: `quiniela-mundial-2026`
   - Region: **South America (São Paulo)** — la más cercana a Colombia
   - Genera una contraseña fuerte para la base de datos y guárdala
3. Espera ~2 minutos a que se cree

### 4. Corre el schema

1. En tu proyecto de Supabase ve a **SQL Editor**
2. Crea un nuevo query
3. Abre el archivo `supabase/schema.sql` de este proyecto, copia TODO el contenido y pégalo
4. **IMPORTANTE**: antes de ejecutar, edita la línea que dice `current_setting('app.admin_email', ...)` no es estrictamente necesario, pero más adelante harás un UPDATE manual.
5. Click **Run**. Debería decir "Success. No rows returned"

### 5. Habilita la autenticación

En Supabase ve a **Authentication → Providers**:
- **Email**: ya viene habilitado por defecto ✓
- **Confirm email**: déjalo activado (más seguro)

En **Authentication → URL Configuration**:
- **Site URL**: por ahora `http://localhost:3000` (lo cambias después al desplegar)
- **Redirect URLs**: agrega `http://localhost:3000/auth/callback`

### 6. Obtén las API keys

En Supabase ve a **Settings → API**. Necesitas dos valores:
- **Project URL** (algo como `https://xxxxx.supabase.co`)
- **anon public** key (es una cadena larga que empieza con `eyJ...`)

### 7. Configura el proyecto local

Crea un archivo `.env.local` en la raíz (copia `.env.example`):

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_ADMIN_EMAIL=tucorreo@gmail.com
```

### 8. Instala dependencias y prueba localmente

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Deberías ver la pantalla de login.

### 9. Crea tu cuenta de admin

1. Click en "Regístrate", llena tus datos con tu email principal
2. Confirma el email (revisa tu bandeja de entrada — incluso spam)
3. Vuelve a Supabase → **SQL Editor** y corre:

```sql
update public.profiles set is_admin = true where email = 'tucorreo@gmail.com';
```

4. Sal y vuelve a entrar a la app. Ahora deberías ver las pestañas de Admin.

### 10. Deploy a Vercel

1. Ve a [vercel.com](https://vercel.com) y crea cuenta con GitHub
2. **New Project** → importa tu repo de GitHub
3. En **Environment Variables** agrega los mismos 3 valores de `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_EMAIL`
4. **Deploy** — toma 2 minutos

Te dará una URL tipo `https://quiniela-mundial-2026.vercel.app`.

### 11. Configura el dominio en Supabase

Vuelve a Supabase → **Authentication → URL Configuration** y reemplaza `http://localhost:3000` por tu URL de Vercel:

- **Site URL**: `https://quiniela-mundial-2026.vercel.app`
- **Redirect URLs**: agrega `https://quiniela-mundial-2026.vercel.app/auth/callback`

### 12. (Opcional) Dominio propio

Si quieres `quinielamundial.com` o lo que sea, en Vercel → Settings → Domains. Costo: ~$12 USD/año en Namecheap o GoDaddy.

## 💰 Cómo cobrar la entrada

Como elegiste cobro manual:

1. **Antes del Mundial**: comparte el link con tus amigos. Que se registren.
2. Cada uno te paga por **Nequi / Daviplata / Bancolombia / efectivo** (lo que prefieras).
3. En el panel **Admin → Gestión** marcas a quién le aparece "✓ Pagó".
4. Solo los que pagaron deberían poder ganar el premio (el sistema NO los bloquea automáticamente, es honor system y tu criterio).
5. **Cuando arranque el Mundial** (11 de junio), entra a Admin → click en "Bloquear quiniela". Ya nadie puede cambiar pronósticos.
6. Después de cada partido entras y cargas el resultado. La tabla se actualiza sola.

## 🛡️ Seguridad

- Las contraseñas las maneja Supabase Auth (hash bcrypt, nunca tienes acceso a ellas)
- Las políticas RLS impiden que un usuario edite datos de otro
- Solo el admin puede modificar resultados oficiales y la configuración
- Tu `NEXT_PUBLIC_SUPABASE_ANON_KEY` es pública (de ahí el `PUBLIC_`); la seguridad real la dan las políticas RLS de Supabase

## ⚠️ Limitaciones conocidas

- **No hay knockout stage**: solo predicen fase de grupos + goleador + campeón. Si quieres añadir octavos/cuartos/etc, el schema lo soporta — solo hay que crear más matches y otra UI.
- **Cobro manual**: si quieres pagos automáticos con Wompi/Bold/MercadoPago, hay que integrar esas APIs (proyecto adicional).
- **Tabla calculada en cada request**: con <500 jugadores va sobrado. Si crecieras a miles habría que cachear o usar materialized views.

## 🆘 Problemas comunes

**"No me llega el email de confirmación"**
- Revisa spam. Supabase usa su propio servicio en plan gratuito y a veces va a spam.
- Si quieres mejor entregabilidad, en Supabase → Auth → SMTP Settings, configura tu Gmail/SendGrid/Resend.

**"Hice login pero no veo nada"**
- Confirma que tu profile se haya creado: en Supabase → Table Editor → profiles. Si no está, el trigger falló — corre el schema otra vez.

**"No tengo el botón de admin"**
- Corre el UPDATE de SQL del paso 9.

## 📁 Estructura del proyecto

```
quiniela-mundial-2026/
├── supabase/schema.sql           # Pega esto en Supabase
├── src/
│   ├── app/
│   │   ├── login/                # Login
│   │   ├── register/             # Registro
│   │   ├── auth/callback/        # Confirmación de email
│   │   └── dashboard/
│   │       ├── page.tsx          # Pronósticos de grupos
│   │       ├── bonus/            # Goleador + Campeón
│   │       ├── leaderboard/      # Tabla
│   │       └── admin/            # Resultados + Gestión
│   ├── components/
│   │   └── DashboardHeader.tsx
│   └── lib/
│       ├── supabase/             # Clientes (browser, server, middleware)
│       ├── tournament-data.ts    # Grupos, equipos, banderas
│       └── scoring.ts            # Cálculo de puntos
├── .env.example
└── package.json
```

## 📜 Licencia

Tuyo. Hazle lo que quieras.

---

**Hecho para el Mundial 2026 🇨🇦🇲🇽🇺🇸 · Que gane el mejor**
