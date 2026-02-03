import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { School } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { BAC_OPTIONS, type BacOption } from "@/types/database";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";

type SchoolRow = School & {
  // Derived counts for admin list (from PDF spec)
  applications_count?: number;
  refusals_count?: number;
};

/**
 * Admin schools list (Gestion des écoles - Sous page 1).
 * - Shows activation status (visible to students immediately per PDF)
 * - Shows submitted applications + refusals counts
 * - Link to configure the school's dynamic form (`form_configs`)
 */
export default function AdminSchools() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refusalsOpen, setRefusalsOpen] = useState<null | { school: SchoolRow; rows: any[] }>(null);
  // State for delete confirmation dialog
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolRow | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    short_name: "",
    description: "",
    allowed_bac_options: [] as BacOption[],
  });

  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    fetchSchools();
    // We intentionally don't subscribe in real-time here to keep UI straightforward.
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch counts in parallel and merge client-side.
      // This avoids needing DB views/functions and keeps the app portable.
      const schoolIds = (data ?? []).map((s) => s.id);
      const [apps, refusals] = await Promise.all([
        supabase.from("applications").select("school_id", { count: "exact", head: false }).in("school_id", schoolIds),
        supabase.from("school_refusals").select("school_id", { count: "exact", head: false }).in("school_id", schoolIds),
      ]);

      const appsBySchool = new Map<string, number>();
      (apps.data ?? []).forEach((row: any) => {
        appsBySchool.set(row.school_id, (appsBySchool.get(row.school_id) ?? 0) + 1);
      });
      const refusalsBySchool = new Map<string, number>();
      (refusals.data ?? []).forEach((row: any) => {
        refusalsBySchool.set(row.school_id, (refusalsBySchool.get(row.school_id) ?? 0) + 1);
      });

      const rows: SchoolRow[] = (data ?? []).map((s: any) => ({
        ...(s as School),
        applications_count: appsBySchool.get(s.id) ?? 0,
        refusals_count: refusalsBySchool.get(s.id) ?? 0,
      }));
      setSchools(rows);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de charger les écoles." });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      const matchesQuery = !query || s.name.toLowerCase().includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "inactive" && !s.is_active);
      return matchesQuery && matchesStatus;
    });
  }, [schools, query, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedSchools = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const toggleActive = async (school: SchoolRow, next: boolean) => {
    // Why: per PDF, activation should instantly control student visibility.
    const { error } = await supabase.from("schools").update({ is_active: next }).eq("id", school.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de modifier le statut." });
      return;
    }
    setSchools((prev) => prev.map((s) => (s.id === school.id ? { ...s, is_active: next } : s)));
  };

  const openRefusals = async (school: SchoolRow) => {
    // Why: PDF says if admin deletes the refusal, the student should see the two buttons again.
    const { data: refusals } = await supabase
      .from("school_refusals")
      .select("id, user_id, created_at")
      .eq("school_id", school.id)
      .order("created_at", { ascending: false });

    const userIds = Array.from(new Set((refusals ?? []).map((r: any) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, massar_code")
      .in("user_id", userIds);
    const byUser = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));

    setRefusalsOpen({
      school,
      rows: (refusals ?? []).map((r: any) => ({ ...r, profile: byUser.get(r.user_id) })),
    });
  };

  /**
   * Delete a refusal entry. This allows the student to see the apply buttons again.
   * Why: The admin needs to be able to remove refusals so students can change their mind.
   */
  const deleteRefusal = async (refusalId: string) => {
    try {
      const { error, data } = await supabase
        .from("school_refusals")
        .delete()
        .eq("id", refusalId)
        .select();

      if (error) {
        console.error("Error deleting refusal:", error);
        toast({
          title: "Erreur",
          description: `Impossible de supprimer le refus: ${error.message}`,
        });
        return;
      }

      // Check if anything was actually deleted
      if (!data || data.length === 0) {
        toast({
          title: "Avertissement",
          description: "Le refus n'a pas été trouvé ou a déjà été supprimé.",
        });
      } else {
        toast({
          title: "Supprimé",
          description: "Le refus a été supprimé (l'élève reverra les boutons).",
        });
      }

      // Refresh the refusals list and school counts
      if (refusalsOpen) {
        await openRefusals(refusalsOpen.school);
      }
      await fetchSchools();
    } catch (e: any) {
      console.error("Unexpected error deleting refusal:", e);
      toast({
        title: "Erreur",
        description: `Erreur inattendue: ${e.message || "Impossible de supprimer le refus."}`,
      });
    }
  };

  const createSchool = async () => {
    if (!createForm.name.trim()) {
      toast({ title: "Champ requis", description: "Le nom de l'établissement est obligatoire." });
      return;
    }
    try {
      // Cast to database enum type (which includes SC, SE, ARTS but we're using STE, STM)
      // This will work once the migration adds STE and STM to the enum
      const { data, error } = await supabase.from("schools").insert({
        name: createForm.name.trim(),
        short_name: createForm.short_name.trim() || null,
        description: createForm.description.trim() || null,
        is_active: true,
        allowed_bac_options: createForm.allowed_bac_options as any,
      }).select();
      
      if (error) {
        console.error("Error creating school:", error);
        toast({ 
          title: "Erreur", 
          description: error.message || "Impossible de créer l'école." 
        });
        return;
      }
      
      toast({ title: "Succès", description: "École créée." });
      setDialogOpen(false);
      setCreateForm({ name: "", short_name: "", description: "", allowed_bac_options: [] });
      fetchSchools();
    } catch (e: any) {
      console.error("Unexpected error creating school:", e);
      toast({ 
        title: "Erreur", 
        description: e.message || "Une erreur inattendue s'est produite." 
      });
    }
  };

  /**
   * Delete a school and all associated data (applications, refusals, form_configs).
   * We delete related data first to avoid foreign key constraint errors if CASCADE is not set.
   */
  const deleteSchool = async (school: SchoolRow) => {
    try {
      // Delete related data first (in case ON DELETE CASCADE is not configured)
      await supabase.from("applications").delete().eq("school_id", school.id);
      await supabase.from("school_refusals").delete().eq("school_id", school.id);
      await supabase.from("form_configs").delete().eq("school_id", school.id);

      // Now delete the school itself
      const { error } = await supabase.from("schools").delete().eq("id", school.id);
      if (error) throw error;

      toast({ title: "Supprimé", description: `L'école "${school.name}" a été supprimée.` });
      setSchoolToDelete(null);
      fetchSchools();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de supprimer l'école." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des écoles</h1>
          <p className="text-muted-foreground">Activez/Désactivez les écoles et configurez leurs formulaires.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Ajouter une école</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle école</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Nom court</Label>
                <Input
                  value={createForm.short_name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, short_name: e.target.value }))}
                  placeholder="ENCG, EST, ..."
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Options Bac admises</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BAC_OPTIONS.map((opt) => {
                    const checked = createForm.allowed_bac_options.includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setCreateForm((p) => ({
                              ...p,
                              allowed_bac_options: v
                                ? [...p.allowed_bac_options, opt.value]
                                : p.allowed_bac_options.filter((x) => x !== opt.value),
                            }));
                          }}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={createSchool}>Créer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Liste des écoles {filtered.length > 0 && `(${filtered.length} école${filtered.length > 1 ? 's' : ''})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Rechercher par établissement..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
              >
                Tous
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                onClick={() => setStatusFilter("active")}
              >
                Activées
              </Button>
              <Button
                variant={statusFilter === "inactive" ? "default" : "outline"}
                onClick={() => setStatusFilter("inactive")}
              >
                Désactivées
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune école.</div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedSchools.map((school) => (
                <div
                  key={school.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{school.name}</div>
                      {school.is_active ? (
                        <Badge className="bg-green-600 hover:bg-green-600">Activée</Badge>
                      ) : (
                        <Badge variant="destructive">Désactivée</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Formulaires soumis: {school.applications_count ?? 0} · Refusés: {school.refusals_count ?? 0}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={school.is_active} onCheckedChange={(v) => toggleActive(school, v)} />
                      <span className="text-sm text-muted-foreground">{school.is_active ? "Activer" : "Désactiver"}</span>
                    </div>
                    <Button asChild variant="outline">
                      <Link to={`/admin/schools/${school.id}/form`}>Configurer le formulaire</Link>
                    </Button>
                    <Button variant="outline" onClick={() => openRefusals(school)}>
                      Refusés
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setSchoolToDelete(school)}
                      title="Supprimer l'école"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 pt-4 border-t">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {getPageNumbers().map((page, index) => (
                        <PaginationItem key={index}>
                          {page === 'ellipsis' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!refusalsOpen} onOpenChange={(o) => (!o ? setRefusalsOpen(null) : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Refus — {refusalsOpen?.school.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Commentaire: supprimer une ligne de refus permet à l'élève de revoir "Je veux postuler / Je ne suis pas intéressé(e)".
          </p>
          <div className="space-y-2">
            {(refusalsOpen?.rows ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun refus.</div>
            ) : (
              <div className="space-y-2">
                {(refusalsOpen?.rows ?? []).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="text-sm">
                      {r.profile ? `${r.profile.first_name} ${r.profile.last_name}` : r.user_id} —{" "}
                      <span className="text-muted-foreground">{r.profile?.massar_code ?? ""}</span>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => deleteRefusal(r.id)}>
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Fermer</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete School Confirmation Dialog */}
      <AlertDialog open={!!schoolToDelete} onOpenChange={(open) => !open && setSchoolToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'école ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{schoolToDelete?.name}</strong> ?
              <br />
              <br />
              Cette action est irréversible et supprimera également :
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>{schoolToDelete?.applications_count ?? 0} candidature(s)</li>
                <li>{schoolToDelete?.refusals_count ?? 0} refus</li>
                <li>La configuration du formulaire associé</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => schoolToDelete && deleteSchool(schoolToDelete)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

