CREATE TABLE public.article_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(old_slug)
);

ALTER TABLE public.article_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read redirects" ON public.article_redirects
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage redirects" ON public.article_redirects
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert redirects" ON public.article_redirects
  FOR INSERT TO public WITH CHECK (true);