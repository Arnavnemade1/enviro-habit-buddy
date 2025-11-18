import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: string;
  location_name?: string;
}

interface EnvironmentalData {
  temperature: number;
  aqi: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { locationData, environmentalData } = await req.json() as {
      locationData: LocationData;
      environmentalData: EnvironmentalData;
    };

    console.log('Auto-tracking habit pattern for user:', user.id);

    // Extract time features
    const timestamp = new Date(locationData.timestamp);
    const timeOfDay = timestamp.toTimeString().slice(0, 5); // HH:MM
    const dayOfWeek = timestamp.getDay();

    // Store pattern data for neural network
    const { error: patternError } = await supabaseClient
      .from('habit_patterns')
      .insert({
        user_id: user.id,
        location_lat: locationData.latitude,
        location_lng: locationData.longitude,
        time_of_day: timeOfDay,
        day_of_week: dayOfWeek,
        environmental_temp: environmentalData.temperature,
        environmental_aqi: environmentalData.aqi,
        activity_type: 'location_visit'
      });

    if (patternError) {
      console.error('Error storing pattern:', patternError);
    }

    // Analyze patterns (simple frequency-based detection)
    const { data: recentPatterns, error: fetchError } = await supabaseClient
      .from('habit_patterns')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) // Last 14 days
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching patterns:', fetchError);
    }

    if (recentPatterns && recentPatterns.length > 10) {
      // Find recurring patterns (same location + time window)
      const locationClusters: Map<string, any[]> = new Map();
      
      recentPatterns.forEach(pattern => {
        const locationKey = `${Math.round(pattern.location_lat * 100)}_${Math.round(pattern.location_lng * 100)}`;
        if (!locationClusters.has(locationKey)) {
          locationClusters.set(locationKey, []);
        }
        locationClusters.get(locationKey)!.push(pattern);
      });

      // Check for patterns that occur frequently
      for (const [locationKey, patterns] of locationClusters) {
        if (patterns.length >= 5) { // Visited 5+ times in 14 days
          const avgLat = patterns.reduce((sum, p) => sum + Number(p.location_lat), 0) / patterns.length;
          const avgLng = patterns.reduce((sum, p) => sum + Number(p.location_lng), 0) / patterns.length;
          const commonDays = [...new Set(patterns.map(p => p.day_of_week))];
          
          const confidence = Math.min(patterns.length / 14, 0.95);

          // Check if habit already exists
          const { data: existingHabits } = await supabaseClient
            .from('learned_habits')
            .select('*')
            .eq('user_id', user.id)
            .eq('pattern_data->>location_key', locationKey);

          if (!existingHabits || existingHabits.length === 0) {
            // Create learned habit suggestion
            await supabaseClient
              .from('learned_habits')
              .insert({
                user_id: user.id,
                habit_name: `Regular visit to ${locationData.location_name || 'location'}`,
                confidence_score: confidence.toFixed(2),
                pattern_data: {
                  location_key: locationKey,
                  latitude: avgLat,
                  longitude: avgLng,
                  frequency: patterns.length,
                  common_days: commonDays,
                  location_name: locationData.location_name
                }
              });

            console.log('New habit pattern detected:', locationKey, 'Confidence:', confidence);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      patterns_analyzed: recentPatterns?.length || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in auto-track-habits:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
