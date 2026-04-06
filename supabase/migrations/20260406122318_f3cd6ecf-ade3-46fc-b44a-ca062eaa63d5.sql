
-- Create enum for article status
CREATE TYPE public.article_status AS ENUM ('draft', 'published', 'archived');

-- Add status column (default draft for new articles)
ALTER TABLE public.articles ADD COLUMN status public.article_status NOT NULL DEFAULT 'draft';

-- Set all existing articles as published
UPDATE public.articles SET status = 'published';

-- Add subcategory column
ALTER TABLE public.articles ADD COLUMN subcategory text NULL;

-- Create index for status filtering
CREATE INDEX idx_articles_status ON public.articles (status);

-- Create index for subcategory filtering  
CREATE INDEX idx_articles_subcategory ON public.articles (subcategory);

-- Update the public SELECT policy to only show published articles
DROP POLICY IF EXISTS "Anyone can view articles" ON public.articles;
CREATE POLICY "Anyone can view published articles"
ON public.articles
FOR SELECT
USING (status = 'published' OR has_role(auth.uid(), 'admin'::app_role));
