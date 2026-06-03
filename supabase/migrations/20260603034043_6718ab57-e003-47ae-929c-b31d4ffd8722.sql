-- Add scheduled_at columns
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.guides ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_articles_scheduled_at ON public.articles(scheduled_at) WHERE scheduled_at IS NOT NULL AND status = 'draft';
CREATE INDEX IF NOT EXISTS idx_guides_scheduled_at ON public.guides(scheduled_at) WHERE scheduled_at IS NOT NULL AND is_published = false;

-- Function that publishes due scheduled items
CREATE OR REPLACE FUNCTION public.publish_scheduled_items()
RETURNS TABLE(kind text, id uuid, title text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH pub_articles AS (
    UPDATE public.articles
    SET status = 'published',
        published_at = COALESCE(published_at, now()),
        updated_at = now(),
        scheduled_at = NULL
    WHERE status = 'draft'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
    RETURNING id, title
  ),
  pub_guides AS (
    UPDATE public.guides
    SET is_published = true,
        published_at = COALESCE(published_at, now()),
        updated_at = now(),
        scheduled_at = NULL
    WHERE is_published = false
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
    RETURNING id, title
  )
  SELECT 'article'::text, id, title FROM pub_articles
  UNION ALL
  SELECT 'guide'::text, id, title FROM pub_guides;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_scheduled_items() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_scheduled_items() TO service_role;

-- Ensure pg_cron is enabled and schedule the job
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-items') THEN
    PERFORM cron.unschedule('publish-scheduled-items');
  END IF;
  PERFORM cron.schedule(
    'publish-scheduled-items',
    '* * * * *',
    $cron$ SELECT public.publish_scheduled_items(); $cron$
  );
END $$;