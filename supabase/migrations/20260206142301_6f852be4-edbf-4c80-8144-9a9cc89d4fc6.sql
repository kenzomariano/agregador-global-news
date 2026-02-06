
-- Likes table
CREATE TABLE public.article_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(article_id, user_id)
);

ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.article_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.article_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike their own" ON public.article_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments table
CREATE TABLE public.article_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.article_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.article_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.article_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.article_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any comment" ON public.article_comments FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add likes_count to articles for performance
ALTER TABLE public.articles ADD COLUMN likes_count integer NOT NULL DEFAULT 0;

-- Function to sync likes count
CREATE OR REPLACE FUNCTION public.update_article_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE articles SET likes_count = likes_count + 1 WHERE id = NEW.article_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE articles SET likes_count = likes_count - 1 WHERE id = OLD.article_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON public.article_likes
FOR EACH ROW EXECUTE FUNCTION public.update_article_likes_count();
