# Stacking PIL — Gmail Workspace + Supabase de Embarques

No uses un proyecto Supabase nuevo ni un Apps Script aparte.
El correo llega a `rodrigo.caceres@asli.cl` (Google Workspace) y el PDF se guarda en el **mismo** Supabase de Embarques.

## 1. Google Admin: permitir lectura de Gmail

Hoy la cuenta de servicio de Embarques solo puede **enviar** (`gmail.send`). Para leer el correo de Rodrigo hay que agregar un scope.

1. Entra a [Google Admin](https://admin.google.com) con una cuenta admin de `asli.cl`.
2. **Seguridad → Control de acceso y datos → Controles de API → Delegación de todo el dominio**.
3. Abre la cuenta de servicio que ya usa Embarques para enviar correos (la de `GOOGLE_SERVICE_ACCOUNT`).
4. En los scopes, deja los actuales y **agrega**:

```
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.settings.basic
https://www.googleapis.com/auth/gmail.readonly
```

5. Guarda.

Sin `gmail.readonly` la sincronización falla con “Google Workspace no autorizó lectura de Gmail”.

## 2. Deploy de la Edge Function (repo ERP)

En `ERP/`:

```bash
npx supabase functions deploy stacking-pil-sync --project-ref yerufjewdvzijfzdpaai
```

Opcional, en Supabase → Edge Functions → Secrets:

- `STACKING_SYNC_TOKEN` — token extra
- `STACKING_PIL_MAILBOX` — por defecto `rodrigo.caceres@asli.cl`

`GOOGLE_SERVICE_ACCOUNT` ya está configurado (el mismo de `send-email`).

## 3. Bucket

La función crea el bucket `stacking-navieras` si no existe.
También está la migración:

`ERP/supabase/migrations/20260903000001_storage_stacking_navieras.sql`

## 4. Variables en WEB (mismas de Embarques)

En `WEB/.env.local` (y en Vercel del sitio público):

```
PUBLIC_SUPABASE_URL=https://yerufjewdvzijfzdpaai.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<la misma de ERP/.env.local>
SUPABASE_STACKING_BUCKET=stacking-navieras
STACKING_SYNC_TOKEN=<opcional>
```

Reinicia `npm run dev` después de guardar.

## 5. Probar

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/stacking/sync" -Method POST -ContentType "application/json" -Body "{}"
```

Si responde `ok: true`, abre:

http://localhost:3000/stacking/pil

## 6. Automático cada semana (Vercel Cron)

En `vercel.json` quedó un cron diario a las **13:00 UTC** (~09:00–10:00 Chile):

```json
{ "path": "/api/stacking/sync", "schedule": "0 13 * * *" }
```

Es diario a propósito: el correo llega una vez por semana, pero el día puede variar. Así lo captura al día siguiente.

### Qué debes hacer en Vercel (proyecto de la landing WEB)

1. **Settings → Environment Variables** y agrega (mismas de Embarques):
   - `PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STACKING_BUCKET=stacking-navieras`
2. Haz **deploy** (push o redeploy).
3. En **Settings → Cron Jobs** deberías ver `/api/stacking/sync`.

### Manual cuando quieras

```powershell
Invoke-WebRequest -Uri "https://asli.cl/api/stacking/sync" -Method POST -ContentType "application/json" -Body "{}"
```

(Si el dominio de esta app es otro, usa esa URL.)