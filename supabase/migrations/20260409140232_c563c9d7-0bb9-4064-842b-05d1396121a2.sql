
CREATE TABLE public.article_tmdb_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tmdb_id integer NOT NULL,
  media_type text NOT NULL,
  title text NOT NULL,
  original_title text,
  poster_path text,
  backdrop_path text,
  overview text,
  release_date date,
  vote_average numeric,
  popularity numeric,
  genre_ids integer[],
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, tmdb_id)
);

ALTER TABLE public.article_tmdb_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view article TMDB mentions"
  ON public.article_tmdb_mentions FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins can manage article TMDB mentions"
  ON public.article_tmdb_mentions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
