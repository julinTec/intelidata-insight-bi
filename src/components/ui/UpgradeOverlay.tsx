import { Lock, Zap, MessageCircle, BarChart3, Brain, Share2 } from 'lucide-react';
import { Button } from './button';
import { PAYMENT_URL, SUPPORT_URL, PLAN_PRICE, PRODUCT_NAME } from '@/config/constants';

export function UpgradeOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-border bg-card p-8 shadow-2xl text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-primary" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Continue usando o {PRODUCT_NAME}
          </h2>
          <p className="text-muted-foreground">
            Seu teste grátis expirou. Assine para continuar criando dashboards,
            gerando insights com IA e compartilhando análises.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Dashboards ilimitados</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50">
            <Brain className="h-5 w-5 text-primary" />
            <span>Análises com IA</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50">
            <Share2 className="h-5 w-5 text-primary" />
            <span>Compartilhar relatórios</span>
          </div>
        </div>

        {/* Price */}
        <div className="py-2">
          <span className="text-4xl font-bold text-foreground">R$29,90</span>
          <span className="text-muted-foreground">/mês</span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={() => window.open(PAYMENT_URL, '_blank')}
          >
            <Zap className="h-5 w-5" />
            Assinar agora por {PLAN_PRICE}
          </Button>
          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => window.open(SUPPORT_URL, '_blank')}
          >
            <MessageCircle className="h-4 w-4" />
            Falar com suporte
          </Button>
        </div>
      </div>
    </div>
  );
}
