import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/DashboardHeader";
import { InsightCard } from "@/components/InsightCard";
import { HabitsList } from "@/components/HabitsList";
import { AddHabitDialog } from "@/components/AddHabitDialog";
import { LocationTracker } from "@/components/LocationTracker";
import { EnvironmentalTrends } from "@/components/EnvironmentalTrends";
import { EnviroAISummary } from "@/components/EnviroAISummary";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, LogOut, Brain } from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [learningHabits, setLearningHabits] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  
  const [habits, setHabits] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [airQuality, setAirQuality] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  
  const [currentLocation, setCurrentLocation] = useState({
    name: "San Francisco",
    latitude: 37.7749,
    longitude: -122.4194
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        fetchEnvironmentalData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    const { data: habitsData } = await supabase
      .from('user_habits')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });
    
    if (habitsData) setHabits(habitsData);

    const { data: insightsData } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (insightsData) setInsights(insightsData);
    await fetchEnvironmentalData();
  };

  const fetchEnvironmentalData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-environmental-data', {
        body: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          locationName: currentLocation.name
        }
      });

      if (error) throw error;
      setWeather(data.weather);
      setAirQuality(data.airQuality);
    } catch (error) {
      console.error('Error fetching environmental data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch environmental data",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEnvironmentalData();
    if (user) await loadUserData(user.id);
    setRefreshing(false);
    toast({ title: "Refreshed", description: "Environmental data updated" });
  };

  const handleGenerateInsights = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to get personalized insights", variant: "destructive" });
      return;
    }

    setGeneratingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-insights', {
        body: {
          habits: habits.map(h => ({
            habit_name: h.habit_name,
            location_name: h.location_name,
            time_of_day: h.time_of_day,
            frequency: h.frequency
          })),
          environmentalData: { weather, airQuality },
          location: currentLocation
        }
      });

      if (error) throw error;
      setInsights(data.insights);
      toast({ title: "Insights Generated", description: "EnviroAI has analyzed your habits and environment" });
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({ title: "Error", description: "Failed to generate insights", variant: "destructive" });
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleLearnHabits = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to enable automatic habit learning", variant: "destructive" });
      return;
    }

    setLearningHabits(true);
    try {
      const { data: locationData } = await supabase
        .from('location_history')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!locationData || locationData.length < 10) {
        toast({ title: "Not enough data", description: "Keep tracking your location to enable habit learning" });
        setLearningHabits(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('learn-habits-ml', {
        body: {
          locationVisits: locationData.map(loc => ({
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            timestamp: loc.timestamp
          }))
        }
      });

      if (error) throw error;
      toast({ title: "Habits Learned!", description: data.message });
      if (user) await loadUserData(user.id);
    } catch (error) {
      console.error('Error learning habits:', error);
      toast({ title: "Error", description: "Failed to learn habits", variant: "destructive" });
    } finally {
      setLearningHabits(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    setAiSummary("");
    
    const summaryText = `🌍 **Environmental Overview for ${currentLocation.name}**

Current conditions: ${weather ? `${Math.round(weather.temperature)}°C, ${weather.description}` : "Loading..."} with air quality at ${airQuality ? `AQI ${airQuality.aqi}` : "checking..."}.

${habits.length > 0 ? `EnviroAI is tracking ${habits.length} of your habits and has generated ${insights.length} personalized insights for you today.` : "Start adding your habits to receive personalized environmental insights."}

${airQuality && airQuality.aqi < 50 ? "Great news! Air quality is excellent for outdoor activities." : airQuality && airQuality.aqi > 100 ? "⚠️ Consider limiting outdoor exposure due to elevated pollution levels." : "Air quality is moderate - typical outdoor activities are fine."}

Stay informed and make environmentally-conscious decisions with EnviroAI! 🌱`;

    setAiSummary(summaryText);
    setGeneratingSummary(false);
  };

  const handleAddHabit = async (habitData: any) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to add habits", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('user_habits').insert({ ...habitData, user_id: user.id });

    if (error) {
      toast({ title: "Error", description: "Failed to add habit", variant: "destructive" });
      return;
    }

    toast({ title: "Habit Added", description: "Your new habit has been saved" });
    if (user) await loadUserData(user.id);
  };

  const handleDismissInsight = async (id: string) => {
    await supabase.from('ai_insights').update({ is_dismissed: true }).eq('id', id);
    setInsights(insights.filter(i => i.id !== id));
  };

  const handleLocationUpdate = async (location: { latitude: number; longitude: number; locationName: string }) => {
    setCurrentLocation({
      name: location.locationName,
      latitude: location.latitude,
      longitude: location.longitude
    });
    await fetchEnvironmentalData();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You've been signed out successfully" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div />
          {user && (
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>

        <DashboardHeader location={currentLocation.name} weather={weather} airQuality={airQuality} />

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleGenerateSummary} variant="outline" size="sm" disabled={generatingSummary}>
            <Brain className="w-4 h-4 mr-2" />
            Summary
          </Button>
        </div>

        {!user && (
          <div className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg text-center space-y-3 border border-primary/20">
            <h3 className="font-semibold text-foreground">Unlock Full Features</h3>
            <p className="text-sm text-muted-foreground">
              Sign in to track habits, get EnviroAI insights, and receive environmental alerts
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In / Sign Up</Button>
          </div>
        )}

        {user && <LocationTracker userId={user?.id} onLocationUpdate={handleLocationUpdate} />}

        <EnviroAISummary summary={aiSummary} loading={generatingSummary} />

        <EnvironmentalTrends />

        {user && habits.length > 0 && (
          <div className="flex gap-2">
            <Button onClick={handleGenerateInsights} size="sm" disabled={generatingInsights} className="flex-1">
              <Sparkles className="w-4 h-4 mr-2" />
              {generatingInsights ? 'Analyzing...' : 'Get Insights'}
            </Button>
            <Button onClick={handleLearnHabits} size="sm" disabled={learningHabits} variant="secondary" className="flex-1">
              <Brain className="w-4 h-4 mr-2" />
              {learningHabits ? 'Learning...' : 'Learn Habits'}
            </Button>
          </div>
        )}

        {insights.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">EnviroAI Insights</h2>
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} onDismiss={handleDismissInsight} />
            ))}
          </div>
        )}

        {user && <HabitsList habits={habits} onAddHabit={() => setShowAddHabit(true)} />}

        <AddHabitDialog open={showAddHabit} onOpenChange={setShowAddHabit} onSubmit={handleAddHabit} />
      </div>
    </div>
  );
};

export default Index;
