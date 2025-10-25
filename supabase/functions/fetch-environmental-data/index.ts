import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationRequest {
  latitude: number;
  longitude: number;
  locationName: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { latitude, longitude, locationName }: LocationRequest = await req.json();

    console.log(`Fetching environmental data for ${locationName} (${latitude}, ${longitude})`);

    // Fetch weather data from Open-Meteo (no key required)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability&timezone=auto`;
    
    console.log('Fetching weather data...');
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();
    
    console.log('Weather data fetched:', JSON.stringify(weatherData).substring(0, 200));

    // Fetch air quality data from OpenAQ (no key required)
    // Note: OpenAQ doesn't support exact coordinates, we'll fetch nearest location
    const airQualityUrl = `https://api.openaq.org/v2/latest?coordinates=${latitude},${longitude}&radius=25000&limit=1`;
    
    console.log('Fetching air quality data...');
    const airQualityResponse = await fetch(airQualityUrl);
    const airQualityData = await airQualityResponse.json();
    
    console.log('Air quality data fetched:', JSON.stringify(airQualityData).substring(0, 200));

    // Parse weather data
    const weatherParsed = {
      temperature: weatherData.current?.temperature_2m,
      humidity: weatherData.current?.relative_humidity_2m,
      feelsLike: weatherData.current?.apparent_temperature,
      precipitation: weatherData.current?.precipitation,
      weatherCode: weatherData.current?.weather_code,
      windSpeed: weatherData.current?.wind_speed_10m,
      windDirection: weatherData.current?.wind_direction_10m,
      description: getWeatherDescription(weatherData.current?.weather_code),
      hourlyForecast: weatherData.hourly
    };

    // Parse air quality data
    let airQualityParsed = null;
    if (airQualityData.results && airQualityData.results.length > 0) {
      const result = airQualityData.results[0];
      const measurements = result.measurements || [];
      
      airQualityParsed = {
        locationName: result.location,
        city: result.city,
        country: result.country,
        coordinates: result.coordinates,
        measurements: measurements.reduce((acc: any, m: any) => {
          acc[m.parameter] = {
            value: m.value,
            unit: m.unit,
            lastUpdated: m.lastUpdated
          };
          return acc;
        }, {}),
        pm25: measurements.find((m: any) => m.parameter === 'pm25')?.value,
        pm10: measurements.find((m: any) => m.parameter === 'pm10')?.value,
        aqi: calculateAQI(measurements),
      };
    }

    // Store in database cache
    const now = new Date().toISOString();
    
    const weatherRecord = {
      location_name: locationName,
      latitude,
      longitude,
      data_type: 'weather',
      data: weatherParsed,
      recorded_at: now
    };

    const { error: weatherError } = await supabase
      .from('environmental_data')
      .insert(weatherRecord);

    if (weatherError) {
      console.error('Failed to cache weather data:', weatherError);
    }

    if (airQualityParsed) {
      const airQualityRecord = {
        location_name: locationName,
        latitude,
        longitude,
        data_type: 'air_quality',
        data: airQualityParsed,
        recorded_at: now
      };

      const { error: aqError } = await supabase
        .from('environmental_data')
        .insert(airQualityRecord);

      if (aqError) {
        console.error('Failed to cache air quality data:', aqError);
      }
    }

    return new Response(
      JSON.stringify({
        weather: weatherParsed,
        airQuality: airQualityParsed,
        timestamp: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-environmental-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getWeatherDescription(code: number | undefined): string {
  if (!code) return 'Unknown';
  
  const weatherCodes: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    95: 'Thunderstorm',
  };

  return weatherCodes[code] || 'Unknown';
}

function calculateAQI(measurements: any[]): number {
  // Simplified AQI calculation based on PM2.5
  const pm25 = measurements.find(m => m.parameter === 'pm25');
  if (!pm25) return 0;
  
  const value = pm25.value;
  if (value <= 12) return Math.round((50 / 12) * value);
  if (value <= 35.4) return Math.round(50 + ((50 / 23.4) * (value - 12)));
  if (value <= 55.4) return Math.round(100 + ((50 / 20) * (value - 35.4)));
  if (value <= 150.4) return Math.round(150 + ((100 / 95) * (value - 55.4)));
  return Math.min(500, Math.round(200 + ((100 / 100) * (value - 150.4))));
}
