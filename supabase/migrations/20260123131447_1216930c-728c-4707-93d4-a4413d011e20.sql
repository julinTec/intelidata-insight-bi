-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Criar tabela de roles
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Habilitar RLS na tabela de roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Criar função security definer para verificar role (evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- 5. Função auxiliar para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- 6. Política: usuários podem ver suas próprias roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 7. Política: admins podem gerenciar todas as roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin());

-- 8. Trigger para atribuir role 'user' a novos cadastros
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 9. Atualizar políticas RLS - PROJECTS
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view own or admin sees all"
ON public.projects FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- 10. Atualizar políticas RLS - DATA_SOURCES
DROP POLICY IF EXISTS "Users can view their own data sources" ON public.data_sources;
CREATE POLICY "Users can view own or admin sees all"
ON public.data_sources FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- 11. Atualizar políticas RLS - ANALYSES
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.analyses;
CREATE POLICY "Users can view own or admin sees all"
ON public.analyses FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- 12. Atualizar políticas RLS - DASHBOARD_WIDGETS
DROP POLICY IF EXISTS "Users can view their own widgets" ON public.dashboard_widgets;
CREATE POLICY "Users can view own or admin sees all"
ON public.dashboard_widgets FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- 13. Atualizar políticas RLS - SHARED_DASHBOARDS
DROP POLICY IF EXISTS "Users can view their own shared dashboards" ON public.shared_dashboards;
CREATE POLICY "Users can view own or admin sees all"
ON public.shared_dashboards FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- 14. Atualizar políticas RLS - PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view own or admin sees all"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());