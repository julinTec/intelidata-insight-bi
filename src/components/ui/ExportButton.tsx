import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename?: string;
  sheetName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ExportButton({
  data,
  filename = "export",
  sheetName = "Dados",
  variant = "outline",
  size = "sm",
  className,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) return;

    setExporting(true);
    try {
      // Create worksheet from data
      const ws = XLSX.utils.json_to_sheet(data);

      // Auto-adjust column widths
      const colWidths = Object.keys(data[0] || {}).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...data.map((row) => String(row[key] ?? "").length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      ws["!cols"] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const fullFilename = `${filename}-${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fullFilename);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={exporting || !data || data.length === 0}
      className={className}
    >
      {exporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Exportando...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Exportar XLSX
        </>
      )}
    </Button>
  );
}
