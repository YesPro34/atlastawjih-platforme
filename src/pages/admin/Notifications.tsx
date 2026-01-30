import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Profile } from "@/types/database";

type RecipientMode = "all_adherents" | "single_adherent";

/**
 * Admin notifications page:
 * - Compose and send notifications to all adherents or a single adherent
 * - Show recent notifications (for quick verification)
 * - Log actions to activity_logs so they appear in the dashboard journal
 */
export default function AdminNotifications() {
  const [mode, setMode] = useState<RecipientMode>("all_adherents");
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [recent, setRecent] = useState<
    { id: string; user_id: string; title: string; message: string; created_at: string }[]
  >([]);

  useEffect(() => {
    loadProfiles();
    loadRecent();
  }, []);

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, massar_code")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les adhérents." });
      return;
    }
    setProfiles((data as any) ?? []);
  };

  const loadRecent = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setRecent((data as any) ?? []);
  };

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles.slice(0, 20);
    return profiles
      .filter((p) => {
        const name = `${p.first_name} ${p.last_name}`.toLowerCase();
        const massar = (p.massar_code ?? "").toLowerCase();
        return name.includes(q) || massar.includes(q);
      })
      .slice(0, 20);
  }, [profiles, search]);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Champs requis", description: "Titre et message sont obligatoires." });
      return;
    }

    setSending(true);
    try {
      if (mode === "single_adherent") {
        if (!selectedUserId) {
          toast({ title: "Choisir un adhérent", description: "Sélectionnez un destinataire." });
          return;
        }
        const { error } = await supabase.from("notifications").insert({
          user_id: selectedUserId,
          title: title.trim(),
          message: message.trim(),
        } as any);
        if (error) throw error;
      } else {
        // Why: PDF says admin can manage notifications. We keep it simple: one insert per user.
        // (If you later need scale, we can move this into an Edge Function.)
        const adherentRole = await supabase.from("user_roles").select("user_id").eq("role", "adherent");
        const ids = (adherentRole.data ?? []).map((r: any) => r.user_id);
        if (ids.length === 0) {
          toast({ title: "Aucun adhérent", description: "Aucun destinataire trouvé." });
          return;
        }
        const payload = ids.map((id) => ({ user_id: id, title: title.trim(), message: message.trim() }));
        const { error } = await supabase.from("notifications").insert(payload as any);
        if (error) throw error;
      }

      await supabase.from("activity_logs").insert({
        action: "notification_sent",
        entity_type: "notification",
        entity_id: null,
        details: { mode },
      } as any);

      toast({ title: "Envoyé", description: "Notification envoyée." });
      setTitle("");
      setMessage("");
      setSelectedUserId("");
      loadRecent();
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible d'envoyer la notification." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground">Envoyer des notifications et vérifier l'historique récent.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Envoyer une notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Destinataires</div>
              <Select value={mode} onValueChange={(v) => setMode(v as RecipientMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_adherents">Tous les adhérents</SelectItem>
                  <SelectItem value="single_adherent">Un seul adhérent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "single_adherent" ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Rechercher</div>
                <Input placeholder="Nom ou Massar..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un adhérent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProfiles.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.first_name} {p.last_name} — {p.massar_code ?? "Massar —"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium">Titre</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium">Message</div>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Message..." />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={send} disabled={sending}>
              Envoyer
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Commentaire: l'envoi “tous les adhérents” insère une notification par utilisateur (simple, lisible, compatible
            RLS). Pour très grand volume, on déplacera la logique côté serveur.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications récentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune notification.</div>
          ) : (
            <div className="space-y-2">
              {recent.map((n) => (
                <div key={n.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{n.message}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
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

