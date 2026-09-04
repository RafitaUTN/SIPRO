CREATE OR REPLACE FUNCTION public.keepalive()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 1;
$$;

GRANT EXECUTE ON FUNCTION public.keepalive() TO anon;
GRANT EXECUTE ON FUNCTION public.keepalive() TO authenticated;
GRANT EXECUTE ON FUNCTION public.keepalive() TO service_role;;
