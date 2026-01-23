import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DynamicKPI } from "@/components/ui/DynamicKPI";
import { DynamicChart } from "@/components/ui/DynamicChart";
import { DynamicTable } from "@/components/ui/DynamicTable";
import { DashboardFilters, applyFilters } from "@/components/ui/DashboardFilters";
import { ExportButton } from "@/components/ui/ExportButton";
import { Loader2, BarChart3, AlertCircle, Table as TableIcon } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface SharedDashboard {
  id: string;
  title: string;
  widget_ids: string[];
  filter_config: Json;
  project_id: string;
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

export default function PublicDashboard() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<SharedDashboard | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [tableDataCollector, setTableDataCollector] = useState<Map<string, Record<string, unknown>[]>>(new Map());

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      setError("Token inválido");
      setLoading(false);
      return;
    }

    try {
      // Fetch shared dashboard by token
      const { data: sharedData, error: sharedError } = await supabase
        .from("shared_dashboards")
        .select("*")
        .eq("share_token", token)
        .eq("is_active", true)
        .single();

      if (sharedError || !sharedData) {
        setError("Dashboard não encontrado ou expirado");
        setLoading(false);
        return;
      }

      setDashboard(sharedData as SharedDashboard);

      // Fetch widgets
      if (sharedData.widget_ids && sharedData.widget_ids.length > 0) {
        const { data: widgetsData, error: widgetsError } = await supabase
          .from("dashboard_widgets")
          .select("id, widget_type, title, config, data_source_id")
          .in("id", sharedData.widget_ids);

        if (!widgetsError && widgetsData) {
          setWidgets(widgetsData as DashboardWidget[]);

          // Get unique data source IDs
          const sourceIds = [...new Set(widgetsData.map(w => w.data_source_id).filter(Boolean))] as string[];
          
          if (sourceIds.length > 0) {
            const { data: sourcesData } = await supabase
              .from("data_sources")
              .select("id, name, schema_info")
              .in("id", sourceIds);

            if (sourcesData) {
              setDataSources(sourcesData as DataSource[]);
            }
          }
        }
      }

      // Set initial filters from config
      if (sharedData.filter_config && typeof sharedData.filter_config === 'object') {
        setFilters(sharedData.filter_config as Record<string, unknown>);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Get schema from first data source for filters
  const schemaInfo = dataSources[0]?.schema_info as { columns?: Array<{ name: string; type: string }> } | null;

  // Separate widgets by type
  const kpiWidgets = widgets.filter(w => w.widget_type === "kpi");
  const chartWidgets = widgets.filter(w => w.widget_type === "chart");
  const tableWidgets = widgets.filter(w => w.widget_type === "table");

  // Collect data from tables for global export
  const handleTableDataLoaded = (widgetId: string, data: Record<string, unknown>[]) => {
    setTableDataCollector(prev => {
      const newMap = new Map(prev);
      newMap.set(widgetId, data);
      return newMap;
    });
  };

  // Combine all table data for export
  const allData = Array.from(tableDataCollector.values()).flat();

  // Filter data for export
  const filteredData = applyFilters(allData, filters);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center glass-card p-8 rounded-xl max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Dashboard Indisponível</h1>
          <p className="text-muted-foreground">{error || "Este dashboard não existe ou foi desativado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{dashboard.title}</h1>
                <p className="text-sm text-muted-foreground">Dashboard Público</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DashboardFilters
                schemaInfo={schemaInfo}
                data={allData}
                filters={filters}
                onFiltersChange={setFilters}
              />
              {filteredData.length > 0 && (
                <ExportButton data={filteredData} filename={dashboard.title} />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {widgets.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum widget configurado</h2>
            <p className="text-muted-foreground">Este dashboard não possui widgets para exibir.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPIs */}
            {kpiWidgets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiWidgets.map((widget) => (
                  <DynamicKPI
                    key={widget.id}
                    title={widget.title}
                    dataSourceId={widget.data_source_id || ""}
                    config={widget.config as Record<string, unknown>}
                    filters={filters}
                  />
                ))}
              </div>
            )}

            {/* Charts */}
            {chartWidgets.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {chartWidgets.map((widget) => (
                  <DynamicChart
                    key={widget.id}
                    title={widget.title}
                    dataSourceId={widget.data_source_id || ""}
                    config={widget.config as Record<string, unknown>}
                    filters={filters}
                  />
                ))}
              </div>
            )}

            {/* Tables */}
            {tableWidgets.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TableIcon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Tabelas de Dados</h3>
                </div>
                <div className="space-y-6">
                  {tableWidgets.map((widget) => (
                    <DynamicTable
                      key={widget.id}
                      title={widget.title}
                      dataSourceId={widget.data_source_id || ""}
                      config={widget.config as { columns?: string[]; pageSize?: number }}
                      filters={filters}
                      onDataLoaded={(data) => handleTableDataLoaded(widget.id, data)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="text-primary font-medium">InteliData</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
