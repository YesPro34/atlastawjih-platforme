import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

/**
 * Student notifications page:
 * - Lists notifications for the logged-in adherent
 * - Marks all as read when the page is opened
 * - The StudentLayout badge uses an unread count based on `is_read`
 */
export default function StudentNotifications() {
  const { user } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, created_at, is_read")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      setRows((data as any) ?? []);

      // Mark all as read once loaded so that badge count drops.
      await supabase
        .from("notifications")
        .update({ is_read: true } as any)
        .eq("user_id", user?.id)
        .eq("is_read", false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground">Les messages envoyés par l’équipe Atlas Tawjih.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune notification.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((n) => (
                <div
                  key={n.id}
                  className="rounded-md border p-3 bg-card/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{n.message}</div>
                    </div>
                    <div className="text-xs text-muted-foreground min-w-[120px] text-right">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

