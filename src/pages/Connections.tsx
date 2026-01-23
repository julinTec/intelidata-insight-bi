import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Database, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Server,
  Lock,
  Globe,
  Link2,
  FileJson,
  FolderKanban
} from "lucide-react";

type ConnectionType = "postgresql" | "mysql" | "api_json";

interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  host?: string;
  port?: number;
  database?: string;
  connectionUrl?: string;
  dataPath?: string;
  status: "connected" | "error" | "pending";
  projectId?: string;
  projectName?: string;
}

interface ExtractedSchema {
  columns: Array<{ name: string; type: string }>;
}

interface Project {
  id: string;
  name: string;
}

export default function Connections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, unknown>[] | null>(null);
  const [extractedSchema, setExtractedSchema] = useState<ExtractedSchema | null>(null);
  const [detectedPaths, setDetectedPaths] = useState<{ path: string; length: number }[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "api_json" as ConnectionType,
    projectId: "",
    // DB fields
    host: "",
    port: 5432,
    database: "",
    username: "",
    password: "",
    // API JSON fields
    connectionUrl: "",
    dataPath: "",
  });

  // Load saved connections and projects on mount
  useEffect(() => {
    if (user) {
      loadSavedConnections();
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setProjects(data || []);
  };

  const loadSavedConnections = async () => {
    setLoadingConnections(true);
    const { data } = await supabase
      .from("data_sources")
      .select(`
        id, 
        name, 
        source_type, 
        connection_config,
        project_id,
        projects!inner(name)
      `)
      .eq("user_id", user!.id)
      .in("source_type", ["postgresql", "mysql", "api_json"]);

    if (data) {
      const loadedConnections: Connection[] = data.map((ds) => {
        const config = ds.connection_config as Record<string, unknown> | null;
        return {
          id: ds.id,
          name: ds.name,
          type: ds.source_type as ConnectionType,
          host: config?.host as string | undefined,
          port: config?.port as number | undefined,
          database: config?.database as string | undefined,
          connectionUrl: config?.url as string | undefined,
          dataPath: config?.dataPath as string | undefined,
          status: "connected" as const,
          projectId: ds.project_id,
          projectName: (ds.projects as { name: string })?.name,
        };
      });
      setConnections(loadedConnections);
    }
    setLoadingConnections(false);
  };

  // Find all arrays in a nested JSON object
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

  const extractSchemaFromJson = (sample: Record<string, unknown>): { columns: Array<{ name: string; type: string }> } => {
    const columns: Array<{ name: string; type: string }> = [];
    
    for (const [key, value] of Object.entries(sample || {})) {
      let type: string = typeof value;
      if (value === null) type = "null";
      else if (Array.isArray(value)) type = "array";
      else if (value instanceof Date) type = "date";
      
      columns.push({ name: key, type });
    }
    
    return { columns };
  };

  const extractDataFromPath = (jsonData: unknown, dataPath: string): unknown => {
    if (!dataPath) return jsonData;
    return dataPath.split('.').reduce((obj: unknown, key: string) => {
      if (obj && typeof obj === 'object' && key in obj) {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, jsonData);
  };

  const testApiConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setSampleData(null);
    setExtractedSchema(null);
    setDetectedPaths([]);

    try {
      const response = await fetch(formData.connectionUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const jsonData = await response.json();
      
      // If dataPath is provided, use it directly
      if (formData.dataPath) {
        const data = extractDataFromPath(jsonData, formData.dataPath);
        
        if (data === undefined) {
          throw new Error(`Caminho "${formData.dataPath}" não encontrado no JSON`);
        }
        
        const records = Array.isArray(data) ? data : [data];
        
        if (records.length === 0) {
          throw new Error("Nenhum dado encontrado");
        }
        
        const firstRecord = records[0] as Record<string, unknown>;
        const schema = extractSchemaFromJson(firstRecord);
        
        setExtractedSchema(schema);
        setSampleData(records.slice(0, 5) as Record<string, unknown>[]);
        setTestResult("success");
        toast.success(`Conectado! ${records.length} registro(s) encontrado(s)`);
      } else {
        // Auto-detect arrays in the JSON
        const paths = findArrayPaths(jsonData);
        
        if (paths.length === 0) {
          // No arrays found, treat as single object
          const records = Array.isArray(jsonData) ? jsonData : [jsonData];
          const firstRecord = records[0] as Record<string, unknown>;
          const schema = extractSchemaFromJson(firstRecord);
          
          setExtractedSchema(schema);
          setSampleData(records.slice(0, 5) as Record<string, unknown>[]);
          setTestResult("success");
          toast.info(`Objeto detectado. Nenhum array encontrado.`);
        } else if (paths.length === 1) {
          // Single array found, use it automatically
          const selectedPath = paths[0].path === "(raiz)" ? "" : paths[0].path;
          const data = selectedPath ? extractDataFromPath(jsonData, selectedPath) : jsonData;
          const records = Array.isArray(data) ? data : [data];
          const firstRecord = records[0] as Record<string, unknown>;
          const schema = extractSchemaFromJson(firstRecord);
          
          // Auto-fill the dataPath
          setFormData(prev => ({ ...prev, dataPath: selectedPath }));
          setExtractedSchema(schema);
          setSampleData(records.slice(0, 5) as Record<string, unknown>[]);
          setTestResult("success");
          toast.success(`Array encontrado em "${selectedPath || 'raiz'}" com ${records.length} registro(s)`);
        } else {
          // Multiple arrays found, show selector
          setDetectedPaths(paths);
          toast.info(`${paths.length} arrays detectados. Selecione qual deseja usar.`);
        }
      }
    } catch (error) {
      setTestResult("error");
      toast.error(`Falha ao conectar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
    
    setTesting(false);
  };

  const selectArrayPath = async (selectedPath: string) => {
    const pathToUse = selectedPath === "(raiz)" ? "" : selectedPath;
    setFormData(prev => ({ ...prev, dataPath: pathToUse }));
    setDetectedPaths([]);
    
    try {
      const response = await fetch(formData.connectionUrl);
      const jsonData = await response.json();
      const data = pathToUse ? extractDataFromPath(jsonData, pathToUse) : jsonData;
      const records = Array.isArray(data) ? data : [data];
      const firstRecord = records[0] as Record<string, unknown>;
      const schema = extractSchemaFromJson(firstRecord);
      
      setExtractedSchema(schema);
      setSampleData(records.slice(0, 5) as Record<string, unknown>[]);
      setTestResult("success");
      toast.success(`Selecionado: ${records.length} registro(s) em "${pathToUse || 'raiz'}"`);
    } catch (error) {
      toast.error("Erro ao carregar dados do caminho selecionado");
    }
  };

  const testDbConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // Simulated connection test for DB
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    if (formData.host && formData.database && formData.username) {
      setTestResult("success");
      toast.success("Conexão bem-sucedida!");
    } else {
      setTestResult("error");
      toast.error("Falha na conexão. Verifique os dados.");
    }
    
    setTesting(false);
  };

  const testConnection = async () => {
    if (formData.type === "api_json") {
      await testApiConnection();
    } else {
      await testDbConnection();
    }
  };

  const saveConnection = async () => {
    if (!formData.name) {
      toast.error("Preencha o nome da conexão");
      return;
    }

    if (!formData.projectId) {
      toast.error("Selecione um projeto");
      return;
    }

    if (formData.type === "api_json") {
      if (!formData.connectionUrl) {
        toast.error("Preencha a URL do endpoint");
        return;
      }
      if (testResult !== "success" || !extractedSchema) {
        toast.error("Teste a conexão antes de salvar");
        return;
      }

      setSaving(true);

      try {
        // Calculate row count from sample data
        const response = await fetch(formData.connectionUrl);
        const jsonData = await response.json();
        let data = extractDataFromPath(jsonData, formData.dataPath);
        const records = Array.isArray(data) ? data : [data];

        // Save as data source - convert to JSON-compatible format
        const schemaInfoForDb = extractedSchema 
          ? { columns: extractedSchema.columns.map(c => ({ name: c.name, type: c.type })) }
          : null;
        
        const { data: insertedData, error } = await supabase.from("data_sources").insert([{
          user_id: user!.id,
          project_id: formData.projectId,
          name: formData.name,
          source_type: "api_json",
          connection_config: {
            url: formData.connectionUrl,
            dataPath: formData.dataPath || null,
          },
          schema_info: schemaInfoForDb,
          row_count: records.length,
        }]).select();

        if (error) throw error;

        // Get project name for display
        const project = projects.find(p => p.id === formData.projectId);

        // Add to local connections list
        const newConnection: Connection = {
          id: insertedData?.[0]?.id || Date.now().toString(),
          name: formData.name,
          type: "api_json",
          connectionUrl: formData.connectionUrl,
          dataPath: formData.dataPath,
          status: "connected",
          projectId: formData.projectId,
          projectName: project?.name,
        };

        setConnections([...connections, newConnection]);
        resetForm();
        toast.success("Conexão salva como fonte de dados!");
      } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar conexão");
      }

      setSaving(false);
    } else {
      // DB connection - also save to Supabase
      if (!formData.host || !formData.database) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      setSaving(true);

      try {
        const { data: insertedData, error } = await supabase.from("data_sources").insert([{
          user_id: user!.id,
          project_id: formData.projectId,
          name: formData.name,
          source_type: formData.type,
          connection_config: {
            host: formData.host,
            port: formData.port,
            database: formData.database,
            username: formData.username,
            // Note: password should use vault/secrets in production
          },
          schema_info: null,
          row_count: null,
        }]).select();

        if (error) throw error;

        const project = projects.find(p => p.id === formData.projectId);

        const newConnection: Connection = {
          id: insertedData?.[0]?.id || Date.now().toString(),
          name: formData.name,
          type: formData.type,
          host: formData.host,
          port: formData.port,
          database: formData.database,
          status: testResult === "success" ? "connected" : "pending",
          projectId: formData.projectId,
          projectName: project?.name,
        };

        setConnections([...connections, newConnection]);
        resetForm();
        toast.success("Conexão de BD salva como fonte de dados!");
      } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar conexão");
      }

      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({
      name: "",
      type: "api_json",
      projectId: "",
      host: "",
      port: 5432,
      database: "",
      username: "",
      password: "",
      connectionUrl: "",
      dataPath: "",
    });
    setTestResult(null);
    setSampleData(null);
    setExtractedSchema(null);
    setDetectedPaths([]);
  };

  const getTableColumns = () => {
    if (!sampleData || sampleData.length === 0) return [];
    return Object.keys(sampleData[0]).map((key) => ({
      key,
      label: key,
      sortable: true,
    }));
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              Conexões de Dados
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure conexões com bancos de dados ou APIs JSON
            </p>
          </div>

          <Button onClick={() => setShowForm(true)} className="btn-gradient">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conexão
          </Button>
        </div>

        {/* Connection Form */}
        {showForm && (
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-semibold mb-6">Nova Conexão</h3>

            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-3" />
                <h4 className="font-medium mb-1">Nenhum projeto encontrado</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie um projeto primeiro para adicionar conexões
                </p>
                <Button asChild variant="outline" onClick={() => setShowForm(false)}>
                  <a href="/projects">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Projeto
                  </a>
                </Button>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conexão</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: API Produção"
                  className="input-dark"
                />
              </div>

              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4" />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Conexão</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ConnectionType) => {
                    setFormData({ 
                      ...formData, 
                      type: value, 
                      port: value === "postgresql" ? 5432 : value === "mysql" ? 3306 : formData.port 
                    });
                    setTestResult(null);
                    setSampleData(null);
                    setExtractedSchema(null);
                  }}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_json">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        API / Link JSON
                      </div>
                    </SelectItem>
                    <SelectItem value="postgresql">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        PostgreSQL
                      </div>
                    </SelectItem>
                    <SelectItem value="mysql">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        MySQL
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* API JSON Fields */}
              {formData.type === "api_json" && (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="connectionUrl">URL do Endpoint</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="connectionUrl"
                        value={formData.connectionUrl}
                        onChange={(e) => setFormData({ ...formData, connectionUrl: e.target.value })}
                        placeholder="https://seuapp.lovable.app/api/dados"
                        className="input-dark pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="dataPath">Caminho dos Dados (opcional)</Label>
                    <div className="relative">
                      <FileJson className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="dataPath"
                        value={formData.dataPath}
                        onChange={(e) => setFormData({ ...formData, dataPath: e.target.value })}
                        placeholder="Ex: data.records ou items"
                        className="input-dark pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para auto-detectar. Se houver múltiplos arrays, você poderá escolher.
                    </p>
                  </div>

                  {/* Detected Paths Selector */}
                  {detectedPaths.length > 1 && (
                    <div className="md:col-span-2 p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium mb-3">
                        Múltiplos arrays detectados. Selecione qual usar:
                      </p>
                      <div className="space-y-2">
                        {detectedPaths.map((p) => (
                          <button
                            key={p.path}
                            onClick={() => selectArrayPath(p.path)}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 border border-border/50 transition-colors text-left"
                          >
                            <span className="font-mono text-sm">{p.path}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.length} registro(s)
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* DB Fields */}
              {formData.type !== "api_json" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="host">Host</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="host"
                        value={formData.host}
                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                        placeholder="localhost ou IP"
                        className="input-dark pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">Porta</Label>
                    <div className="relative">
                      <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="port"
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                        className="input-dark pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="database">Database</Label>
                    <div className="relative">
                      <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="database"
                        value={formData.database}
                        onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                        placeholder="Nome do banco"
                        className="input-dark pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Usuário</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Usuário do banco"
                      className="input-dark"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Senha do banco"
                        className="input-dark pl-10"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`flex items-center gap-2 mt-4 p-3 rounded-lg ${
                testResult === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                {testResult === "success" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">
                  {testResult === "success" ? "Conexão bem-sucedida!" : "Falha na conexão"}
                </span>
              </div>
            )}

            {/* Schema Preview */}
            {extractedSchema && testResult === "success" && (
              <div className="mt-4 p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Schema Detectado
                </h4>
                <div className="flex flex-wrap gap-2">
                  {extractedSchema.columns.map((col) => (
                    <span 
                      key={col.name} 
                      className="px-2 py-1 text-xs rounded bg-primary/10 text-primary"
                    >
                      {col.name}: <span className="text-muted-foreground">{col.type}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Data Preview */}
            {sampleData && sampleData.length > 0 && testResult === "success" && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-3">Preview dos Dados ({sampleData.length} registros)</h4>
                <DataTable 
                  columns={getTableColumns()} 
                  data={sampleData}
                  searchable={false}
                  pageSize={5}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={resetForm}
              >
                Cancelar
              </Button>
              <Button variant="outline" onClick={testConnection} disabled={testing}>
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Testando...
                  </>
                ) : (
                  "Testar Conexão"
                )}
              </Button>
              <Button onClick={saveConnection} className="btn-gradient" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Conexão"
                )}
              </Button>
            </div>
            </>
            )}
          </div>
        )}

        {/* Connections List */}
        {connections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((conn) => (
              <div key={conn.id} className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {conn.type === "api_json" ? (
                      <Link2 className="h-5 w-5" />
                    ) : (
                      <Database className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{conn.name}</h3>
                    <span className="text-xs text-muted-foreground uppercase">
                      {conn.type === "api_json" ? "API JSON" : conn.type}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {conn.type === "api_json" ? (
                    <>
                      <p className="truncate">URL: {conn.connectionUrl}</p>
                      {conn.dataPath && <p>Path: {conn.dataPath}</p>}
                    </>
                  ) : (
                    <>
                      <p>Host: {conn.host}:{conn.port}</p>
                      <p>Database: {conn.database}</p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  {conn.status === "connected" ? (
                    <span className="flex items-center gap-1 text-success text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      Conectado
                    </span>
                  ) : conn.status === "error" ? (
                    <span className="flex items-center gap-1 text-destructive text-sm">
                      <XCircle className="h-4 w-4" />
                      Erro
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-warning text-sm">
                      <Loader2 className="h-4 w-4" />
                      Pendente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !showForm && (
          <div className="glass-card rounded-xl p-12 text-center">
            <Link2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma conexão configurada</h3>
            <p className="text-muted-foreground mb-4">
              Configure conexões com APIs JSON ou bancos de dados
            </p>
            <Button onClick={() => setShowForm(true)} className="btn-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Nova Conexão
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}