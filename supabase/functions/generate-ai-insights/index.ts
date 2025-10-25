import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsightRequest {
  habits: Array<{
    habit_name: string;
    location_name?: string;
    time_of_day?: string;
    frequency?: string;
  }>;
  environmentalData: {
    weather?: any;
    airQuality?: any;
  };
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { habits, environmentalData, location }: InsightRequest = await req.json();

    // Build context for AI
    const habitsContext = habits.map(h => 
      `- ${h.habit_name}${h.location_name ? ` at ${h.location_name}` : ''}${h.time_of_day ? ` around ${h.time_of_day}` : ''} (${h.frequency || 'regular'})`
    ).join('\n');

    const weatherContext = environmentalData.weather ? 
      `Temperature: ${environmentalData.weather.temperature}°C, Conditions: ${environmentalData.weather.description}` : 
      'No weather data available';

    const airQualityContext = environmentalData.airQuality ?
      `AQI: ${environmentalData.airQuality.aqi}, PM2.5: ${environmentalData.airQuality.pm25}` :
      'No air quality data available';

    const systemPrompt = `You are EnviroAgent, an intelligent environmental assistant that helps people make better decisions based on their habits and environmental conditions.

Your role is to:
1. Analyze user habits and environmental data
2. Provide actionable, personalized insights
3. Alert users to environmental hazards that affect their routines
4. Suggest eco-friendly alternatives when appropriate
5. Keep messages concise, friendly, and helpful (max 2-3 sentences)

Format your response as a JSON object with this structure:
{
  "insights": [
    {
      "type": "alert" | "recommendation" | "suggestion",
      "priority": "low" | "medium" | "high" | "urgent",
      "title": "Brief title",
      "message": "Actionable message"
    }
  ]
}`;

    const userPrompt = `Analyze these habits and environmental conditions for ${location.name}:

USER HABITS:
${habitsContext}

CURRENT CONDITIONS:
Weather: ${weatherContext}
Air Quality: ${airQualityContext}

Generate 2-4 relevant insights based on how the environmental conditions affect their habits. Focus on timing, safety, and eco-friendly alternatives.`;

    console.log('Calling OpenRouter API...');
    
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://enviroagent.app',
        'X-Title': 'EnviroAgent',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-maverick:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenRouter response:', JSON.stringify(data));

    const aiMessage = data.choices[0].message.content;
    console.log('AI message:', aiMessage);
    
    // Parse AI response
    let insights;
    try {
      const parsed = JSON.parse(aiMessage);
      insights = parsed.insights || [];
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback: create a single insight from the raw message
      insights = [{
        type: 'recommendation',
        priority: 'medium',
        title: 'Environmental Update',
        message: aiMessage.substring(0, 200)
      }];
    }

    // Store insights in database
    const insightsToStore = insights.map((insight: any) => ({
      user_id: user.id,
      insight_type: insight.type || 'recommendation',
      title: insight.title,
      message: insight.message,
      priority: insight.priority || 'medium',
      environmental_context: {
        weather: environmentalData.weather,
        airQuality: environmentalData.airQuality,
        location: location
      }
    }));

    const { data: storedInsights, error: insertError } = await supabase
      .from('ai_insights')
      .insert(insightsToStore)
      .select();

    if (insertError) {
      console.error('Failed to store insights:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ insights: storedInsights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-ai-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
