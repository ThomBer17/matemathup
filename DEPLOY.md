# Deploy de MatemathUp

Esta app está armada para correr en **Cloudflare Pages** (gracias a `@cloudflare/vite-plugin` y `wrangler.jsonc` que vienen incluidos). Vercel también funciona pero el wrangler está pre-configurado para CF.

## Pre-requisitos

- Cuenta en **Cloudflare** (gratis): https://dash.cloudflare.com/sign-up
- Tu proyecto Supabase ya creado y migrado (ver `supabase/migrations/`)
- Tu cuenta OpenRouter con saldo o usando modelos `:free`
- Wrangler CLI: `npm install -g wrangler`

## Variables de entorno (productivas)

En Cloudflare Pages → tu proyecto → Settings → Environment variables, agregá estas para el environment **Production**:

| Variable | Valor | Visibilidad |
|---|---|---|
| `VITE_SUPABASE_URL` | URL de tu Supabase prod | Plaintext |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key (es safe que sea pública) | Plaintext |
| `VITE_SUPABASE_PROJECT_ID` | El project ID | Plaintext |
| `SUPABASE_URL` | Igual que VITE_SUPABASE_URL | Plaintext |
| `SUPABASE_PUBLISHABLE_KEY` | Igual que VITE_... | Plaintext |
| `AI_API_KEY` | Tu key OpenRouter | **Encrypted** ← importante |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1/chat/completions` | Plaintext |
| `AI_MODEL` | `openai/gpt-oss-120b:free` o el que prefieras | Plaintext |

Las `VITE_*` se embeben en el bundle del cliente al build. Las otras solo se leen server-side. **`AI_API_KEY` siempre como Encrypted** — si alguien clona tu CF dashboard la ve si está en Plaintext.

## Setup inicial

```sh
# 1. Login en Cloudflare
wrangler login

# 2. Renombrar el proyecto (opcional, está como "tanstack-start-app" por default)
# Editá wrangler.jsonc → "name": "matemathup"

# 3. Build local para verificar que compila
npm run build

# 4. Deploy
wrangler pages deploy
```

La primera vez te pregunta por el nombre del proyecto CF Pages. Después se guarda y los siguientes deploys son `wrangler pages deploy` y listo.

## Setup con Git (recomendado)

Más cómodo que `wrangler pages deploy` manual:

1. Pushea el repo a GitHub
2. En Cloudflare Pages → Create project → Connect to Git
3. Elegí el repo
4. Build settings:
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: (vacío)
5. Pegá las env vars de la tabla de arriba
6. Save and Deploy

Cada push a `main` dispara un deploy automático.

## Checklist post-deploy

- [ ] La página carga sin errores en `https://<tu-proyecto>.pages.dev`
- [ ] El signup crea usuarios en tu Supabase (verificá en SQL Editor: `SELECT * FROM auth.users`)
- [ ] El trigger `on_auth_user_created` está activo (sino, ver fix en sección abajo)
- [ ] Generar un ejercicio en algún tema funciona (mirá la pestaña Network del DevTools para confirmar que las server functions devuelven 200)
- [ ] El progreso se guarda (`/progress` muestra tus intentos)
- [ ] La calculadora aparece bottom-right en topics
- [ ] CSRF middleware está activo (no warnings en logs de Cloudflare)

## Costos esperados (escala mínima)

- **Cloudflare Pages**: gratis. Plan free: 500 builds/mes, requests ilimitadas
- **Supabase**: gratis. Plan free: 500MB DB, 50k MAU, 5GB egress
- **OpenRouter**: free models gratis con rate limits compartidos. Si quemás `:free`, swap a uno pago en `AI_MODEL` env var sin redeploy (Cloudflare Pages permite cambiar env vars en caliente, reinicia la edge automáticamente)

Para audiencia chica (≤50 alumnos activos) los tres tiers free alcanzan tranquilo.

## Si el trigger de signup no se ejecuta

A veces Supabase no permite crear triggers en `auth.users` desde el SQL Editor en planes restringidos. Si en producción signup no crea perfil + rol, corré esto en SQL Editor (también está documentado en la conversación inicial):

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6)
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Si vas a tener tráfico real

Cosas a considerar antes de escalar:

1. **Rate limiting** server-side por user en las server fns IA. Hoy solo hay el cache de 2 min en `generateActivities`. Para evitar abuso, sumar un limitador (ej. 30 calls / 60s / user). Issue conocido.
2. **Sentry o similar** para captura de errores en producción. Hoy solo console.log en CF Workers.
3. **Backups de Supabase** — el plan free no incluye PITR. Si vas a tener data de usuarios real considerá upgrade.
4. **Custom domain** — Cloudflare Pages te lo permite gratis en Settings → Custom domains.

## Troubleshooting

- **"Module not found" en build**: borrá `node_modules` y `package-lock.json`, `npm install`, retry build.
- **`AI_API_KEY` is undefined**: revisá que la env var esté en environment **Production** (no Preview) en Cloudflare Pages.
- **CSRF errors después de deploy**: clear cookies y vuelve a entrar. El middleware nuevo está activo, los browsers viejos pueden tener tokens stale.
- **Supabase RLS bloquea queries**: verificá que el user esté autenticado. En el navegador: `localStorage` debería tener una key tipo `sb-<project>-auth-token`.
