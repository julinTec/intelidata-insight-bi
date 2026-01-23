import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FilterField {
  name: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
}

interface DynamicFilterConfig {
  fields: string[];
  layout: "horizontal" | "vertical";
}

interface DynamicFilterProps {
  title: string;
  dataSourceId: string;
  config: DynamicFilterConfig;
  filters: Record<string, unknown>;
  onFiltersChange: (filters: Record<string, unknown>) => void;
  schemaInfo?: { columns?: Array<{ name: string; type: string }> } | null;
  data?: Record<string, unknown>[];
}

function formatLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function isDateString(value: string): boolean {
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY
    /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
  ];
  return datePatterns.some((pattern) => pattern.test(value));
}

function getUniqueValues(
  data: Record<string, unknown>[],
  field: string
): string[] {
  const values = new Set<string>();
  data.forEach((row) => {
    const value = row[field];
    if (value !== null && value !== undefined && value !== "") {
      values.add(String(value));
    }
  });
  return Array.from(values).sort().slice(0, 50);
}

function detectFieldType(
  field: string,
  schemaInfo: DynamicFilterProps["schemaInfo"],
  data: Record<string, unknown>[]
): FilterField {
  // Check schema first
  const column = schemaInfo?.columns?.find((c) => c.name === field);
  if (column) {
    const type = column.type.toLowerCase();
    if (type.includes("int") || type.includes("float") || type.includes("numeric") || type.includes("decimal")) {
      return { name: field, type: "number" };
    }
    if (type.includes("date") || type.includes("time")) {
      return { name: field, type: "date" };
    }
  }

  // Infer from data
  const sampleValues = data
    .slice(0, 100)
    .map((row) => row[field])
    .filter((v) => v !== null && v !== undefined);

  if (sampleValues.length === 0) {
    return { name: field, type: "text" };
  }

  // Check if all values are numbers
  const allNumbers = sampleValues.every(
    (v) => typeof v === "number" || !isNaN(Number(v))
  );
  if (allNumbers) {
    return { name: field, type: "number" };
  }

  // Check if values look like dates
  const allDates = sampleValues.every(
    (v) => typeof v === "string" && isDateString(v)
  );
  if (allDates) {
    return { name: field, type: "date" };
  }

  // Check if it should be a select (limited unique values)
  const uniqueValues = getUniqueValues(data, field);
  if (uniqueValues.length <= 20 && uniqueValues.length > 0) {
    return { name: field, type: "select", options: uniqueValues };
  }

  return { name: field, type: "text" };
}

export function DynamicFilter({
  title,
  config,
  filters,
  onFiltersChange,
  schemaInfo,
  data = [],
}: DynamicFilterProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, unknown>>(filters);

  // Sync with external filters
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Detect field types
  const filterFields = useMemo(() => {
    return config.fields.map((field) => detectFieldType(field, schemaInfo, data));
  }, [config.fields, schemaInfo, data]);

  const handleFilterChange = (field: string, value: unknown) => {
    const newFilters = { ...localFilters };
    if (value === null || value === undefined || value === "" || value === "all") {
      delete newFilters[field];
      delete newFilters[`${field}_from`];
      delete newFilters[`${field}_to`];
      delete newFilters[`${field}_min`];
      delete newFilters[`${field}_max`];
    } else {
      newFilters[field] = value;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleRangeChange = (field: string, suffix: string, value: unknown) => {
    const newFilters = { ...localFilters };
    const key = `${field}_${suffix}`;
    if (value === null || value === undefined || value === "") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setLocalFilters({});
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(localFilters).length;

  const renderFilterInput = (field: FilterField) => {
    const label = formatLabel(field.name);

    switch (field.type) {
      case "select":
        return (
          <div key={field.name} className="space-y-1.5 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Select
              value={(localFilters[field.name] as string) || "all"}
              onValueChange={(value) => handleFilterChange(field.name, value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "number":
        return (
          <div key={field.name} className="space-y-1.5 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Mín"
                className="h-9 w-20"
                value={(localFilters[`${field.name}_min`] as string) || ""}
                onChange={(e) =>
                  handleRangeChange(field.name, "min", e.target.value)
                }
              />
              <Input
                type="number"
                placeholder="Máx"
                className="h-9 w-20"
                value={(localFilters[`${field.name}_max`] as string) || ""}
                onChange={(e) =>
                  handleRangeChange(field.name, "max", e.target.value)
                }
              />
            </div>
          </div>
        );

      case "date":
        return (
          <div key={field.name} className="space-y-1.5 min-w-[280px]">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-[130px] justify-start text-left font-normal",
                      !localFilters[`${field.name}_from`] && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {localFilters[`${field.name}_from`]
                      ? format(
                          new Date(localFilters[`${field.name}_from`] as string),
                          "dd/MM/yyyy"
                        )
                      : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      localFilters[`${field.name}_from`]
                        ? new Date(localFilters[`${field.name}_from`] as string)
                        : undefined
                    }
                    onSelect={(date) =>
                      handleRangeChange(
                        field.name,
                        "from",
                        date ? date.toISOString() : null
                      )
                    }
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-[130px] justify-start text-left font-normal",
                      !localFilters[`${field.name}_to`] && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {localFilters[`${field.name}_to`]
                      ? format(
                          new Date(localFilters[`${field.name}_to`] as string),
                          "dd/MM/yyyy"
                        )
                      : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      localFilters[`${field.name}_to`]
                        ? new Date(localFilters[`${field.name}_to`] as string)
                        : undefined
                    }
                    onSelect={(date) =>
                      handleRangeChange(
                        field.name,
                        "to",
                        date ? date.toISOString() : null
                      )
                    }
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      default: // text
        return (
          <div key={field.name} className="space-y-1.5 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
              type="text"
              placeholder={`Buscar ${label.toLowerCase()}...`}
              className="h-9"
              value={(localFilters[field.name] as string) || ""}
              onChange={(e) => handleFilterChange(field.name, e.target.value)}
            />
          </div>
        );
    }
  };

  if (filterFields.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum campo de filtro configurado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} ativo{activeFilterCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className={cn(
            config.layout === "horizontal"
              ? "flex flex-wrap gap-4 items-end"
              : "space-y-4"
          )}
        >
          {filterFields.map(renderFilterInput)}
        </div>
      </CardContent>
    </Card>
  );
}
