-- Enum para categorias de notícias
CREATE TYPE public.news_category AS ENUM (
  'politica',
  'economia',
  'tecnologia',
  'esportes',
  'entretenimento',
  'saude',
  'ciencia',
  'mundo',
  'brasil',
  'cultura'
);

-- Tabela de fontes de notícias cadastradas
CREATE TABLE public.news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_foreign BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de artigos/notícias
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.news_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  original_url TEXT NOT NULL,
  category news_category NOT NULL DEFAULT 'brasil',
  views_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_translated BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance e SEO
CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_category ON public.articles(category);
CREATE INDEX idx_articles_published_at ON public.articles(published_at DESC);
CREATE INDEX idx_articles_views ON public.articles(views_count DESC);
CREATE INDEX idx_articles_featured ON public.articles(is_featured) WHERE is_featured = true;

-- Tabela de tags para linkagem interna
CREATE TABLE public.article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_article_tags_tag ON public.article_tags(tag);

-- Enable RLS
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;

-- Policies para leitura pública (SEO)
CREATE POLICY "Anyone can view active sources" ON public.news_sources
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view articles" ON public.articles
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view tags" ON public.article_tags
  FOR SELECT USING (true);

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_news_sources_updated_at
  BEFORE UPDATE ON public.news_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function para gerar slug
CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Function para incrementar views
CREATE OR REPLACE FUNCTION public.increment_article_views(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.articles SET views_count = views_count + 1 WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;