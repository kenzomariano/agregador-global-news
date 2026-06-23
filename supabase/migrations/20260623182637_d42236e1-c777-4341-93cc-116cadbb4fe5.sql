
-- 1) Hide user_id columns from anonymous readers on article_likes and article_comments
REVOKE SELECT ON public.article_likes FROM anon;
GRANT SELECT (id, article_id, created_at) ON public.article_likes TO anon;

REVOKE SELECT ON public.article_comments FROM anon;
GRANT SELECT (id, article_id, content, created_at, updated_at) ON public.article_comments TO anon;

-- 2) Lock down SECURITY DEFINER functions that should not be publicly executable.
-- Trigger functions: never need direct EXECUTE.
REVOKE EXECUTE ON FUNCTION public.update_article_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Cron-only function: only the postgres role / cron should call it.
REVOKE EXECUTE ON FUNCTION public.publish_scheduled_items() FROM PUBLIC, anon, authenticated;

-- Admin-only RPC: anon must not be able to attempt it.
REVOKE EXECUTE ON FUNCTION public.delete_article_with_tags(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_article_with_tags(uuid) TO authenticated;

-- has_role and increment_article_views remain executable because they are required
-- by RLS policies and anonymous page views respectively.
