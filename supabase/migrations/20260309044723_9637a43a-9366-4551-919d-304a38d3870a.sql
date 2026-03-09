-- Create table for article FAQs
CREATE TABLE public.article_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_article_faqs_article_id ON public.article_faqs(article_id);

-- Enable RLS
ALTER TABLE public.article_faqs ENABLE ROW LEVEL SECURITY;

-- Public read access (FAQs are public content)
CREATE POLICY "FAQs are viewable by everyone"
ON public.article_faqs FOR SELECT
USING (true);

-- Only admins can manage FAQs
CREATE POLICY "Admins can insert FAQs"
ON public.article_faqs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update FAQs"
ON public.article_faqs FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete FAQs"
ON public.article_faqs FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));