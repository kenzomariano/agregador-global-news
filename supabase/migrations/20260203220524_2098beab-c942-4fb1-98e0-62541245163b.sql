-- Allow admins to delete tags
CREATE POLICY "Admins can delete tags"
ON public.article_tags
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert tags manually
CREATE POLICY "Admins can insert tags"
ON public.article_tags
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));