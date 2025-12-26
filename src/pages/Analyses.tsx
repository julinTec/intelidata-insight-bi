import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AnalysisResults } from "@/components/ui/AnalysisResults";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Brain, 
  Loader2, 
  Sparkles, 
  Eye,
  Code2,
  Play
} from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  schema_info: Record<string, unknown> | null;
  row_count: number | null;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedDataSource, setSelectedDataSource] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<string>("full");
  const [viewMode, setViewMode] = useState<"executive" | "analyst">("executive");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

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
      .select("id, name, schema_info, row_count")
      .eq("project_id", projectId);
    setDataSources(data || []);
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

      const schemaInfo = dataSource.schema_info;

      const { data, error } = await supabase.functions.invoke("analyze-data", {
        body: {
          schemaInfo,
          sampleData: [],
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
      console.error(error);
      toast.error("Erro ao executar análise");
    } finally {
      setLoading(false);
    }
  };

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
                      {ds.name} ({ds.row_count} rows)
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

          <div className="flex justify-end mt-6">
            <Button
              onClick={runAnalysis}
              disabled={loading || !selectedDataSource}
              className="btn-gradient"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analisando...
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
            <h3 className="text-xl font-semibold mb-2">Analisando seus dados...</h3>
            <p className="text-muted-foreground">
              A IA está identificando KPIs, sugerindo gráficos e gerando queries
            </p>
          </div>
        )}

        {result && !loading && (
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-semibold mb-6">Resultados da Análise</h3>
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
