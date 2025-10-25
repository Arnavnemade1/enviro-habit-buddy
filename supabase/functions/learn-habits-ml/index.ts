import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationVisit {
  latitude: number;
  longitude: number;
  timestamp: string;
  duration_minutes?: number;
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

    const { locationVisits }: { locationVisits: LocationVisit[] } = await req.json();

    console.log(`Analyzing ${locationVisits.length} location visits for habit learning`);

    // Machine Learning Algorithm: Cluster-based pattern detection
    // 1. Group locations by proximity (within ~100m radius)
    // 2. Detect time patterns (recurring times of day)
    // 3. Identify frequency patterns (daily, weekdays, etc.)
    
    const clusters = clusterLocations(locationVisits);
    const patterns = detectTimePatterns(clusters);
    const learnedHabits = patterns.filter(p => p.confidence > 0.6);

    console.log(`Found ${learnedHabits.length} potential habits with high confidence`);

    // Use EnviroAI to generate habit descriptions
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const habitsToStore = [];

    for (const pattern of learnedHabits) {
      // Get reverse geocoding data (simplified - in production use proper geocoding API)
      const locationName = `Location at ${pattern.centerLat.toFixed(4)}, ${pattern.centerLon.toFixed(4)}`;
      
      // Use EnviroAI to generate a meaningful habit name
      const aiPrompt = `Based on this location pattern, suggest a concise habit name (max 5 words):
- Visits: ${pattern.visits} times
- Time of day: ${pattern.timeOfDay}
- Frequency: ${pattern.frequency}
- Days: ${pattern.daysOfWeek.join(', ')}

Return ONLY the habit name, nothing else.`;

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
            { role: 'user', content: aiPrompt }
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const habitName = data.choices[0].message.content.trim();

      habitsToStore.push({
        user_id: user.id,
        habit_type: pattern.type,
        habit_name: habitName,
        location_name: locationName,
        latitude: pattern.centerLat,
        longitude: pattern.centerLon,
        frequency: pattern.frequency,
        days_of_week: pattern.daysOfWeek,
        time_of_day: pattern.timeOfDay,
        learned_by_ai: true,
        active: true
      });
    }

    // Store learned habits
    if (habitsToStore.length > 0) {
      const { data: storedHabits, error: insertError } = await supabase
        .from('user_habits')
        .upsert(habitsToStore, {
          onConflict: 'user_id,latitude,longitude',
          ignoreDuplicates: false
        })
        .select();

      if (insertError) {
        console.error('Failed to store habits:', insertError);
        throw insertError;
      }

      console.log(`Stored ${storedHabits?.length || 0} learned habits`);

      return new Response(
        JSON.stringify({ 
          habits: storedHabits,
          message: `EnviroAI learned ${storedHabits?.length || 0} new habits from your location patterns`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        habits: [],
        message: 'Not enough data to learn new habits yet. Keep using the app!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in learn-habits-ml:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function clusterLocations(visits: LocationVisit[]): any[] {
  const clusters: any[] = [];
  const clusterRadius = 0.001; // ~100m

  for (const visit of visits) {
    let addedToCluster = false;
    
    for (const cluster of clusters) {
      const distance = Math.sqrt(
        Math.pow(visit.latitude - cluster.centerLat, 2) +
        Math.pow(visit.longitude - cluster.centerLon, 2)
      );
      
      if (distance < clusterRadius) {
        cluster.visits.push(visit);
        cluster.centerLat = cluster.visits.reduce((sum: number, v: any) => sum + v.latitude, 0) / cluster.visits.length;
        cluster.centerLon = cluster.visits.reduce((sum: number, v: any) => sum + v.longitude, 0) / cluster.visits.length;
        addedToCluster = true;
        break;
      }
    }
    
    if (!addedToCluster) {
      clusters.push({
        centerLat: visit.latitude,
        centerLon: visit.longitude,
        visits: [visit]
      });
    }
  }

  return clusters.filter(c => c.visits.length >= 3); // Minimum 3 visits to be considered a pattern
}

function detectTimePatterns(clusters: any[]): any[] {
  const patterns = [];

  for (const cluster of clusters) {
    const times = cluster.visits.map((v: LocationVisit) => {
      const date = new Date(v.timestamp);
      return {
        hour: date.getHours(),
        minute: date.getMinutes(),
        dayOfWeek: date.getDay()
      };
    });

    // Detect time of day pattern
    const avgHour = times.reduce((sum: number, t: any) => sum + t.hour, 0) / times.length;
    const timeOfDay = `${String(Math.floor(avgHour)).padStart(2, '0')}:${String(Math.floor(times.reduce((sum: number, t: any) => sum + t.minute, 0) / times.length)).padStart(2, '0')}`;

    // Detect frequency pattern
    const daysOfWeek = [...new Set(times.map((t: any) => t.dayOfWeek))];
    const isWeekdays = daysOfWeek.every(d => d >= 1 && d <= 5);
    const isWeekends = daysOfWeek.every(d => d === 0 || d === 6);
    const isDaily = daysOfWeek.length >= 5;

    let frequency = 'custom';
    if (isDaily) frequency = 'daily';
    else if (isWeekdays) frequency = 'weekdays';
    else if (isWeekends) frequency = 'weekends';

    // Calculate confidence score
    const confidence = Math.min(cluster.visits.length / 10, 1.0); // Max confidence at 10+ visits

    patterns.push({
      centerLat: cluster.centerLat,
      centerLon: cluster.centerLon,
      visits: cluster.visits.length,
      timeOfDay,
      frequency,
      daysOfWeek,
      confidence,
      type: determineHabitType(avgHour, cluster.visits.length)
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

function determineHabitType(avgHour: number, visitCount: number): string {
  if (avgHour >= 6 && avgHour <= 9) return 'commute';
  if (avgHour >= 17 && avgHour <= 19) return 'commute';
  if (avgHour >= 10 && avgHour <= 16 && visitCount > 10) return 'routine';
  if (avgHour >= 7 && avgHour <= 11) return 'outdoor_activity';
  return 'routine';
}
