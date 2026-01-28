-- Corrigir search_path para as funções
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        unaccent(title),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  ) || '-' || substr(gen_random_uuid()::text, 1, 8);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_article_views(article_id UUID)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.articles SET views_count = views_count + 1 WHERE id = article_id;
END;
$$;