import { useState } from "react";
import { Copy, Check, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SQLViewerProps {
  code: string;
  language?: "sql" | "dax";
  title?: string;
  className?: string;
}

export function SQLViewer({ code, language = "sql", title, className }: SQLViewerProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting for SQL/DAX
  const highlightCode = (code: string) => {
    const keywords = language === "sql" 
      ? /\b(SELECT|FROM|WHERE|AND|OR|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|WITH|UNION|ALL|IN|NOT|NULL|IS|LIKE|BETWEEN|EXISTS)\b/gi
      : /\b(CALCULATE|FILTER|ALL|ALLEXCEPT|RELATED|RELATEDTABLE|SUMX|AVERAGEX|COUNTROWS|DISTINCTCOUNT|DIVIDE|IF|SWITCH|TRUE|FALSE|BLANK|VAR|RETURN|DATESYTD|DATEADD|TOTALYTD|SAMEPERIODLASTYEAR|PREVIOUSMONTH|PREVIOUSYEAR)\b/gi;
    
    const functions = /\b(COALESCE|CAST|CONVERT|DATEPART|DATEDIFF|GETDATE|NOW|TODAY|YEAR|MONTH|DAY|FORMAT)\b/gi;
    const numbers = /\b(\d+\.?\d*)\b/g;
    const strings = /('[^']*'|"[^"]*")/g;
    const comments = /(--[^\n]*|\/\*[\s\S]*?\*\/)/g;

    return code
      .replace(comments, '<span class="text-muted-foreground italic">$1</span>')
      .replace(strings, '<span class="text-chart-4">$1</span>')
      .replace(keywords, '<span class="text-primary font-semibold">$1</span>')
      .replace(functions, '<span class="text-chart-2">$1</span>')
      .replace(numbers, '<span class="text-chart-3">$1</span>');
  };

  return (
    <div className={cn("rounded-xl border border-border overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <span className="text-xs text-muted-foreground uppercase">{language}</span>
        </div>
      )}
      
      <div className="relative">
        <pre className="p-4 overflow-x-auto bg-card">
          <code 
            className="font-mono text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
          />
        </pre>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={copyToClipboard}
          className="absolute top-2 right-2 h-8 w-8 bg-muted/80 hover:bg-muted"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
