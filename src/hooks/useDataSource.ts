import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

interface ConnectionConfig {
  url?: string;
  dataPath?: string | null;
}

export interface DataSource {
  id: string;
  name: string;
  source_type: string;
  schema_info: Json | null;
  row_count: number | null;
  connection_config: Json | null;
  project_id: string;
  file_url?: string | null;
}

export interface UseDataSourceResult {
  data: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  fetchData: (dataSourceOrId: DataSource | string) => Promise<Record<string, unknown>[]>;
  getDataSource: (dataSourceId: string) => Promise<DataSource | null>;
}

// Cache for parsed file data
const dataCache = new Map<string, { data: Record<string, unknown>[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  const getDataSourceById = async (dataSourceId: string): Promise<DataSource | null> => {
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
  };

  const parseCSVContent = (text: string): Record<string, unknown>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Handle both comma and semicolon as delimiters
    const delimiter = lines[0].includes(';') ? ';' : ',';
    
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    
    return lines.slice(1).map((line) => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i - 1] !== '\\') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ''));

      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        // Try to parse numbers
        const numValue = parseFloat(value.replace(',', '.'));
        if (!isNaN(numValue) && value.trim() !== '') {
          row[header] = numValue;
        } else {
          row[header] = value;
        }
      });
      return row;
    });
  };

  const fetchFileData = async (dataSource: DataSource): Promise<Record<string, unknown>[]> => {
    if (!dataSource.file_url) {
      throw new Error("URL do arquivo não encontrada");
    }

    // Check cache first
    const cached = dataCache.get(dataSource.id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[useDataSource] Using cached data for:", dataSource.id);
      return cached.data;
    }

    console.log("[useDataSource] Downloading file:", dataSource.file_url);

    // Download file from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('data-files')
      .download(dataSource.file_url);

    if (downloadError || !fileBlob) {
      console.error("[useDataSource] Download error:", downloadError);
      throw new Error("Erro ao baixar arquivo: " + (downloadError?.message || "Arquivo não encontrado"));
    }

    let records: Record<string, unknown>[];

    if (dataSource.source_type === 'csv') {
      // Parse CSV
      const text = await fileBlob.text();
      records = parseCSVContent(text);
    } else if (dataSource.source_type === 'excel' || dataSource.source_type === 'xlsx') {
      // Parse Excel
      const arrayBuffer = await fileBlob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      records = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${dataSource.source_type}`);
    }

    console.log("[useDataSource] Parsed records:", records.length);

    // Cache the result
    dataCache.set(dataSource.id, { data: records, timestamp: Date.now() });

    return records;
  };

  const fetchData = useCallback(async (dataSourceOrId: DataSource | string): Promise<Record<string, unknown>[]> => {
    setLoading(true);
    setError(null);

    try {
      // Resolve data source if string ID was passed
      const dataSource = typeof dataSourceOrId === "string" 
        ? await getDataSourceById(dataSourceOrId)
        : dataSourceOrId;

      if (!dataSource) {
        throw new Error("Fonte de dados não encontrada");
      }

      // Handle file-based sources (CSV, Excel)
      if (dataSource.source_type === "csv" || dataSource.source_type === "excel" || dataSource.source_type === "xlsx") {
        const records = await fetchFileData(dataSource);
        setData(records);
        return records;
      }

      if (dataSource.source_type !== "api_json") {
        throw new Error("Tipo de fonte não suportado: " + dataSource.source_type);
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
