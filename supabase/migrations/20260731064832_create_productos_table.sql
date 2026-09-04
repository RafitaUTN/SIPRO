CREATE TABLE IF NOT EXISTS public.productos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos_select_all" ON public.productos;
CREATE POLICY "productos_select_all" ON public.productos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "productos_insert_all" ON public.productos;
CREATE POLICY "productos_insert_all" ON public.productos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "productos_update_all" ON public.productos;
CREATE POLICY "productos_update_all" ON public.productos
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "productos_delete_all" ON public.productos;
CREATE POLICY "productos_delete_all" ON public.productos
  FOR DELETE USING (true);

GRANT ALL ON public.productos TO anon;
GRANT ALL ON public.productos TO authenticated;
GRANT ALL ON public.productos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.productos_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.productos_id_seq TO authenticated;;
