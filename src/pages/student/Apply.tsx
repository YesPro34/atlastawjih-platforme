import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { BacOption, School } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type SchoolRow = School & { refused?: boolean; alreadyApplied?: boolean };

/**
 * Student “Nouvelle candidature” page.
 * Why: Required by dynamic forms PDF and referenced in Student sidebar.
 *
 * Behavior per PDF:
 * - Only show ACTIVE schools
 * - Only show schools compatible with the student's bac option
 * - For each school: two actions (“Je veux postuler” and “Je ne suis pas intéressé(e)”)
 */
export default function StudentApply() {
  const { user } = useAuth();
  const [bacOption, setBacOption] = useState<BacOption | null>(null);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refuseSchool, setRefuseSchool] = useState<SchoolRow | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const [profileRes, schoolsRes] = await Promise.all([
        supabase.from("profiles").select("bac_option, first_name, last_name, massar_code").eq("user_id", user?.id).maybeSingle(),
        supabase.from("schools").select("*").eq("is_active", true),
      ]);
      if (profileRes.error) throw profileRes.error;
      const option = (profileRes.data?.bac_option as BacOption | null) ?? null;
      setBacOption(option);

      const allActive = (schoolsRes.data ?? []) as any as School[];
      const eligible = option ? allActive.filter((s) => (s.allowed_bac_options ?? []).includes(option)) : allActive;

      // Determine if user refused or already applied for each school (so we can hide buttons).
      const schoolIds = eligible.map((s) => s.id);
      const [refusalsRes, applicationsRes] = await Promise.all([
        supabase.from("school_refusals").select("school_id").eq("user_id", user?.id).in("school_id", schoolIds),
        supabase.from("applications").select("school_id").eq("user_id", user?.id).in("school_id", schoolIds),
      ]);

      const refusedSet = new Set((refusalsRes.data ?? []).map((r: any) => r.school_id));
      const appliedSet = new Set((applicationsRes.data ?? []).map((a: any) => a.school_id));

      setSchools(
        eligible.map((s) => ({
          ...s,
          refused: refusedSet.has(s.id),
          alreadyApplied: appliedSet.has(s.id),
        }))
      );
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de charger les écoles." });
    } finally {
      setLoading(false);
    }
  };

  const confirmRefusal = async () => {
    if (!user || !refuseSchool) return;

    // Why: Refusal is stored in `school_refusals` (schema already exists).
    const { error } = await supabase.from("school_refusals").insert({ user_id: user.id, school_id: refuseSchool.id });
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le refus." });
      return;
    }

    // Why: PDF asks for an automatic notification to the admin when student refuses.
    // Simplest implementation: insert into `notifications` addressed to the admin user(s) is not possible without
    // a server-side function to fetch admin ids. We'll implement admin notification sending in the notifications todo.
    // For now, we only log to activity_logs for admin visibility.
    await supabase.from("activity_logs").insert({
      action: "refusal_created",
      entity_type: "school_refusal",
      entity_id: null,
      details: { school_id: refuseSchool.id, user_id: user.id },
    } as any);

    toast({ title: "Refus enregistré", description: `Vous avez choisi de ne pas postuler à ${refuseSchool.name}.` });
    setRefuseSchool(null);
    load();
  };

  // Filter out schools that are refused or already applied
  const visible = useMemo(() => {
    return schools.filter((school) => !school.refused && !school.alreadyApplied);
  }, [schools]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nouvelle candidature</h1>
        <p className="text-muted-foreground">
          {bacOption ? `Écoles éligibles pour votre Bac: ${bacOption}` : "Écoles activées (profil bac non renseigné)."}
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : visible.length === 0 ? (
        <div className="text-sm text-muted-foreground">Aucune école disponible.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((school) => (
            <Card key={school.id}>
              <CardHeader>
                <CardTitle className="text-base">{school.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {school.description ? <p className="text-sm text-muted-foreground">{school.description}</p> : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild className="flex-1">
                    <Link to={`/student/apply/${school.id}`}>Je veux postuler</Link>
                  </Button>
                  <Dialog open={refuseSchool?.id === school.id} onOpenChange={(o) => setRefuseSchool(o ? school : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Je ne suis pas intéressé(e)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmation</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Êtes-vous sûr(e) de ne pas vouloir postuler à <b>{school.name}</b> ? Vous pourrez changer d'avis
                          uniquement en contactant l'équipe Atlas Tawjih.
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setRefuseSchool(null)}>
                            Annuler
                          </Button>
                          <Button variant="destructive" onClick={confirmRefusal}>
                            Oui, confirmer
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

