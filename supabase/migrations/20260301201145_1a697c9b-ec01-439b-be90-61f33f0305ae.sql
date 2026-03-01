
-- Fix site_settings RLS: drop restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Only admins can manage settings" ON public.site_settings;
DROP POLICY IF EXISTS "Only admins can read settings" ON public.site_settings;

-- Create PERMISSIVE policies for admin access
CREATE POLICY "Admins can read settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings"
  ON public.site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete settings"
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow service role (edge functions) to read settings
CREATE POLICY "Service can read settings"
  ON public.site_settings
  FOR SELECT
  TO service_role
  USING (true);
