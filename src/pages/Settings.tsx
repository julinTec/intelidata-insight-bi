import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { 
  Settings as SettingsIcon, 
  User, 
  Eye, 
  Code2, 
  Palette,
  Download,
  Loader2,
  Save,
  Moon,
  Sun
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [preferences, setPreferences] = useState({
    defaultViewMode: "executive" as "executive" | "analyst",
    exportFormat: "xlsx" as "xlsx" | "csv" | "pdf",
  });

  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setLoadingPrefs(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences({
            defaultViewMode: data.default_view_mode as "executive" | "analyst",
            exportFormat: data.export_format as "xlsx" | "csv" | "pdf",
          });
          // Sync theme from database
          setTheme(data.dark_mode ? "dark" : "light");
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      } finally {
        setLoadingPrefs(false);
      }
    };

    loadPreferences();
  }, [user, setTheme]);

  // Save a single preference to database
  const savePreference = async (key: string, value: unknown) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            [key]: value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      toast.success("Preferência salva!");
    } catch (error) {
      console.error("Error saving preference:", error);
      toast.error("Erro ao salvar preferência");
    }
  };

  const handleViewModeChange = (mode: "executive" | "analyst") => {
    setPreferences({ ...preferences, defaultViewMode: mode });
    savePreference("default_view_mode", mode);
  };

  const handleThemeChange = (isDark: boolean) => {
    setTheme(isDark ? "dark" : "light");
    savePreference("dark_mode", isDark);
  };

  const handleExportFormatChange = (format: "xlsx" | "csv" | "pdf") => {
    setPreferences({ ...preferences, exportFormat: format });
    savePreference("export_format", format);
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      toast.success("Perfil atualizado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seu perfil e preferências
          </p>
        </div>

        {/* Profile Section */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Perfil</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="input-dark bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="input-dark"
              />
            </div>

            <Button onClick={saveProfile} disabled={saving} className="btn-gradient">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Perfil
                </>
              )}
            </Button>
          </div>
        </div>

        {/* View Mode Section */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Modo de Visualização Padrão</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Modo Executivo</p>
                  <p className="text-sm text-muted-foreground">
                    Visualização simplificada com KPIs e gráficos principais
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.defaultViewMode === "executive"}
                onCheckedChange={() => handleViewModeChange("executive")}
                disabled={loadingPrefs}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Code2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Modo Analista</p>
                  <p className="text-sm text-muted-foreground">
                    Visualização detalhada com código SQL/DAX e mais opções
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.defaultViewMode === "analyst"}
                onCheckedChange={() => handleViewModeChange("analyst")}
                disabled={loadingPrefs}
              />
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Aparência</h3>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium">Modo Escuro</p>
                <p className="text-sm text-muted-foreground">
                  Interface otimizada para ambientes com pouca luz
                </p>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => handleThemeChange(checked)}
              disabled={loadingPrefs}
            />
          </div>
        </div>

        {/* Export Section */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Download className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Exportação</h3>
          </div>

          <div className="space-y-2">
            <Label>Formato Padrão de Exportação</Label>
            <div className="flex gap-3">
              {(["xlsx", "csv", "pdf"] as const).map((format) => (
                <Button
                  key={format}
                  variant={preferences.exportFormat === format ? "default" : "outline"}
                  onClick={() => handleExportFormatChange(format)}
                  className={preferences.exportFormat === format ? "btn-gradient" : ""}
                  disabled={loadingPrefs}
                >
                  {format.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Danger Zone */}
        <div className="glass-card rounded-xl p-6 border-destructive/30">
          <h3 className="font-semibold text-destructive mb-4">Zona de Perigo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ações irreversíveis. Tenha cuidado ao usar estas opções.
          </p>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm("Tem certeza que deseja excluir sua conta? Esta ação é IRREVERSÍVEL e apagará todos os seus dados.")) return;
              if (!confirm("ÚLTIMA CONFIRMAÇÃO: Todos os seus projetos, análises e dashboards serão apagados permanentemente. Continuar?")) return;
              
              try {
                const { error } = await supabase.functions.invoke("delete-account");
                if (error) throw error;
                toast.success("Conta excluída com sucesso.");
                await supabase.auth.signOut();
                window.location.href = "/auth";
              } catch (error) {
                console.error(error);
                toast.error("Erro ao excluir conta. Tente novamente.");
              }
            }}
          >
            Excluir Conta
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
