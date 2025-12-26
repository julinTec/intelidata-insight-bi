import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Database, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Server,
  Lock,
  Globe
} from "lucide-react";

interface Connection {
  id: string;
  name: string;
  type: "postgresql" | "mysql";
  host: string;
  port: number;
  database: string;
  status: "connected" | "error" | "pending";
}

export default function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "postgresql" as "postgresql" | "mysql",
    host: "",
    port: 5432,
    database: "",
    username: "",
    password: "",
  });

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // Simulated connection test
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // For demo purposes, always succeed if fields are filled
    if (formData.host && formData.database && formData.username) {
      setTestResult("success");
      toast.success("Conexão bem-sucedida!");
    } else {
      setTestResult("error");
      toast.error("Falha na conexão. Verifique os dados.");
    }
    
    setTesting(false);
  };

  const saveConnection = () => {
    if (!formData.name || !formData.host || !formData.database) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const newConnection: Connection = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type,
      host: formData.host,
      port: formData.port,
      database: formData.database,
      status: testResult === "success" ? "connected" : "pending",
    };

    setConnections([...connections, newConnection]);
    setShowForm(false);
    setFormData({
      name: "",
      type: "postgresql",
      host: "",
      port: 5432,
      database: "",
      username: "",
      password: "",
    });
    setTestResult(null);
    toast.success("Conexão salva!");
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              Conexões de Banco
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure conexões com bancos de dados externos
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conexão</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Produção Principal"
                  className="input-dark"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Banco</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "postgresql" | "mysql") => 
                    setFormData({ ...formData, type: value, port: value === "postgresql" ? 5432 : 3306 })
                  }
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setTestResult(null);
                }}
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
              <Button onClick={saveConnection} className="btn-gradient">
                Salvar Conexão
              </Button>
            </div>
          </div>
        )}

        {/* Connections List */}
        {connections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((conn) => (
              <div key={conn.id} className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{conn.name}</h3>
                    <span className="text-xs text-muted-foreground uppercase">{conn.type}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Host: {conn.host}:{conn.port}</p>
                  <p>Database: {conn.database}</p>
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
            <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma conexão configurada</h3>
            <p className="text-muted-foreground mb-4">
              Configure conexões com bancos de dados PostgreSQL ou MySQL
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
