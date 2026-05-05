
-- 1. Articles: drop overly permissive UPDATE
DROP POLICY IF EXISTS "Anyone can update article views" ON public.articles;

-- 2. Restrict service insert/update policies to service_role
DROP POLICY IF EXISTS "Service can insert articles" ON public.articles;
CREATE POLICY "Service can insert articles" ON public.articles
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert tags" ON public.article_tags;
CREATE POLICY "Service can insert tags" ON public.article_tags
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert redirects" ON public.article_redirects;
CREATE POLICY "Service can insert redirects" ON public.article_redirects
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert products" ON public.products;
CREATE POLICY "Service can insert products" ON public.products
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert TMDB cache" ON public.tmdb_cache;
CREATE POLICY "Service can insert TMDB cache" ON public.tmdb_cache
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update TMDB cache" ON public.tmdb_cache;
CREATE POLICY "Service can update TMDB cache" ON public.tmdb_cache
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert TMDB trailers" ON public.tmdb_trailers;
CREATE POLICY "Service can insert TMDB trailers" ON public.tmdb_trailers
  FOR INSERT TO service_role WITH CHECK (true);

-- 3. Newsletter subscribers: restrict read to service_role + admins
DROP POLICY IF EXISTS "Service can read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Service can read subscribers" ON public.newsletter_subscribers
  FOR SELECT TO service_role USING (true);
CREATE POLICY "Admins can read subscribers" ON public.newsletter_subscribers
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. site_settings public read: restrict to allow-list of safe keys
DROP POLICY IF EXISTS "Anyone can read public settings" ON public.site_settings;
CREATE POLICY "Anyone can read public settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('site_title', 'site_description', 'daily_summary', 'primary_categories', 'secondary_categories'));

-- 5. news_sources: restrict insert/delete to admins
DROP POLICY IF EXISTS "Authenticated users can insert sources" ON public.news_sources;
CREATE POLICY "Admins can insert sources" ON public.news_sources
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can delete sources" ON public.news_sources;
CREATE POLICY "Admins can delete sources" ON public.news_sources
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
