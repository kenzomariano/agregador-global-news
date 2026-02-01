-- Create source type enum
CREATE TYPE source_type AS ENUM ('article', 'product');

-- Add source type and sitemap URL to news_sources
ALTER TABLE public.news_sources 
ADD COLUMN IF NOT EXISTS source_type source_type NOT NULL DEFAULT 'article',
ADD COLUMN IF NOT EXISTS sitemap_url TEXT;

-- Create products table for scraped products
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.news_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  image_url TEXT,
  original_url TEXT NOT NULL UNIQUE,
  category TEXT,
  is_available BOOLEAN DEFAULT true,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS policies for products
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Service can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update products" 
ON public.products 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete products" 
ON public.products 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_products_source_id ON public.products(source_id);
CREATE INDEX idx_products_original_url ON public.products(original_url);

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();