-- Add video_url column to articles table for embedded videos
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create TMDB cache table for storing movie/TV show data
CREATE TABLE public.tmdb_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'person')),
  title TEXT NOT NULL,
  original_title TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  overview TEXT,
  release_date DATE,
  vote_average NUMERIC(3,1),
  popularity NUMERIC(10,3),
  genre_ids INTEGER[],
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tmdb_id, media_type)
);

-- Create TMDB trailers table
CREATE TABLE public.tmdb_trailers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  video_key TEXT NOT NULL,
  video_site TEXT DEFAULT 'YouTube',
  video_name TEXT,
  video_type TEXT,
  is_official BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tmdb_id, media_type, video_key)
);

-- Enable RLS
ALTER TABLE public.tmdb_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmdb_trailers ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Anyone can view TMDB cache" ON public.tmdb_cache FOR SELECT USING (true);
CREATE POLICY "Anyone can view TMDB trailers" ON public.tmdb_trailers FOR SELECT USING (true);

-- Service insert/update policies
CREATE POLICY "Service can insert TMDB cache" ON public.tmdb_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update TMDB cache" ON public.tmdb_cache FOR UPDATE USING (true);
CREATE POLICY "Service can insert TMDB trailers" ON public.tmdb_trailers FOR INSERT WITH CHECK (true);

-- Index for faster trending queries
CREATE INDEX idx_tmdb_cache_trending ON public.tmdb_cache(is_trending, media_type, popularity DESC);
CREATE INDEX idx_tmdb_cache_type ON public.tmdb_cache(media_type);
CREATE INDEX idx_tmdb_trailers_lookup ON public.tmdb_trailers(tmdb_id, media_type);