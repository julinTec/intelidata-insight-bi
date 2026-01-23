-- Create shared_dashboards table for public sharing
CREATE TABLE public.shared_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  share_token text UNIQUE NOT NULL,
  title text NOT NULL,
  widget_ids uuid[] NOT NULL DEFAULT '{}',
  filter_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_dashboards ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "Users can view their own shared dashboards"
ON public.shared_dashboards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shared dashboards"
ON public.shared_dashboards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared dashboards"
ON public.shared_dashboards FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared dashboards"
ON public.shared_dashboards FOR DELETE
USING (auth.uid() = user_id);

-- Public access policy (anyone can view active dashboards by token)
CREATE POLICY "Anyone can view active shared dashboards by token"
ON public.shared_dashboards FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Add trigger for updated_at
CREATE TRIGGER update_shared_dashboards_updated_at
BEFORE UPDATE ON public.shared_dashboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();