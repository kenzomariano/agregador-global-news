
CREATE TABLE public.saved_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);

ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved articles"
  ON public.saved_articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save articles"
  ON public.saved_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave articles"
  ON public.saved_articles FOR DELETE
  USING (auth.uid() = user_id);
