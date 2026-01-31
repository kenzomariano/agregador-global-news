-- Create app_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function for checking user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles - only admins can view all roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update articles RLS to allow admins to delete and fully update
DROP POLICY IF EXISTS "Admins can delete articles" ON public.articles;
CREATE POLICY "Admins can delete articles"
ON public.articles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update articles" ON public.articles;
CREATE POLICY "Admins can update articles"
ON public.articles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Update news_sources RLS to allow admins to update
DROP POLICY IF EXISTS "Admins can update sources" ON public.news_sources;
CREATE POLICY "Admins can update sources"
ON public.news_sources
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));