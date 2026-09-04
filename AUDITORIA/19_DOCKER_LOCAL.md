# Entorno Docker/Supabase local

Se eligió Supabase CLI porque el código usa PostgREST, relaciones embebidas y anon key; PostgreSQL solo no reproduce el contrato.

```powershell
npm install
npx supabase start
npm run test:audit
npm run start:audit
npx supabase stop
```

Puertos: API `127.0.0.1:54321`, PostgreSQL `127.0.0.1:54322`. `.env.audit` está ignorado y el lanzador rechaza hosts no locales. Migraciones/seed viven en `supabase/`.

Servicios no utilizados se desactivaron; Auth queda activo para credenciales locales soportadas. No usar `supabase link`, `db push` ni `--no-backup` durante la auditoría. La configuración equivalente reproducible es Supabase CLI; no se añadió `docker-compose.audit.yml` porque la CLI mantiene las versiones coordinadas de Postgres/PostgREST/gateway.
