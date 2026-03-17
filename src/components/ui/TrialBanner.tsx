import { Clock, Zap } from 'lucide-react';
import { Button } from './button';
import { PAYMENT_URL, PLAN_PRICE } from '@/config/constants';
import { cn } from '@/lib/utils';

interface TrialBannerProps {
  hoursRemaining: number;
}

export function TrialBanner({ hoursRemaining }: TrialBannerProps) {
  const isUrgent = hoursRemaining <= 6;
  const isCritical = hoursRemaining <= 1;

  const formatTime = () => {
    if (hoursRemaining >= 1) {
      const h = Math.floor(hoursRemaining);
      const m = Math.round((hoursRemaining - h) * 60);
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    const minutes = Math.round(hoursRemaining * 60);
    return `${minutes} min`;
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
        isCritical
          ? 'bg-destructive/15 text-destructive border-b border-destructive/20'
          : isUrgent
          ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-b border-yellow-500/20'
          : 'bg-primary/5 text-muted-foreground border-b border-border'
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>
          {isCritical
            ? `⚠️ Seu teste grátis expira em ${formatTime()}!`
            : `Seu teste grátis termina em ${formatTime()}`}
        </span>
      </div>
      <Button
        size="sm"
        variant={isCritical ? 'destructive' : 'default'}
        className="h-7 text-xs gap-1"
        onClick={() => window.open(PAYMENT_URL, '_blank')}
      >
        <Zap className="h-3 w-3" />
        Assinar por {PLAN_PRICE}
      </Button>
    </div>
  );
}
