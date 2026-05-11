-- 1. Revoke unnecessary EXECUTE permissions on SECURITY DEFINER functions
-- Trigger-only functions: do not need to be callable via API
REVOKE ALL ON FUNCTION public.update_article_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- has_role is used only inside RLS policies (definer privileges apply automatically)
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;

-- generate_slug: only admins (authenticated) need to call it; revoke from anon and PUBLIC
REVOKE ALL ON FUNCTION public.generate_slug(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_slug(text) TO authenticated;

-- delete_article_with_tags: add internal admin guard so even if exposed it cannot be misused
CREATE OR REPLACE FUNCTION public.delete_article_with_tags(article_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  DELETE FROM public.article_tags WHERE article_id = article_uuid;
  DELETE FROM public.articles WHERE id = article_uuid;
END;
$function$;
REVOKE ALL ON FUNCTION public.delete_article_with_tags(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_article_with_tags(uuid) TO authenticated;

-- increment_article_views: anyone reading an article triggers it; keep limited to known roles
REVOKE ALL ON FUNCTION public.increment_article_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_article_views(uuid) TO anon, authenticated;

-- 2. Remove redundant permissive INSERT policies that use WITH CHECK (true).
-- service_role bypasses RLS, so these policies are unnecessary and trigger the linter.
DROP POLICY IF EXISTS "Service can insert articles" ON public.articles;
DROP POLICY IF EXISTS "Service can insert tags" ON public.article_tags;
DROP POLICY IF EXISTS "Service can insert redirects" ON public.article_redirects;
DROP POLICY IF EXISTS "Service can insert products" ON public.products;
DROP POLICY IF EXISTS "Service can insert TMDB cache" ON public.tmdb_cache;
DROP POLICY IF EXISTS "Service can update TMDB cache" ON public.tmdb_cache;
DROP POLICY IF EXISTS "Service can insert TMDB trailers" ON public.tmdb_trailers;
DROP POLICY IF EXISTS "Service can read subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Service can read settings" ON public.site_settings;

-- 3. Settings table: add a JSON-friendly key for menu config (handled at the value level)
-- (no schema change needed; using site_settings 'menu_custom_links' key)
