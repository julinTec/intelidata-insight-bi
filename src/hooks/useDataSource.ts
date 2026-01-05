import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface ConnectionConfig {
  url?: string;
  dataPath?: string | null;
}

interface DataSource {
  id: string;
  name: string;
  source_type: string;
  schema_info: Json | null;
  row_count: number | null;
  connection_config: Json | null;
  project_id: string;
}

interface UseDataSourceResult {
  data: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  fetchData: (dataSource: DataSource) => Promise<Record<string, unknown>[]>;
  getDataSource: (dataSourceId: string) => Promise<DataSource | null>;
}

export function useDataSource(): UseDataSourceResult {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractDataFromPath = (jsonData: unknown, dataPath: string | null | undefined): unknown => {
    if (!dataPath) return jsonData;
    return dataPath.split('.').reduce((obj: unknown, key: string) => {
      if (obj && typeof obj === 'object' && key in obj) {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, jsonData);
  };

  const findArrayPaths = (obj: unknown, path = ""): { path: string; length: number }[] => {
    const results: { path: string; length: number }[] = [];
    
    if (Array.isArray(obj) && obj.length > 0) {
      results.push({ path: path || "(root)", length: obj.length });
    }
    
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;
        results.push(...findArrayPaths(value, newPath));
      }
    }
    
    return results;
  };

  const fetchData = useCallback(async (dataSource: DataSource): Promise<Record<string, unknown>[]> => {
    setLoading(true);
    setError(null);

    try {
      if (dataSource.source_type !== "api_json") {
        throw new Error("Apenas fontes API JSON são suportadas no momento");
      }

      const config = dataSource.connection_config as ConnectionConfig | null;
      if (!config?.url) {
        throw new Error("URL não configurada para esta fonte de dados");
      }

      console.log("[useDataSource] Fetching data from:", config.url);
      console.log("[useDataSource] Using dataPath:", config.dataPath);

      const response = await fetch(config.url);
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: HTTP ${response.status}`);
      }

      const jsonData = await response.json();
      let extractedData = extractDataFromPath(jsonData, config.dataPath);

      if (extractedData === undefined) {
        throw new Error(`Caminho "${config.dataPath}" não encontrado nos dados`);
      }

      // Auto-detect arrays within objects
      if (!Array.isArray(extractedData) && typeof extractedData === "object" && extractedData !== null) {
        const paths = findArrayPaths(extractedData);
        console.log("[useDataSource] Auto-detected array paths:", paths);

        if (paths.length > 0) {
          const bestPath = paths.reduce((a, b) => a.length > b.length ? a : b);
          const fullPath = config.dataPath
            ? `${config.dataPath}.${bestPath.path}`
            : bestPath.path;

          console.log(`[useDataSource] Using auto-detected path: "${fullPath}" with ${bestPath.length} records`);
          extractedData = extractDataFromPath(jsonData, fullPath);
        }
      }

      const records = Array.isArray(extractedData) ? extractedData : [extractedData];
      console.log("[useDataSource] Records fetched:", records.length);

      setData(records as Record<string, unknown>[]);
      return records as Record<string, unknown>[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      console.error("[useDataSource] Error:", errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getDataSource = useCallback(async (dataSourceId: string): Promise<DataSource | null> => {
    const { data, error } = await supabase
      .from("data_sources")
      .select("*")
      .eq("id", dataSourceId)
      .single();

    if (error || !data) {
      console.error("[useDataSource] Error fetching data source:", error);
      return null;
    }

    return data as DataSource;
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
    getDataSource,
  };
}
