-- Create guides table for editorial evergreen content
CREATE TABLE public.guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'geral',
  steps JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT false,
  author_name TEXT DEFAULT 'Equipe DESIGNE',
  views_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

-- Anyone can read published guides
CREATE POLICY "Anyone can read published guides"
ON public.guides FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage guides"
ON public.guides FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));