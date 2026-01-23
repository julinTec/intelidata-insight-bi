import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportButton } from "@/components/ui/ExportButton";
import { applyFilters } from "@/components/ui/DashboardFilters";
import { useDataSource } from "@/hooks/useDataSource";
import { Loader2, Table as TableIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DynamicTableProps {
  title: string;
  dataSourceId: string;
  config: {
    columns?: string[];
    pageSize?: number;
  };
  filters?: Record<string, unknown>;
  onDataLoaded?: (data: Record<string, unknown>[]) => void;
}

export function DynamicTable({
  title,
  dataSourceId,
  config,
  filters = {},
  onDataLoaded,
}: DynamicTableProps) {
  const { fetchData } = useDataSource();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = config.pageSize || 10;

  useEffect(() => {
    const loadData = async () => {
      if (!dataSourceId) {
        setError("Fonte de dados não configurada");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchData(dataSourceId);
        setData(result);
        setError(null);
      } catch (err) {
        console.error("Error loading table data:", err);
        setError("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataSourceId, fetchData]);

  // Apply filters
  const filteredData = applyFilters(data, filters);

  // Notify parent about loaded data (for global export)
  useEffect(() => {
    if (onDataLoaded && filteredData.length > 0) {
      onDataLoaded(filteredData);
    }
  }, [filteredData, onDataLoaded]);

  // Get columns to display
  const allColumns = data.length > 0 ? Object.keys(data[0]) : [];
  const columnsToShow =
    config.columns && config.columns.length > 0
      ? config.columns.filter((col) => allColumns.includes(col))
      : allColumns;

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") {
      return value.toLocaleString("pt-BR");
    }
    if (typeof value === "boolean") {
      return value ? "Sim" : "Não";
    }
    if (value instanceof Date) {
      return value.toLocaleDateString("pt-BR");
    }
    return String(value);
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <TableIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredData.length} registros
          </p>
        </div>
        <ExportButton data={filteredData} filename={title} />
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="text-center py-8">
            <TableIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum dado encontrado
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columnsToShow.map((column) => (
                      <TableHead key={column} className="whitespace-nowrap">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columnsToShow.map((column) => (
                        <TableCell
                          key={column}
                          className="whitespace-nowrap max-w-[200px] truncate"
                          title={formatValue(row[column])}
                        >
                          {formatValue(row[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Select
                    value={String(currentPage)}
                    onValueChange={(v) => setCurrentPage(Number(v))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
