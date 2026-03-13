import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { DynamicKPI } from "@/components/ui/DynamicKPI";
import { DynamicChart } from "@/components/ui/DynamicChart";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { DynamicFilter } from "@/components/ui/DynamicFilter";
import { DashboardBuilder } from "@/components/ui/DashboardBuilder";
import { DashboardFilters } from "@/components/ui/DashboardFilters";
import { ShareDashboard } from "@/components/ui/ShareDashboard";
import { ExportButton } from "@/components/ui/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDataSource } from "@/hooks/useDataSource";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  LayoutDashboard,
  Trash2,
  BarChart3,
  Upload,
  Share2,
  Table as TableIcon,
  ChevronRight,
  Home,
  FolderKanban,
  Filter,
  Pencil,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Project {
  id: string;
  name: string;
}

interface DashboardWidget {
  id: string;
  widget_type: string;
  title: string;
  config: Json;
  data_source_id: string | null;
}

interface DataSource {
  id: string;
  name: string;
  schema_info: Json | null;
}

export default function ProjectDashboard() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchData } = useDataSource();

  const [project, setProject] = useState<Project | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [allData, setAllData] = useState<Record<string, unknown>[]>([]);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editConfig, setEditConfig] = useState<Record<string, unknown>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user || !projectId) return;

    try {
      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (projectError || !projectData) {
        toast.error("Projeto não encontrado");
        navigate("/projects");
        return;
      }

      setProject(projectData);

      // Load widgets for this project
      const { data: widgetsData } = await supabase
        .from("dashboard_widgets")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      setWidgets((widgetsData as DashboardWidget[]) || []);

      // Load data sources for filters
      const { data: sourcesData } = await supabase
        .from("data_sources")
        .select("id, name, schema_info")
        .eq("project_id", projectId);

      setDataSources((sourcesData as DataSource[]) || []);

      // Load sample data for filters
      if (sourcesData && sourcesData.length > 0) {
        try {
          const data = await fetchData(sourcesData[0].id);
          setAllData(data);
        } catch (e) {
          console.error("Error loading data for filters:", e);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }, [user, projectId, navigate, fetchData]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleDeleteWidget = async (widgetId: string) => {
    try {
      const { error } = await supabase.from("dashboard_widgets").delete().eq("id", widgetId);
      if (error) throw error;

      setWidgets(widgets.filter((w) => w.id !== widgetId));
      toast.success("Widget removido!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover widget");
    }
  };

  // Separate widgets by type
  const filterWidgets = widgets.filter((w) => w.widget_type === "filter");
  const kpiWidgets = widgets.filter((w) => w.widget_type === "kpi");
  const chartWidgets = widgets.filter((w) => w.widget_type === "chart");
  const tableWidgets = widgets.filter((w) => w.widget_type === "table");

  // Get schema from first data source
  const schemaInfo = dataSources[0]?.schema_info as { columns?: Array<{ name: string; type: string }> } | null;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p>Projeto não encontrado</p>
          <Button onClick={() => navigate("/projects")} className="mt-4">
            Voltar para Projetos
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="h-4 w-4" />
            <span>Início</span>
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/projects" className="hover:text-foreground transition-colors flex items-center gap-1">
            <FolderKanban className="h-4 w-4" />
            <span>Projetos</span>
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
            {project.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">Dashboard</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">{project.name}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {schemaInfo && allData.length > 0 && (
              <DashboardFilters
                schemaInfo={schemaInfo}
                data={allData}
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}
            {allData.length > 0 && (
              <ExportButton data={allData} filename={`dashboard-${project.name}`} />
            )}
            {widgets.length > 0 && (
              <ShareDashboard
                projectId={project.id}
                projectName={project.name}
                widgetIds={widgets.map((w) => w.id)}
                filterConfig={filters as unknown as Json}
              />
            )}
            <DashboardBuilder projectId={projectId} onWidgetCreated={loadDashboard} />
          </div>
        </div>

        {/* Dashboard Content */}
        {widgets.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Dashboard vazio</h2>
            <p className="text-muted-foreground mb-2">
              {dataSources.length === 0 
                ? "Adicione uma fonte de dados primeiro para criar widgets"
                : "Adicione widgets de KPIs e gráficos para visualizar seus dados"}
            </p>
            <div className="flex justify-center gap-4 mt-6">
              {dataSources.length === 0 ? (
                <Link to={`/upload?project=${projectId}`}>
                  <Button className="btn-gradient">
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Dados
                  </Button>
                </Link>
              ) : (
                <DashboardBuilder projectId={projectId} onWidgetCreated={loadDashboard} />
              )}
              <Link to={`/analyses?project=${projectId}`}>
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Análise com IA
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Share reminder when widgets exist */}
            {widgets.length > 0 && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <Share2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Compartilhe este dashboard</p>
                    <p className="text-sm text-muted-foreground">
                      Gere um link público para compartilhar com sua equipe
                    </p>
                  </div>
                </div>
                <ShareDashboard
                  projectId={project.id}
                  projectName={project.name}
                  widgetIds={widgets.map((w) => w.id)}
                  filterConfig={filters as unknown as Json}
                />
              </div>
            )}

            {/* Filter Widgets */}
            {filterWidgets.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Filtros</h2>
                </div>
                <div className="space-y-4">
                  {filterWidgets.map((widget) => (
                    <div key={widget.id} className="relative group">
                      <DynamicFilter
                        title={widget.title}
                        dataSourceId={widget.data_source_id || ""}
                        config={widget.config as { fields: string[]; layout: "horizontal" | "vertical" }}
                        filters={filters}
                        onFiltersChange={setFilters}
                        schemaInfo={schemaInfo}
                        data={allData}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteWidget(widget.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPIs */}
            {kpiWidgets.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Indicadores</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {kpiWidgets.map((widget) => (
                    <div key={widget.id} className="relative group">
                      <DynamicKPI
                        title={widget.title}
                        dataSourceId={widget.data_source_id || ""}
                        config={widget.config as Record<string, unknown>}
                        filters={filters}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteWidget(widget.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts */}
            {chartWidgets.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Gráficos</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {chartWidgets.map((widget) => (
                    <div key={widget.id} className="relative group">
                      <DynamicChart
                        title={widget.title}
                        dataSourceId={widget.data_source_id || ""}
                        config={widget.config as Record<string, unknown>}
                        filters={filters}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteWidget(widget.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tables */}
            {tableWidgets.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TableIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Tabelas de Dados</h2>
                </div>
                <div className="space-y-6">
                  {tableWidgets.map((widget) => (
                    <div key={widget.id} className="relative group">
                      <DynamicTable
                        title={widget.title}
                        dataSourceId={widget.data_source_id || ""}
                        config={widget.config as { columns?: string[]; pageSize?: number }}
                        filters={filters}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteWidget(widget.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
