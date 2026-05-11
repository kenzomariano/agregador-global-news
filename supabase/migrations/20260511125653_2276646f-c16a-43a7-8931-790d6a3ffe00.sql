DROP POLICY IF EXISTS "Anyone can read public settings" ON public.site_settings;
CREATE POLICY "Anyone can read public settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key = ANY (ARRAY[
  'site_title',
  'site_description',
  'daily_summary',
  'primary_categories',
  'secondary_categories',
  'menu_config'
]));