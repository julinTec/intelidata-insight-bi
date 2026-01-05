import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardBuilder } from '@/components/ui/DashboardBuilder';
import { DynamicKPI } from '@/components/ui/DynamicKPI';
import { DynamicChart } from '@/components/ui/DynamicChart';
import type { Json } from '@/integrations/supabase/types';
import { 
  Upload, 
  Plus,
  Sparkles,
  FolderKanban,
  FileSpreadsheet,
  PieChart,
  Trash2,
  LayoutDashboard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  category: string;
  status: string;
  created_at: string;
}

interface DashboardWidget {
  id: string;
  widget_type: string;
  title: string;
  config: Json;
  data_source_id: string | null;
  project_id: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    const [projectsRes, widgetsRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
    ]);
    
    if (projectsRes.data) setProjects(projectsRes.data);
    if (widgetsRes.data) setWidgets(widgetsRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteWidget = async (widgetId: string) => {
    const { error } = await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('id', widgetId);

    if (error) {
      toast.error('Erro ao remover widget');
      return;
    }

    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    toast.success('Widget removido');
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';

  const kpiWidgets = widgets.filter((w) => w.widget_type === 'kpi');
  const chartWidgets = widgets.filter((w) => w.widget_type === 'chart');

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Olá, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {widgets.length > 0 
                ? 'Aqui está seu dashboard personalizado com dados reais.'
                : 'Configure seu dashboard adicionando widgets personalizados.'}
            </p>
          </div>
          <div className="flex gap-3">
            <DashboardBuilder onWidgetCreated={fetchData} />
            <Button className="btn-gradient" asChild>
              <Link to="/projects">
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Link>
            </Button>
          </div>
        </div>

        {/* Dynamic KPI Cards */}
        {kpiWidgets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiWidgets.map((widget) => (
              <div key={widget.id} className="relative group">
                <DynamicKPI
                  title={widget.title}
                  dataSourceId={widget.data_source_id!}
                  config={widget.config as Record<string, unknown>}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={() => handleDeleteWidget(widget.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Charts */}
        {chartWidgets.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartWidgets.map((widget) => (
              <div key={widget.id} className="relative group">
                <DynamicChart
                  title={widget.title}
                  dataSourceId={widget.data_source_id!}
                  config={widget.config as { chartType: "bar" | "line" | "area" | "pie"; groupBy?: string; yField?: string; aggregation?: "sum" | "count" | "avg" }}
                  className="chart-container"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={() => handleDeleteWidget(widget.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state for widgets */}
        {widgets.length === 0 && !loading && (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <LayoutDashboard className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Seu Dashboard está vazio</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Adicione widgets personalizados para visualizar seus dados em tempo real. 
                Conecte suas fontes de dados e crie KPIs e gráficos.
              </p>
              <div className="flex gap-3 justify-center">
                <DashboardBuilder onWidgetCreated={fetchData} />
                <Button variant="outline" asChild>
                  <Link to="/analyses">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Usar IA para sugestões
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions & Recent Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="glass-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3" asChild>
                <Link to="/upload">
                  <Upload className="h-4 w-4 text-primary" />
                  Importar dados CSV/Excel
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" asChild>
                <Link to="/connections">
                  <PieChart className="h-4 w-4 text-accent" />
                  Conectar banco de dados
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" asChild>
                <Link to="/templates">
                  <FileSpreadsheet className="h-4 w-4 text-warning" />
                  Usar template financeiro
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" asChild>
                <Link to="/analyses">
                  <Sparkles className="h-4 w-4 text-success" />
                  Gerar análise com IA
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Projetos Recentes</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects">Ver todos</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse text-muted-foreground">Carregando...</div>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum projeto ainda</p>
                  <Button className="mt-4 btn-gradient" asChild>
                    <Link to="/projects">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar primeiro projeto
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FolderKanban className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{project.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{project.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.status === 'active' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {project.status === 'active' ? 'Ativo' : project.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
