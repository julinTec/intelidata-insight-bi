import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch shared dashboard
    const { data: dashboard, error: dashError } = await supabase
      .from("shared_dashboards")
      .select("*")
      .eq("share_token", token)
      .eq("is_active", true)
      .single();

    if (dashError || !dashboard) {
      console.error("Dashboard not found:", dashError);
      return new Response(
        JSON.stringify({ error: "Dashboard não encontrado ou expirado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (dashboard.expires_at && new Date(dashboard.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Dashboard expirado" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch widgets
    const { data: widgets, error: widgetsError } = await supabase
      .from("dashboard_widgets")
      .select("id, widget_type, title, config, data_source_id")
      .in("id", dashboard.widget_ids || []);

    if (widgetsError) {
      console.error("Widgets error:", widgetsError);
    }

    // Get unique data source IDs
    const sourceIds = [...new Set((widgets || []).map((w: { data_source_id: string | null }) => w.data_source_id).filter(Boolean))];

    // Fetch data sources
    let dataSources: unknown[] = [];
    if (sourceIds.length > 0) {
      const { data: sourcesData } = await supabase
        .from("data_sources")
        .select("id, name, schema_info, source_type, connection_config, file_url")
        .in("id", sourceIds);
      
      dataSources = sourcesData || [];
    }

    console.log("Public dashboard loaded:", dashboard.id, "widgets:", widgets?.length);

    return new Response(
      JSON.stringify({
        dashboard: {
          id: dashboard.id,
          title: dashboard.title,
          filter_config: dashboard.filter_config,
        },
        widgets: widgets || [],
        dataSources,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-public-dashboard:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
