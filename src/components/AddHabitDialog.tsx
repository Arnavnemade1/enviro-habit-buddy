import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (habit: {
    habit_name: string;
    habit_type: string;
    location_name?: string;
    time_of_day?: string;
    frequency: string;
  }) => void;
}

export const AddHabitDialog = ({ open, onOpenChange, onSubmit }: AddHabitDialogProps) => {
  const [habitName, setHabitName] = useState("");
  const [habitType, setHabitType] = useState("routine");
  const [locationName, setLocationName] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [frequency, setFrequency] = useState("daily");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      habit_name: habitName,
      habit_type: habitType,
      location_name: locationName || undefined,
      time_of_day: timeOfDay || undefined,
      frequency,
    });
    // Reset form
    setHabitName("");
    setLocationName("");
    setTimeOfDay("");
    setHabitType("routine");
    setFrequency("daily");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Habit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="habitName">Habit Name *</Label>
            <Input
              id="habitName"
              placeholder="e.g., Morning run, Commute to work"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="habitType">Type</Label>
            <Select value={habitType} onValueChange={setHabitType}>
              <SelectTrigger id="habitType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commute">Commute</SelectItem>
                <SelectItem value="outdoor_activity">Outdoor Activity</SelectItem>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="exercise">Exercise</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="e.g., Central Park, Downtown"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time of Day (Optional)</Label>
            <Input
              id="time"
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Weekdays</SelectItem>
                <SelectItem value="weekends">Weekends</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!habitName} className="flex-1">
              Add Habit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
