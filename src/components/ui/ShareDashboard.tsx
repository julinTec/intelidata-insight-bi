import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Share2, Copy, ExternalLink, Loader2, Check } from "lucide-react";

import type { Json } from "@/integrations/supabase/types";

interface ShareDashboardProps {
  projectId: string;
  projectName: string;
  widgetIds: string[];
  filterConfig?: Json;
}

export function ShareDashboard({
  projectId,
  projectName,
  widgetIds,
  filterConfig = {},
}: ShareDashboardProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState(`Dashboard - ${projectName}`);

  const generateShareLink = async () => {
    if (!user || widgetIds.length === 0) {
      toast.error("Nenhum widget para compartilhar");
      return;
    }

    setLoading(true);
    try {
      // Generate unique token
      const shareToken = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

      // Save to database
      const { error } = await supabase.from("shared_dashboards").insert([{
        user_id: user.id,
        project_id: projectId,
        share_token: shareToken,
        title: title,
        widget_ids: widgetIds,
        filter_config: filterConfig,
        is_active: true,
      }]);

      if (error) throw error;

      // Generate public URL
      const baseUrl = window.location.origin;
      const publicUrl = `${baseUrl}/public/dashboard/${shareToken}`;
      setShareUrl(publicUrl);

      toast.success("Link de compartilhamento criado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar link de compartilhamento");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  const openInNewTab = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Dashboard</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!shareUrl ? (
            <>
              <div className="space-y-2">
                <Label>Título do Dashboard Público</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome do dashboard..."
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>
                  Ao compartilhar, será gerado um link público que permite visualizar
                  este dashboard sem necessidade de login.
                </p>
                <p className="mt-2">
                  <strong>Widgets incluídos:</strong> {widgetIds.length}
                </p>
              </div>

              <Button 
                onClick={generateShareLink} 
                disabled={loading || widgetIds.length === 0}
                className="w-full btn-gradient"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Gerando link...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Gerar Link Público
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Link Público</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="flex-1" />
                  <Button variant="outline" size="icon" onClick={copyToClipboard}>
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="icon" onClick={openInNewTab}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-sm">
                <p className="text-success font-medium">Link criado com sucesso!</p>
                <p className="text-muted-foreground mt-1">
                  Qualquer pessoa com este link poderá visualizar o dashboard.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setShareUrl(null);
                  setTitle(`Dashboard - ${projectName}`);
                }}
                className="w-full"
              >
                Gerar Novo Link
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
