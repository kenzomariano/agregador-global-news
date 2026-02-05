-- Table for site settings
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Only admins can read settings" 
ON public.site_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can manage settings" 
ON public.site_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Table for ad placements
CREATE TABLE public.ad_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  position TEXT NOT NULL, -- 'sidebar', 'header', 'article-inline', 'footer', 'between-sections'
  ad_type TEXT NOT NULL DEFAULT 'adsense', -- 'adsense', 'banner'
  banner_url TEXT,
  banner_link TEXT,
  banner_image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;

-- Public can read active ads
CREATE POLICY "Anyone can read active ads" 
ON public.ad_placements 
FOR SELECT 
USING (is_active = true);

-- Only admins can manage ads
CREATE POLICY "Only admins can manage ads" 
ON public.ad_placements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('site_title', 'DESIGNE Notícias'),
  ('site_description', 'Seu portal de notícias agregadas. As informações mais importantes do Brasil e do mundo em um só lugar.'),
  ('meta_keywords', 'notícias, brasil, política, economia, tecnologia, esportes'),
  ('adsense_publisher_id', ''),
  ('primary_categories', 'politica,economia,tecnologia,esportes,entretenimento'),
  ('secondary_categories', 'saude,ciencia,mundo,brasil,cultura');

-- Trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_placements_updated_at
BEFORE UPDATE ON public.ad_placements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();