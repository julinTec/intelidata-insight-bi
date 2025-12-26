import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schemaInfo, sampleData, analysisType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `Você é um especialista em Business Intelligence focado em área financeira e gestão de indicadores. 
Analise os dados fornecidos e sugira:
1. KPIs relevantes para a área financeira (Receita, Margem, ROI, EBITDA, Fluxo de Caixa, etc.)
2. Tipos de gráficos ideais para cada métrica
3. Queries SQL e/ou DAX para calcular cada KPI
4. Insights e recomendações

Responda SEMPRE em JSON com a estrutura:
{
  "kpis": [{"name": "string", "description": "string", "formula": "string", "chartType": "string", "sql": "string", "dax": "string"}],
  "charts": [{"type": "string", "title": "string", "description": "string", "dataFields": ["string"]}],
  "insights": ["string"],
  "queries": [{"name": "string", "sql": "string", "dax": "string"}]
}`;

    const userPrompt = `Analise estes dados e sugira KPIs financeiros, gráficos e queries:

Schema: ${JSON.stringify(schemaInfo)}
Amostra de dados: ${JSON.stringify(sampleData?.slice(0, 5))}
Tipo de análise: ${analysisType || 'full'}`;

    console.log("Calling Lovable AI for analysis...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Try to parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      analysis = { raw: content };
    }

    console.log("Analysis completed successfully");

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-data:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
