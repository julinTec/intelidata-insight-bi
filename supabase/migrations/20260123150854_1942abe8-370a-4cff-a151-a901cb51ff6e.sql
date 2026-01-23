-- Política para permitir acesso público a widgets de dashboards compartilhados
CREATE POLICY "Public can view widgets from shared dashboards"
  ON public.dashboard_widgets
  FOR SELECT
  USING (
    id IN (
      SELECT unnest(widget_ids)
      FROM public.shared_dashboards
      WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Política para permitir acesso público a data sources de widgets compartilhados
CREATE POLICY "Public can view data sources from shared dashboards"
  ON public.data_sources
  FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT dw.data_source_id
      FROM public.dashboard_widgets dw
      WHERE dw.id IN (
        SELECT unnest(widget_ids)
        FROM public.shared_dashboards
        WHERE is_active = true
        AND (expires_at IS NULL OR expires_at > now())
      )
      AND dw.data_source_id IS NOT NULL
    )
  );