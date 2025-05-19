
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Activity {
  id: string;
  description: string;
  created_at: string;
  user_id?: string;
  user_first_name?: string | null;
  user_last_name?: string | null;
}

export function RecentActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      // We don't have user_activities table, so let's use emission_entries as activity log
      const { data: emissionEntries, error: entriesError } = await supabase
        .from('emission_entries')
        .select('id, company_id, date, category, description, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (entriesError || !emissionEntries) {
        console.error("Error fetching activities:", entriesError);
        return;
      }

      // Transform emission entries into activity format
      const formattedActivities: Activity[] = emissionEntries.map(entry => ({
        id: entry.id,
        description: `added emission entry for ${entry.category}`,
        created_at: entry.created_at,
      }));

      setActivities(formattedActivities);
    };

    fetchActivities();
  }, []);

  return (
    <ScrollArea className="h-[200px] rounded-md border p-4">
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 text-sm">
              <time className="text-muted-foreground w-32">
                {format(new Date(activity.created_at), 'MMM d, HH:mm')}
              </time>
              <span>
                {activity.user_first_name || ''} {activity.user_last_name || ''}{' '}
                {activity.description}
              </span>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No recent activity found
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
