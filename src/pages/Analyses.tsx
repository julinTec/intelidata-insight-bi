import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AnalysisResults } from "@/components/ui/AnalysisResults";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  Loader2, 
  Sparkles, 
  Eye,
  Code2,
  Play,
  RefreshCw,
  LayoutDashboard
} from "lucide-react";

interface ConnectionConfig {
  url?: string;
  dataPath?: string | null;
}

interface DataSource {
  id: string;
  name: string;
  source_type: string;
  schema_info: Json | null;
  row_count: number | null;
  connection_config: Json | null;
}

interface Project {
  id: string;
  name: string;
}

interface AnalysisResult {
  kpis?: Array<{
    name: string;
    description: string;
    formula: string;
    chartType: string;
    sql?: string;
    dax?: string;
  }>;
  charts?: Array<{
    type: string;
    title: string;
    description: string;
    dataFields: string[];
  }>;
  insights?: string[];
  queries?: Array<{
    name: string;
    sql?: string;
    dax?: string;
  }>;
}

export default function Analyses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedDataSource, setSelectedDataSource] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<string>("full");
  const [viewMode, setViewMode] = useState<"executive" | "analyst">("executive");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [addingToDashboard, setAddingToDashboard] = useState(false);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      loadDataSources(selectedProject);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user!.id);
    setProjects(data || []);
  };

  const loadDataSources = async (projectId: string) => {
    const { data } = await supabase
      .from("data_sources")
      .select("id, name, source_type, schema_info, row_count, connection_config")
      .eq("project_id", projectId);
    setDataSources(data || []);
  };

  const extractDataFromPath = (jsonData: unknown, dataPath: string | null | undefined): unknown => {
    if (!dataPath) return jsonData;
    return dataPath.split('.').reduce((obj: unknown, key: string) => {
      if (obj && typeof obj === 'object' && key in obj) {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, jsonData);
  };

  const findArrayPaths = (obj: unknown, path = ""): { path: string; length: number }[] => {
    const results: { path: string; length: number }[] = [];
    
    if (Array.isArray(obj) && obj.length > 0) {
      results.push({ path: path || "(raiz)", length: obj.length });
    }
    
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;
        results.push(...findArrayPaths(value, newPath));
      }
    }
    
    return results;
  };

  const fetchApiJsonData = async (dataSource: DataSource): Promise<Record<string, unknown>[]> => {
    const config = dataSource.connection_config as ConnectionConfig | null;
    if (!config?.url) {
      throw new Error("URL não configurada para esta fonte de dados");
    }

    console.log("Fetching data from:", config.url);
    console.log("Using dataPath:", config.dataPath);

    const response = await fetch(config.url);
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: HTTP ${response.status}`);
    }

    const jsonData = await response.json();
    let data = extractDataFromPath(jsonData, config.dataPath);
    
    if (data === undefined) {
      throw new Error(`Caminho "${config.dataPath}" não encontrado`);
    }

    console.log("Extracted data type:", Array.isArray(data) ? "array" : typeof data);

    // Se não for array, tentar encontrar arrays dentro do objeto
    if (!Array.isArray(data) && typeof data === "object" && data !== null) {
      const paths = findArrayPaths(data);
      console.log("Auto-detected array paths:", paths);
      
      if (paths.length > 0) {
        // Usar o maior array encontrado
        const bestPath = paths.reduce((a, b) => a.length > b.length ? a : b);
        const fullPath = config.dataPath 
          ? `${config.dataPath}.${bestPath.path}` 
          : bestPath.path;
        
        console.log(`Auto-detectado array em "${fullPath}" com ${bestPath.length} registros`);
        data = extractDataFromPath(jsonData, fullPath);
      }
    }

    const records = Array.isArray(data) ? data : [data];
    console.log("Records found:", records.length);
    
    return records as Record<string, unknown>[];
  };

  const runAnalysis = async () => {
    if (!selectedDataSource) {
      toast.error("Selecione um data source");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const dataSource = dataSources.find((d) => d.id === selectedDataSource);
      if (!dataSource) throw new Error("Data source não encontrado");

      let sampleData: Record<string, unknown>[] = [];
      const schemaInfo = dataSource.schema_info;

      // For API JSON sources, fetch fresh data in real-time
      if (dataSource.source_type === "api_json") {
        setFetchingData(true);
        try {
          const freshData = await fetchApiJsonData(dataSource);
          sampleData = freshData as Record<string, unknown>[]; // Send all records for analysis
          toast.success(`Dados atualizados: ${freshData.length} registros`);
        } catch (error) {
          toast.error(`Erro ao buscar dados: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
          setLoading(false);
          setFetchingData(false);
          return;
        }
        setFetchingData(false);
      }

      const { data, error } = await supabase.functions.invoke("analyze-data", {
        body: {
          schemaInfo,
          sampleData,
          analysisType,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes("429") || data.error.includes("Rate")) {
          toast.error("Limite de requisições excedido. Aguarde alguns minutos.");
        } else if (data.error.includes("402") || data.error.includes("Payment")) {
          toast.error("Créditos insuficientes. Adicione créditos ao workspace.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      const analysis = data.analysis;
      setResult(analysis);
      toast.success("Análise concluída!");

      // Save analysis to database
      await supabase.from("analyses").insert({
        user_id: user!.id,
        project_id: selectedProject,
        data_source_id: selectedDataSource,
        name: `Análise - ${dataSource.name}`,
        analysis_type: analysisType,
        view_mode: viewMode,
        suggested_kpis: analysis.kpis || [],
        suggested_charts: analysis.charts || [],
        insights: JSON.stringify(analysis.insights || []),
        generated_queries: analysis.queries || [],
      });
    } catch (error) {
      console.error("Analysis error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao executar análise: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const addToDashboard = async () => {
    if (!result || !selectedProject || !selectedDataSource) return;

    setAddingToDashboard(true);

    try {
      const dataSource = dataSources.find((d) => d.id === selectedDataSource);
      const widgetsToCreate = [];

      // Create KPI widgets from analysis
      if (result.kpis && result.kpis.length > 0) {
        for (const kpi of result.kpis.slice(0, 4)) {
          widgetsToCreate.push({
            user_id: user!.id,
            project_id: selectedProject,
            data_source_id: selectedDataSource,
            widget_type: "kpi",
            title: kpi.name,
            config: {
              field: kpi.formula.includes("SUM") ? extractFieldFromFormula(kpi.formula) : undefined,
              aggregation: kpi.formula.includes("COUNT") ? "count" : kpi.formula.includes("AVG") ? "avg" : "sum",
              format: kpi.name.toLowerCase().includes("valor") || kpi.name.toLowerCase().includes("receita") ? "currency" : "number",
            },
          });
        }
      }

      // Create chart widgets from analysis
      if (result.charts && result.charts.length > 0) {
        for (const chart of result.charts.slice(0, 2)) {
          widgetsToCreate.push({
            user_id: user!.id,
            project_id: selectedProject,
            data_source_id: selectedDataSource,
            widget_type: "chart",
            title: chart.title,
            config: {
              chartType: chart.type.toLowerCase() as "bar" | "line" | "area" | "pie",
              groupBy: chart.dataFields[0] || undefined,
              yField: chart.dataFields[1] || undefined,
              aggregation: "count",
            },
          });
        }
      }

      if (widgetsToCreate.length === 0) {
        toast.info("Nenhum widget para adicionar. Execute uma análise primeiro.");
        return;
      }

      const { error } = await supabase.from("dashboard_widgets").insert(widgetsToCreate);

      if (error) throw error;

      toast.success(`${widgetsToCreate.length} widgets adicionados ao Dashboard!`);
      navigate("/");
    } catch (error) {
      console.error("Error adding to dashboard:", error);
      toast.error("Erro ao adicionar widgets ao dashboard");
    } finally {
      setAddingToDashboard(false);
    }
  };

  const extractFieldFromFormula = (formula: string): string | undefined => {
    const match = formula.match(/\(([^)]+)\)/);
    return match ? match[1].trim() : undefined;
  };

  const getSelectedDataSource = () => dataSources.find((d) => d.id === selectedDataSource);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Análises com IA
          </h1>
          <p className="text-muted-foreground mt-2">
            Use inteligência artificial para gerar KPIs, gráficos e queries
          </p>
        </div>

        {/* Configuration */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configurar Análise
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select 
                value={selectedDataSource} 
                onValueChange={setSelectedDataSource}
                disabled={!selectedProject}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.name} {ds.source_type === "api_json" && "(API)"} ({ds.row_count ?? 0} rows)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Análise</Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Completa</SelectItem>
                  <SelectItem value="kpis">Apenas KPIs</SelectItem>
                  <SelectItem value="charts">Apenas Gráficos</SelectItem>
                  <SelectItem value="queries">Apenas Queries</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modo de Visualização</Label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">Executivo</span>
                </div>
                <Switch
                  checked={viewMode === "analyst"}
                  onCheckedChange={(checked) => setViewMode(checked ? "analyst" : "executive")}
                />
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  <span className="text-sm">Analista</span>
                </div>
              </div>
            </div>
          </div>

          {/* API JSON indicator */}
          {getSelectedDataSource()?.source_type === "api_json" && (
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">
                Dados serão buscados em tempo real ao executar a análise
              </span>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button
              onClick={runAnalysis}
              disabled={loading || !selectedDataSource}
              className="btn-gradient"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {fetchingData ? "Buscando dados..." : "Analisando..."}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Executar Análise
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {fetchingData ? "Buscando dados em tempo real..." : "Analisando seus dados..."}
            </h3>
            <p className="text-muted-foreground">
              {fetchingData 
                ? "Conectando à API e baixando dados atualizados"
                : "A IA está identificando KPIs, sugerindo gráficos e gerando queries"
              }
            </p>
          </div>
        )}

        {result && !loading && (
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold">Resultados da Análise</h3>
              <Button
                onClick={addToDashboard}
                disabled={addingToDashboard}
                className="btn-gradient"
              >
                {addingToDashboard ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Adicionar ao Dashboard
                  </>
                )}
              </Button>
            </div>
            <AnalysisResults
              kpis={result.kpis}
              charts={result.charts}
              insights={result.insights}
              queries={result.queries}
              viewMode={viewMode}
            />
          </div>
        )}

        {!result && !loading && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Pronto para analisar</h3>
            <p className="text-muted-foreground">
              Selecione um data source e execute a análise para obter sugestões da IA
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}