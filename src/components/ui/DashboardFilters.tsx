import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X, CalendarIcon, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FilterConfig {
  field: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
}

interface DashboardFiltersProps {
  schemaInfo?: { columns?: Array<{ name: string; type: string }> } | null;
  data?: Record<string, unknown>[];
  filters: Record<string, unknown>;
  onFiltersChange: (filters: Record<string, unknown>) => void;
  className?: string;
}

export function DashboardFilters({
  schemaInfo,
  data = [],
  filters,
  onFiltersChange,
  className,
}: DashboardFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-detect filter configurations from schema and data
  const filterConfigs = useMemo((): FilterConfig[] => {
    const configs: FilterConfig[] = [];
    
    if (schemaInfo?.columns) {
      for (const col of schemaInfo.columns) {
        const colName = col.name;
        const colType = col.type?.toLowerCase() || "";

        // Skip common non-filterable columns
        if (["id", "user_id", "created_at", "updated_at"].includes(colName)) continue;

        // Detect type and generate config
        if (colType.includes("date") || colType.includes("timestamp") || colName.toLowerCase().includes("date")) {
          configs.push({
            field: colName,
            label: formatLabel(colName),
            type: "date",
          });
        } else if (colType.includes("int") || colType.includes("float") || colType.includes("numeric") || colType.includes("decimal")) {
          configs.push({
            field: colName,
            label: formatLabel(colName),
            type: "number",
          });
        } else if (colType.includes("bool")) {
          configs.push({
            field: colName,
            label: formatLabel(colName),
            type: "select",
            options: ["true", "false"],
          });
        } else {
          // For text fields, check if we can make it a select
          const uniqueValues = getUniqueValues(data, colName);
          if (uniqueValues.length > 0 && uniqueValues.length <= 20) {
            configs.push({
              field: colName,
              label: formatLabel(colName),
              type: "select",
              options: uniqueValues,
            });
          } else {
            configs.push({
              field: colName,
              label: formatLabel(colName),
              type: "text",
            });
          }
        }
      }
    } else if (data.length > 0) {
      // Fallback: infer from data
      const sample = data[0];
      for (const key of Object.keys(sample)) {
        if (["id", "user_id", "created_at", "updated_at"].includes(key)) continue;
        
        const value = sample[key];
        const uniqueValues = getUniqueValues(data, key);

        if (typeof value === "number") {
          configs.push({ field: key, label: formatLabel(key), type: "number" });
        } else if (value instanceof Date || (typeof value === "string" && isDateString(value))) {
          configs.push({ field: key, label: formatLabel(key), type: "date" });
        } else if (uniqueValues.length > 0 && uniqueValues.length <= 20) {
          configs.push({ field: key, label: formatLabel(key), type: "select", options: uniqueValues });
        } else {
          configs.push({ field: key, label: formatLabel(key), type: "text" });
        }
      }
    }

    return configs.slice(0, 8); // Limit to 8 filters
  }, [schemaInfo, data]);

  const handleFilterChange = (field: string, value: unknown) => {
    const newFilters = { ...filters };
    if (value === "" || value === null || value === undefined || value === "all") {
      delete newFilters[field];
    } else {
      newFilters[field] = value;
    }
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).length;

  if (filterConfigs.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-[400px] overflow-y-auto" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {filterConfigs.map((config) => (
              <div key={config.field} className="space-y-2">
                <Label className="text-sm">{config.label}</Label>
                {config.type === "text" && (
                  <Input
                    placeholder={`Filtrar por ${config.label.toLowerCase()}...`}
                    value={(filters[config.field] as string) || ""}
                    onChange={(e) => handleFilterChange(config.field, e.target.value)}
                    className="h-8"
                  />
                )}
                {config.type === "number" && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={(filters[`${config.field}_min`] as string) || ""}
                      onChange={(e) => handleFilterChange(`${config.field}_min`, e.target.value)}
                      className="h-8"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={(filters[`${config.field}_max`] as string) || ""}
                      onChange={(e) => handleFilterChange(`${config.field}_max`, e.target.value)}
                      className="h-8"
                    />
                  </div>
                )}
                {config.type === "select" && config.options && (
                  <Select
                    value={(filters[config.field] as string) || "all"}
                    onValueChange={(value) => handleFilterChange(config.field, value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {config.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {config.type === "date" && (
                  <DateRangeFilter
                    field={config.field}
                    filters={filters}
                    onChange={handleFilterChange}
                  />
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filters chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(filters).map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
            >
              {formatLabel(key.replace(/_min|_max|_from|_to/, ""))}: {String(value)}
              <button
                onClick={() => handleFilterChange(key, null)}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DateRangeFilter({
  field,
  filters,
  onChange,
}: {
  field: string;
  filters: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}) {
  const fromDate = filters[`${field}_from`] ? new Date(filters[`${field}_from`] as string) : undefined;
  const toDate = filters[`${field}_to`] ? new Date(filters[`${field}_to`] as string) : undefined;

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 flex-1 justify-start text-left font-normal">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {fromDate ? format(fromDate, "dd/MM/yy") : "De"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fromDate}
            onSelect={(date) => onChange(`${field}_from`, date?.toISOString())}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 flex-1 justify-start text-left font-normal">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {toDate ? format(toDate, "dd/MM/yy") : "Até"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={toDate}
            onSelect={(date) => onChange(`${field}_to`, date?.toISOString())}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Helpers
function formatLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function getUniqueValues(data: Record<string, unknown>[], field: string): string[] {
  const values = new Set<string>();
  for (const row of data) {
    const val = row[field];
    if (val !== null && val !== undefined && val !== "") {
      values.add(String(val));
    }
  }
  return Array.from(values).sort();
}

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

// Helper to apply filters to data
export function applyFilters(
  data: Record<string, unknown>[],
  filters: Record<string, unknown>
): Record<string, unknown>[] {
  if (!filters || Object.keys(filters).length === 0) return data;

  return data.filter((row) => {
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === "" || value === "all") continue;

      // Handle range filters
      if (key.endsWith("_min")) {
        const field = key.replace("_min", "");
        const rowValue = Number(row[field]);
        if (!isNaN(rowValue) && rowValue < Number(value)) return false;
      } else if (key.endsWith("_max")) {
        const field = key.replace("_max", "");
        const rowValue = Number(row[field]);
        if (!isNaN(rowValue) && rowValue > Number(value)) return false;
      } else if (key.endsWith("_from")) {
        const field = key.replace("_from", "");
        const rowDate = new Date(row[field] as string);
        const filterDate = new Date(value as string);
        if (rowDate < filterDate) return false;
      } else if (key.endsWith("_to")) {
        const field = key.replace("_to", "");
        const rowDate = new Date(row[field] as string);
        const filterDate = new Date(value as string);
        if (rowDate > filterDate) return false;
      } else {
        // Text/select filter
        const rowValue = String(row[key] ?? "").toLowerCase();
        const filterValue = String(value).toLowerCase();
        if (!rowValue.includes(filterValue)) return false;
      }
    }
    return true;
  });
}
