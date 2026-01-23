-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  default_view_mode TEXT DEFAULT 'executive',
  dark_mode BOOLEAN DEFAULT true,
  export_format TEXT DEFAULT 'xlsx',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();