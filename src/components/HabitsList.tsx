import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Clock, Calendar } from "lucide-react";

interface Habit {
  id: string;
  habit_name: string;
  habit_type: string;
  location_name?: string;
  time_of_day?: string;
  frequency?: string;
}

interface HabitsListProps {
  habits: Habit[];
  onAddHabit: () => void;
}

export const HabitsList = ({ habits, onAddHabit }: HabitsListProps) => {
  const getHabitIcon = (type: string) => {
    return <Calendar className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Your Habits</h2>
        <Button
          onClick={onAddHabit}
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Habit
        </Button>
      </div>

      {habits.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-medium text-foreground">No habits yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Add your daily routines so EnviroAgent can provide personalized environmental insights
            </p>
            <Button onClick={onAddHabit} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Habit
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => (
            <Card key={habit.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {getHabitIcon(habit.habit_type)}
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium text-foreground text-sm">
                    {habit.habit_name}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {habit.location_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {habit.location_name}
                      </span>
                    )}
                    {habit.time_of_day && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {habit.time_of_day}
                      </span>
                    )}
                    {habit.frequency && (
                      <span className="capitalize">{habit.frequency}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
