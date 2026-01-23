import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./button";
import { Label } from "./label";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./dialog";
import { toast } from "sonner";
import { Plus, BarChart3, Hash, Loader2, FolderKanban, Upload, AlertCircle, Database, Link2, FileSpreadsheet, Table as TableIcon } from "lucide-react";
import { Checkbox } from "./checkbox";
import type { Json } from "@/integrations/supabase/types";

interface Project {
  id: string;
  name: string;
}

interface DataSource {
  id: string;
  name: string;
  source_type: string;
  schema_info: Json | null;
}

export interface DashboardBuilderProps {
  onWidgetCreated?: () => void;
  projectId?: string;
}

export function DashboardBuilder({ onWidgetCreated, projectId: initialProjectId }: DashboardBuilderProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedProject, setSelectedProject] = useState(initialProjectId || "");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  
  const [selectedDataSource, setSelectedDataSource] = useState("");
  const [widgetType, setWidgetType] = useState<"kpi" | "chart" | "table">("kpi");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  // KPI config
  const [kpiField, setKpiField] = useState("");
  const [kpiAggregation, setKpiAggregation] = useState<"sum" | "count" | "avg">("count");
  const [kpiFormat, setKpiFormat] = useState<"number" | "currency" | "percent">("number");

  // Chart config
  const [chartType, setChartType] = useState<"bar" | "line" | "area" | "pie">("bar");
  const [groupByField, setGroupByField] = useState("");
  const [valueField, setValueField] = useState("");

  // Table config
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [tablePageSize, setTablePageSize] = useState(10);

  useEffect(() => {
    if (user && open) {
      loadProjects();
    }
  }, [user, open]);

  useEffect(() => {
    if (selectedProject) {
      loadDataSources(selectedProject);
    } else {
      setDataSources([]);
      setSelectedDataSource("");
    }
  }, [selectedProject]);

  // Auto-select project if passed via prop
  useEffect(() => {
    if (initialProjectId && projects.length > 0) {
      setSelectedProject(initialProjectId);
    }
  }, [initialProjectId, projects]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setProjects(data || []);
    setLoadingProjects(false);
  };

  const loadDataSources = async (projectId: string) => {
    setLoadingSources(true);
    const { data } = await supabase
      .from("data_sources")
      .select("id, name, source_type, schema_info")
      .eq("project_id", projectId);
    setDataSources(data || []);
    setLoadingSources(false);
  };

  const getFieldsFromSchema = (): string[] => {
    const ds = dataSources.find((d) => d.id === selectedDataSource);
    if (!ds?.schema_info) return [];

    const schema = ds.schema_info as { columns?: Array<{ name: string }> };
    return schema.columns?.map((c) => c.name) || [];
  };

  const handleCreate = async () => {
    if (!selectedProject || !selectedDataSource || !title) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      let config: Record<string, unknown>;
      
      if (widgetType === "kpi") {
        config = {
          field: kpiField || undefined,
          aggregation: kpiAggregation,
          format: kpiFormat,
        };
      } else if (widgetType === "chart") {
        config = {
          chartType,
          groupBy: groupByField || undefined,
          yField: valueField || undefined,
          aggregation: kpiAggregation,
        };
      } else {
        // table
        config = {
          columns: tableColumns.length > 0 ? tableColumns : undefined,
          pageSize: tablePageSize,
        };
      }

      const { error } = await supabase.from("dashboard_widgets").insert([{
        user_id: user!.id,
        project_id: selectedProject,
        data_source_id: selectedDataSource,
        widget_type: widgetType,
        title,
        config: config as Json,
      }]);

      if (error) throw error;

      toast.success("Widget criado com sucesso!");
      setOpen(false);
      resetForm();
      onWidgetCreated?.();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar widget");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setKpiField("");
    setKpiAggregation("count");
    setKpiFormat("number");
    setChartType("bar");
    setGroupByField("");
    setValueField("");
    setTableColumns([]);
    setTablePageSize(10);
    if (!initialProjectId) {
      setSelectedProject("");
      setSelectedDataSource("");
    }
  };

  const fields = getFieldsFromSchema();

  // Render empty states
  const renderEmptyState = () => {
    if (loadingProjects) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Carregando projetos...</p>
        </div>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground mb-3" />
          <h4 className="font-medium mb-1">Nenhum projeto encontrado</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Crie um projeto primeiro para adicionar widgets
          </p>
          <Button asChild variant="outline" onClick={() => setOpen(false)}>
            <Link to="/projects">
              <Plus className="h-4 w-4 mr-2" />
              Criar Projeto
            </Link>
          </Button>
        </div>
      );
    }

    return null;
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "csv":
      case "excel":
        return <FileSpreadsheet className="h-4 w-4" />;
      case "api_json":
        return <Link2 className="h-4 w-4" />;
      case "postgresql":
      case "mysql":
        return <Database className="h-4 w-4" />;
      default:
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const renderNoDataSourcesMessage = () => {
    if (!selectedProject) return null;
    
    if (loadingSources) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando fontes de dados...</span>
        </div>
      );
    }

    if (dataSources.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-center">
            Este projeto não tem fontes de dados.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" onClick={() => setOpen(false)}>
              <Link to={`/upload?project=${selectedProject}`}>
                <Upload className="h-4 w-4 mr-2" />
                CSV/Excel
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" onClick={() => setOpen(false)}>
              <Link to="/connections">
                <Database className="h-4 w-4 mr-2" />
                BD/API
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-gradient">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Widget
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Widget do Dashboard</DialogTitle>
        </DialogHeader>

        {renderEmptyState() || (
          <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-2">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderNoDataSourcesMessage()}

            {dataSources.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Fonte de Dados</Label>
                  <Select
                    value={selectedDataSource}
                    onValueChange={setSelectedDataSource}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSources.map((ds) => (
                        <SelectItem key={ds.id} value={ds.id}>
                          <div className="flex items-center gap-2">
                            {getSourceIcon(ds.source_type)}
                            <span>{ds.name}</span>
                            <span className="text-xs text-muted-foreground">({ds.source_type})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Widget</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={widgetType === "kpi" ? "default" : "outline"}
                      onClick={() => setWidgetType("kpi")}
                      className="flex-1"
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      KPI
                    </Button>
                    <Button
                      type="button"
                      variant={widgetType === "chart" ? "default" : "outline"}
                      onClick={() => setWidgetType("chart")}
                      className="flex-1"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Gráfico
                    </Button>
                    <Button
                      type="button"
                      variant={widgetType === "table" ? "default" : "outline"}
                      onClick={() => setWidgetType("table")}
                      className="flex-1"
                    >
                      <TableIcon className="h-4 w-4 mr-2" />
                      Tabela
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Total de Vendas"
                  />
                </div>

                {widgetType === "kpi" && (
                  <>
                    <div className="space-y-2">
                      <Label>Campo (opcional)</Label>
                      <Select value={kpiField || "__none__"} onValueChange={(v) => setKpiField(v === "__none__" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Contar registros" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Contar registros</SelectItem>
                          {fields.filter(f => f).map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Agregação</Label>
                        <Select value={kpiAggregation} onValueChange={(v) => setKpiAggregation(v as typeof kpiAggregation)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="count">Contar</SelectItem>
                            <SelectItem value="sum">Soma</SelectItem>
                            <SelectItem value="avg">Média</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Formato</Label>
                        <Select value={kpiFormat} onValueChange={(v) => setKpiFormat(v as typeof kpiFormat)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Número</SelectItem>
                            <SelectItem value="currency">Moeda (R$)</SelectItem>
                            <SelectItem value="percent">Percentual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {widgetType === "chart" && (
                  <>
                    <div className="space-y-2">
                      <Label>Tipo de Gráfico</Label>
                      <Select value={chartType} onValueChange={(v) => setChartType(v as typeof chartType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Barras</SelectItem>
                          <SelectItem value="line">Linhas</SelectItem>
                          <SelectItem value="area">Área</SelectItem>
                          <SelectItem value="pie">Pizza</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Agrupar por</Label>
                      <Select value={groupByField} onValueChange={setGroupByField}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.filter(f => f).map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Campo de Valor (opcional)</Label>
                      <Select value={valueField || "__none__"} onValueChange={(v) => setValueField(v === "__none__" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Contar registros" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Contar registros</SelectItem>
                          {fields.filter(f => f).map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {widgetType === "table" && (
                  <>
                    <div className="space-y-2">
                      <Label>Colunas a exibir</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border rounded-md bg-muted/20">
                        {fields.length > 0 ? (
                          fields.map((field) => (
                            <label
                              key={field}
                              className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 p-1 rounded"
                            >
                              <Checkbox
                                checked={tableColumns.includes(field)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTableColumns([...tableColumns, field]);
                                  } else {
                                    setTableColumns(tableColumns.filter((c) => c !== field));
                                  }
                                }}
                              />
                              <span className="truncate">{field}</span>
                            </label>
                          ))
                        ) : (
                          <p className="col-span-2 text-sm text-muted-foreground text-center py-2">
                            Selecione uma fonte de dados
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Deixe vazio para exibir todas as colunas
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Registros por página</Label>
                      <Select
                        value={String(tablePageSize)}
                        onValueChange={(v) => setTablePageSize(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer fixo com botão Aplicar */}
        {dataSources.length > 0 && selectedDataSource && (
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button
              onClick={handleCreate}
              disabled={loading || !selectedProject || !selectedDataSource || !title}
              className="w-full btn-gradient"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Aplicar
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
