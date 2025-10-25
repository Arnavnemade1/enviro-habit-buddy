-- Create user_habits table for tracking user routines
CREATE TABLE public.user_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_type TEXT NOT NULL, -- 'commute', 'outdoor_activity', 'routine', etc.
  habit_name TEXT NOT NULL,
  location_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  frequency TEXT, -- 'daily', 'weekdays', 'weekends', 'custom'
  days_of_week INTEGER[], -- 0-6 (Sunday-Saturday)
  time_of_day TIME,
  duration_minutes INTEGER,
  active BOOLEAN DEFAULT true,
  learned_by_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create environmental_data table for caching API responses
CREATE TABLE public.environmental_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  data_type TEXT NOT NULL, -- 'weather', 'air_quality'
  data JSONB NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_insights table for storing AI-generated recommendations
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- 'alert', 'recommendation', 'trend', 'suggestion'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  related_habit_id UUID,
  environmental_context JSONB,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create user_notifications table for environmental alerts
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'weather_alert', 'air_quality', 'habit_reminder'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environmental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_habits
CREATE POLICY "Users can view their own habits"
ON public.user_habits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habits"
ON public.user_habits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
ON public.user_habits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
ON public.user_habits FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for environmental_data (public read, system write)
CREATE POLICY "Everyone can view environmental data"
ON public.environmental_data FOR SELECT
USING (true);

-- RLS Policies for ai_insights
CREATE POLICY "Users can view their own insights"
ON public.ai_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
ON public.ai_insights FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights"
ON public.ai_insights FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for user_notifications
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.user_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.user_notifications FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_habits_user_id ON public.user_habits(user_id);
CREATE INDEX idx_user_habits_active ON public.user_habits(active);
CREATE INDEX idx_environmental_data_location ON public.environmental_data(latitude, longitude);
CREATE INDEX idx_environmental_data_recorded_at ON public.environmental_data(recorded_at);
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_ai_insights_created_at ON public.ai_insights(created_at);
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_sent_at ON public.user_notifications(sent_at);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_user_habits_updated_at
  BEFORE UPDATE ON public.user_habits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();