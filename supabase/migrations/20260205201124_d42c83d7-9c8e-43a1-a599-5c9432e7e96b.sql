-- Add per-source scrape limit (1-10) with default 5
ALTER TABLE public.news_sources
ADD COLUMN IF NOT EXISTS scrape_limit integer NOT NULL DEFAULT 5;

-- Keep values in a sane range
ALTER TABLE public.news_sources
ADD CONSTRAINT news_sources_scrape_limit_range
CHECK (scrape_limit >= 1 AND scrape_limit <= 10);