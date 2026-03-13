import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/DataTable";
import { ExportButton } from "@/components/ui/ExportButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDataSource } from "@/hooks/useDataSource";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  FolderKanban,
  Database,
  Plus,
  Trash2,
  BarChart3,
  Eye,
  FileSpreadsheet,
  Upload,
  LayoutDashboard,
  Pencil,
  Save,
  X,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Project {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string | null;
}

interface DataSourceItem {
  id: string;
  name: string;
  source_type: string;
  row_count: number | null;
  schema_info: Json | null;
  file_url: string | null;
  created_at: string;
}

const categories = [
  { value: "financial", label: "Financeiro" },
  { value: "revenue", label: "Receitas" },
  { value: "costs", label: "Custos" },
  { value: "indicators", label: "Indicadores" },
  { value: "budget", label: "Orçamento" },
  { value: "general", label: "Geral" },
];

const statuses = [
  { value: "active", label: "Ativo" },
  { value: "archived", label: "Arquivado" },
  { value: "in_progress", label: "Em Andamento" },
];

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchData } = useDataSource();

  const [project, setProject] = useState<Project | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewSource, setPreviewSource] = useState<DataSourceItem | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSourceItem | null>(null);
  const [editSourceName, setEditSourceName] = useState("");
  const [savingSource, setSavingSource] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "general",
    status: "active",
  });

  const loadProject = useCallback(async () => {
    if (!user || !id) return;

    try {
      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (projectError || !projectData) {
        toast.error("Projeto não encontrado");
        navigate("/projects");
        return;
      }

      setProject(projectData);
      setFormData({
        name: projectData.name,
        description: projectData.description || "",
        category: projectData.category || "general",
        status: projectData.status || "active",
      });

      // Load data sources
      const { data: sourcesData } = await supabase
        .from("data_sources")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });

      setDataSources((sourcesData as DataSourceItem[]) || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar projeto");
    } finally {
      setLoading(false);
    }
  }, [user, id, navigate]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleSave = async () => {
    if (!project) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          status: formData.status,
        })
        .eq("id", project.id);

      if (error) throw error;

      setProject({ ...project, ...formData });
      setEditing(false);
      toast.success("Projeto atualizado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta fonte de dados?")) return;

    try {
      const { error } = await supabase.from("data_sources").delete().eq("id", sourceId);
      if (error) throw error;

      setDataSources(dataSources.filter((s) => s.id !== sourceId));
      toast.success("Fonte de dados excluída!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir fonte de dados");
    }
  };

  const handleEditSource = async () => {
    if (!editingSource || !editSourceName.trim()) return;
    setSavingSource(true);
    try {
      const { error } = await supabase
        .from("data_sources")
        .update({ name: editSourceName })
        .eq("id", editingSource.id);
      if (error) throw error;
      setDataSources(dataSources.map((s) =>
        s.id === editingSource.id ? { ...s, name: editSourceName } : s
      ));
      setEditingSource(null);
      toast.success("Fonte de dados renomeada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao renomear fonte de dados");
    } finally {
      setSavingSource(false);
    }
  };

  const handlePreview = async (source: DataSourceItem) => {
    setPreviewSource(source);
    setLoadingPreview(true);
    
    try {
      const data = await fetchData(source.id);
      setPreviewData(data.slice(0, 100)); // Limit preview to 100 rows
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const getColumns = (data: Record<string, unknown>[]) => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).map((key) => ({
      key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      sortable: true,
    }));
  };

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
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div>
                {editing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="text-2xl font-bold h-auto py-1"
                  />
                ) : (
                  <h1 className="text-2xl font-bold">{project.name}</h1>
                )}
                <p className="text-sm text-muted-foreground">
                  {categories.find((c) => c.value === project.category)?.label || "Geral"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="btn-gradient">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Link to={`/projects/${project.id}/dashboard`}>
                  <Button className="btn-gradient">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Ver Dashboard
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="glass-card rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o projeto..."
                  className="input-dark resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="input-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="input-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description (view mode) */}
        {!editing && project.description && (
          <div className="glass-card rounded-xl p-6">
            <p className="text-muted-foreground">{project.description}</p>
          </div>
        )}

        {/* Data Sources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Fontes de Dados ({dataSources.length})
            </h2>
            <Link to={`/upload?project=${project.id}`}>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Fonte
              </Button>
            </Link>
          </div>

          {dataSources.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma fonte de dados</h3>
              <p className="text-muted-foreground mb-4">
                Adicione arquivos CSV, Excel ou conecte uma API
              </p>
              <Link to={`/upload?project=${project.id}`}>
                <Button className="btn-gradient">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload de Dados
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataSources.map((source) => (
                <div key={source.id} className="glass-card rounded-xl p-4 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{source.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {source.source_type.toUpperCase()} • {source.row_count ?? "?"} registros
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingSource(source);
                          setEditSourceName(source.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteSource(source.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreview(source)}>
                      <Eye className="h-3 w-3 mr-1" />
                      Visualizar
                    </Button>
                    <Link to={`/analyses?project=${project.id}&source=${source.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Analisar
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to={`/analyses?project=${project.id}`} className="block">
            <div className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all cursor-pointer">
              <BarChart3 className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Análise com IA</h3>
              <p className="text-sm text-muted-foreground">
                Gere insights e KPIs automaticamente
              </p>
            </div>
          </Link>
          <Link to={`/projects/${project.id}/dashboard`} className="block">
            <div className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all cursor-pointer">
              <LayoutDashboard className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Visualize seus dados em tempo real
              </p>
            </div>
          </Link>
          <Link to={`/upload?project=${project.id}`} className="block">
            <div className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all cursor-pointer">
              <Upload className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Adicionar Dados</h3>
              <p className="text-sm text-muted-foreground">
                Upload CSV, Excel ou conecte API
              </p>
            </div>
          </Link>
        </div>

        {/* Data Preview Dialog */}
        <Dialog open={!!previewSource} onOpenChange={() => setPreviewSource(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>Preview: {previewSource?.name}</DialogTitle>
              {previewData.length > 0 && (
                <ExportButton data={previewData} filename={previewSource?.name || "export"} />
              )}
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : previewData.length > 0 ? (
                <DataTable
                  columns={getColumns(previewData)}
                  data={previewData}
                  searchable
                  pageSize={20}
                />
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
