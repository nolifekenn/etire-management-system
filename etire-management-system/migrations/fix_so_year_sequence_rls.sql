-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: next_so_number() runs as INVOKER by default, so authenticated users
-- are blocked by RLS on so_year_sequence when generating sale numbers.
-- Solution: recreate the function with SECURITY DEFINER so it always runs
-- with the function owner's privileges (bypassing RLS on so_year_sequence).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.next_so_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER          -- <── runs as the function owner, not the caller
SET search_path = public  -- security best-practice when using SECURITY DEFINER
AS $$
DECLARE
  _year smallint := EXTRACT(YEAR FROM now())::smallint;
  _next integer;
BEGIN
  INSERT INTO public.so_year_sequence (year, number_next) VALUES (_year, 1)
  ON CONFLICT (year) DO NOTHING;

  SELECT number_next INTO _next
  FROM   public.so_year_sequence
  WHERE  year = _year
  FOR UPDATE;

  UPDATE public.so_year_sequence
  SET    number_next = number_next + 1
  WHERE  year = _year;

  RETURN 'SO-' || _year::text || '-' || LPAD(_next::text, 4, '0');
END;
$$;
