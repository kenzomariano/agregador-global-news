-- Add a PERMISSIVE SELECT policy so anyone (including anonymous) can read site_settings
CREATE POLICY "Anyone can read public settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);