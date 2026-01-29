-- Adicionar políticas de INSERT para news_sources (público pode adicionar)
CREATE POLICY "Anyone can insert sources" ON public.news_sources
  FOR INSERT WITH CHECK (true);

-- Adicionar políticas de DELETE para news_sources
CREATE POLICY "Anyone can delete sources" ON public.news_sources
  FOR DELETE USING (true);

-- Adicionar políticas de INSERT para articles (usado pelo edge function)
CREATE POLICY "Service can insert articles" ON public.articles
  FOR INSERT WITH CHECK (true);

-- Adicionar políticas de INSERT para tags
CREATE POLICY "Service can insert tags" ON public.article_tags
  FOR INSERT WITH CHECK (true);

-- Adicionar políticas de UPDATE para articles (para incrementar views)
CREATE POLICY "Anyone can update article views" ON public.articles
  FOR UPDATE USING (true);