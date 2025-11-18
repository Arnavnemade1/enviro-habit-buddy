-- Create habit patterns table for neural network training
CREATE TABLE IF NOT EXISTS public.habit_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  time_of_day TIME NOT NULL,
  day_of_week INTEGER NOT NULL,
  duration_minutes INTEGER,
  activity_type TEXT,
  environmental_temp DECIMAL(5, 2),
  environmental_aqi INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.habit_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own habit patterns"
ON public.habit_patterns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit patterns"
ON public.habit_patterns FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create learned habits table
CREATE TABLE IF NOT EXISTS public.learned_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_name TEXT NOT NULL,
  confidence_score DECIMAL(3, 2) NOT NULL,
  pattern_data JSONB NOT NULL,
  suggested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learned_habits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own learned habits"
ON public.learned_habits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own learned habits"
ON public.learned_habits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert learned habits"
ON public.learned_habits FOR INSERT
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_habit_patterns_user_time ON public.habit_patterns(user_id, time_of_day, day_of_week);
CREATE INDEX idx_learned_habits_user ON public.learned_habits(user_id, accepted);