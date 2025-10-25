import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/DashboardHeader";
import { InsightCard } from "@/components/InsightCard";
import { HabitsList } from "@/components/HabitsList";
import { AddHabitDialog } from "@/components/AddHabitDialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  
  const [habits, setHabits] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [airQuality, setAirQuality] = useState<any>(null);
  
  const defaultLocation = {
    name: "San Francisco",
    latitude: 37.7749,
    longitude: -122.4194
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        loadUserData(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    // Load habits
    const { data: habitsData } = await supabase
      .from('user_habits')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });
    
    if (habitsData) setHabits(habitsData);

    // Load insights
    const { data: insightsData } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (insightsData) setInsights(insightsData);

    // Load environmental data
    await fetchEnvironmentalData();
  };

  const fetchEnvironmentalData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-environmental-data', {
        body: {
          latitude: defaultLocation.latitude,
          longitude: defaultLocation.longitude,
          locationName: defaultLocation.name
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
    if (user) {
      await loadUserData(user.id);
    }
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Environmental data updated"
    });
  };

  const handleGenerateInsights = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to get personalized insights",
        variant: "destructive"
      });
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
          environmentalData: {
            weather,
            airQuality
          },
          location: defaultLocation
        }
      });

      if (error) throw error;

      setInsights(data.insights);
      toast({
        title: "Insights Generated",
        description: "AI has analyzed your habits and environment"
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Error",
        description: "Failed to generate insights",
        variant: "destructive"
      });
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleAddHabit = async (habitData: any) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add habits",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase.from('user_habits').insert({
      ...habitData,
      user_id: user.id
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add habit",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Habit Added",
      description: "Your new habit has been saved"
    });
    
    if (user) {
      await loadUserData(user.id);
    }
  };

  const handleDismissInsight = async (id: string) => {
    await supabase
      .from('ai_insights')
      .update({ is_dismissed: true })
      .eq('id', id);
    
    setInsights(insights.filter(i => i.id !== id));
  };

  const handleSignIn = async () => {
    // For demo purposes, create a simple sign in
    const email = prompt("Enter email:");
    const password = prompt("Enter password:");
    
    if (!email || !password) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
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
        <DashboardHeader
          location={defaultLocation.name}
          weather={weather}
          airQuality={airQuality}
        />

        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="flex-1"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {user && habits.length > 0 && (
            <Button
              onClick={handleGenerateInsights}
              size="sm"
              disabled={generatingInsights}
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generatingInsights ? 'Analyzing...' : 'Get AI Insights'}
            </Button>
          )}
        </div>

        {!user && (
          <div className="p-4 bg-muted rounded-lg text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Sign in to track habits and get personalized insights
            </p>
            <Button onClick={handleSignIn} size="sm">
              Sign In
            </Button>
          </div>
        )}

        {insights.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">AI Insights</h2>
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onDismiss={handleDismissInsight}
              />
            ))}
          </div>
        )}

        {user && (
          <HabitsList
            habits={habits}
            onAddHabit={() => setShowAddHabit(true)}
          />
        )}

        <AddHabitDialog
          open={showAddHabit}
          onOpenChange={setShowAddHabit}
          onSubmit={handleAddHabit}
        />
      </div>
    </div>
  );
};

export default Index;
