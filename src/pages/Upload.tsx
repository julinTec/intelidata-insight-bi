import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileUploader } from "@/components/ui/FileUploader";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Upload as UploadIcon, FileSpreadsheet, ArrowRight, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export default function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataSourceName, setDataSourceName] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Load projects on mount
  useState(() => {
    if (user) {
      supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data) setProjects(data);
        });
    }
  });

  const parseCSV = (text: string): ParsedData => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || "";
      });
      return row;
    });
    return { headers, rows, rowCount: rows.length };
  };

  const parseExcel = async (file: File): Promise<ParsedData> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    
    if (jsonData.length === 0) {
      return { headers: [], rows: [], rowCount: 0 };
    }
    
    const headers = Object.keys(jsonData[0]);
    return { headers, rows: jsonData, rowCount: jsonData.length };
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setDataSourceName(selectedFile.name.replace(/\.[^/.]+$/, ""));

    try {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      
      let data: ParsedData;
      if (ext === "csv") {
        const text = await selectedFile.text();
        data = parseCSV(text);
      } else if (ext === "xlsx" || ext === "xls") {
        data = await parseExcel(selectedFile);
      } else {
        throw new Error("Formato não suportado");
      }
      
      setParsedData(data);
      toast.success(`Arquivo processado: ${data.rowCount} linhas`);
    } catch (error) {
      toast.error("Erro ao processar arquivo");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !file || !parsedData || !selectedProject) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("data-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("data-files")
        .getPublicUrl(filePath);

      // Create data source record
      const { error: dbError } = await supabase.from("data_sources").insert({
        user_id: user.id,
        project_id: selectedProject,
        name: dataSourceName || file.name,
        source_type: file.name.endsWith(".csv") ? "csv" : "excel",
        file_url: publicUrl,
        schema_info: { columns: parsedData.headers },
        row_count: parsedData.rowCount,
      });

      if (dbError) throw dbError;

      toast.success("Dados salvos com sucesso!");
      navigate("/analyses");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar dados");
    } finally {
      setSaving(false);
    }
  };

  const columns = parsedData?.headers.map((h) => ({ key: h, label: h })) || [];

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <UploadIcon className="h-8 w-8 text-primary" />
            Upload de Dados
          </h1>
          <p className="text-muted-foreground mt-2">
            Importe seus dados de planilhas CSV ou Excel para análise
          </p>
        </div>

        {/* Upload Section */}
        {!parsedData && (
          <div className="glass-card rounded-xl p-8">
            <FileUploader onFileSelect={handleFileSelect} />
            {loading && (
              <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando arquivo...
              </div>
            )}
          </div>
        )}

        {/* Preview Section */}
        {parsedData && (
          <>
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold">{file?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.rowCount} linhas • {parsedData.headers.length} colunas
                  </p>
                </div>
              </div>

              <DataTable 
                columns={columns} 
                data={parsedData.rows.slice(0, 100)} 
                pageSize={10}
              />
            </div>

            {/* Save Section */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold mb-4">Configurar Data Source</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Data Source</Label>
                  <Input
                    id="name"
                    value={dataSourceName}
                    onChange={(e) => setDataSourceName(e.target.value)}
                    placeholder="Ex: Vendas 2024"
                    className="input-dark"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project">Projeto</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="input-dark">
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setParsedData(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !selectedProject}
                  className="btn-gradient"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      Salvar e Continuar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
