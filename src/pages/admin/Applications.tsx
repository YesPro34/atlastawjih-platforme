import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ApplicationStatus, FormConfig, Profile, School } from "@/types/database";
import { APPLICATION_STATUS_LABELS } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";

type ApplicationRow = {
  id: string;
  user_id: string;
  school_id: string;
  status: ApplicationStatus;
  form_data: any;
  admin_note: string | null;
  submitted_at: string;
  updated_at: string;
  school?: School;
  profile?: Profile;
};

/**
 * Admin "Candidatures" page:
 * - filter by school / status / search (name or massar)
 * - update status + admin note
 * - delete a candidature (admin-only, per PDF)
 * - per-school export (CSV compatible with Excel) with JSON flattening
 */
export default function AdminApplications() {
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [rows, setRows] = useState<ApplicationRow[]>([]);

  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ApplicationRow | null>(null);
  const [editStatus, setEditStatus] = useState<ApplicationStatus>("en_attente");
  const [editNote, setEditNote] = useState("");

  // Add application dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [massarSearch, setMassarSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [addSchoolName, setAddSchoolName] = useState<string>("");
  const [addDiplome, setAddDiplome] = useState<string>("");
  const [addStatus, setAddStatus] = useState<ApplicationStatus>("en_attente");
  const [addDate, setAddDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [addNote, setAddNote] = useState<string>("");
  const [searchingStudent, setSearchingStudent] = useState(false);

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const schoolsRes = await supabase.from("schools").select("*").order("name");
      setSchools((schoolsRes.data as any) ?? []);

      const appsRes = await supabase
        .from("applications")
        .select("id, user_id, school_id, status, form_data, admin_note, submitted_at, updated_at")
        .order("submitted_at", { ascending: false });
      if (appsRes.error) throw appsRes.error;

      const apps = (appsRes.data ?? []) as any[];
      const userIds = Array.from(new Set(apps.map((a) => a.user_id)));
      const schoolIds = Array.from(new Set(apps.map((a) => a.school_id)));

      const [profilesRes, schoolsByIdRes] = await Promise.all([
        supabase.from("profiles").select("user_id, first_name, last_name, massar_code").in("user_id", userIds),
        supabase.from("schools").select("*").in("id", schoolIds),
      ]);

      const profiles = (profilesRes.data ?? []) as any[];
      const schoolsRows = (schoolsByIdRes.data ?? []) as any[];
      const profileByUser = new Map<string, Profile>(profiles.map((p) => [p.user_id, p as Profile]));
      const schoolById = new Map<string, School>(schoolsRows.map((s) => [s.id, s as School]));

      const merged: ApplicationRow[] = apps.map((a) => ({
        ...(a as any),
        school: schoolById.get(a.school_id),
        profile: profileByUser.get(a.user_id),
      }));
      setRows(merged);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de charger les candidatures." });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSchool = schoolFilter === "all" || r.school_id === schoolFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const name = `${r.profile?.first_name ?? ""} ${r.profile?.last_name ?? ""}`.trim().toLowerCase();
      const massar = (r.profile?.massar_code ?? "").toLowerCase();
      const matchesQ = !search || name.includes(search) || massar.includes(search);
      return matchesSchool && matchesStatus && matchesQ;
    });
  }, [rows, q, schoolFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [q, schoolFilter, statusFilter]);

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

  const openEdit = (row: ApplicationRow) => {
    setEditing(row);
    setEditStatus(row.status);
    setEditNote(row.admin_note ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("applications")
      .update({ status: editStatus, admin_note: editNote } as any)
      .eq("id", editing.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer." });
      return;
    }

    // Log for admin journal
    await supabase.from("activity_logs").insert({
      action: "application_updated",
      entity_type: "application",
      entity_id: editing.id,
      details: { status: editStatus },
    } as any);

    toast({ title: "Enregistré", description: "Candidature mise à jour." });
    setEditOpen(false);
    setEditing(null);
    load();
  };

  const deleteApplication = async (row: ApplicationRow) => {
    const { error } = await supabase.from("applications").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la candidature." });
      return;
    }
    await supabase.from("activity_logs").insert({
      action: "application_deleted",
      entity_type: "application",
      entity_id: row.id,
      details: { school_id: row.school_id, user_id: row.user_id },
    } as any);
    toast({ title: "Supprimée", description: "Candidature supprimée." });
    load();
  };

  const exportSchoolCsv = async () => {
    if (schoolFilter === "all") {
      toast({ title: "Choisir une école", description: "Sélectionnez une école pour exporter ses candidatures." });
      return;
    }
    const school = schools.find((s) => s.id === schoolFilter);
    if (!school) return;

    const [{ data: apps }, { data: cfgRow }] = await Promise.all([
      supabase
        .from("applications")
        .select("user_id, school_id, submitted_at, admin_note, form_data")
        .eq("school_id", schoolFilter)
        .order("submitted_at", { ascending: true }),
      supabase.from("form_configs").select("*").eq("school_id", schoolFilter).maybeSingle(),
    ]);

    const userIds = Array.from(new Set((apps ?? []).map((a: any) => a.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, massar_code")
      .in("user_id", userIds);
    const profileByUser = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));

    const cfg = ((cfgRow as any)?.config ?? {}) as any;
    const maxChoices = (cfg?.maxChoices ?? (cfgRow as any)?.max_choices ?? 1) as number;
    const extraFields = (cfg?.extraFields ?? []) as any[];

    const fixedHeader = ["Nom complet", "Massar", "Nom École", "Date soumission", "Remarques admin"];
    const choiceHeaders = Array.from({ length: maxChoices }, (_, i) => `Choix ${i + 1}`);
    const extraHeaders = extraFields.map((f: any) => f.label || f.key);
    const header = [...fixedHeader, ...choiceHeaders, ...extraHeaders];

    const lines = (apps ?? []).map((a: any) => {
      const p = profileByUser.get(a.user_id);
      const fullName = p ? `${p.first_name} ${p.last_name}` : "";
      const massar = p?.massar_code ?? "";

      const form = a.form_data ?? {};
      const choices = Array.isArray(form.choices) ? form.choices : [];
      const choiceCols = Array.from({ length: maxChoices }, (_, i) => choices[i] ?? "");

      const extraCols = extraFields.map((f: any) => {
        const key = f.key;
        return key ? form[key] ?? "" : "";
      });

      const row = [
        fullName,
        massar,
        school.name,
        new Date(a.submitted_at).toLocaleString(),
        a.admin_note ?? "",
        ...choiceCols,
        ...extraCols,
      ];

      return row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `candidatures_${school.name}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Candidatures</h1>
          <p className="text-muted-foreground">
            Filtrer, modifier l’état, ajouter une remarque et exporter par école (comme demandé dans le PDF admin).
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddOpen(true)}>
            Ajouter une candidature
          </Button>
          <Button variant="outline" onClick={exportSchoolCsv} disabled={schoolFilter === "all"}>
            Export école (CSV/Excel)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Rechercher (Nom, Massar...)" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger>
              <SelectValue placeholder="École" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les écoles</SelectItem>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Liste {filtered.length > 0 && `(${filtered.length} candidature${filtered.length > 1 ? 's' : ''})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune candidature.</div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedRows.map((r) => (
                  <div key={r.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">
                          {r.profile ? `${r.profile.first_name} ${r.profile.last_name}` : "—"}
                        </div>
                        <Badge variant="outline">{r.profile?.massar_code ?? "Massar —"}</Badge>
                        <Badge className="bg-muted text-foreground hover:bg-muted">{r.school?.name ?? "École —"}</Badge>
                        <Badge variant="secondary">{APPLICATION_STATUS_LABELS[r.status]}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Soumise le {new Date(r.submitted_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                        Gérer
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">Supprimer</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer la candidature ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. (Demandé: seul l'admin peut supprimer une candidature.)
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex justify-end gap-2">
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteApplication(r)}>Supprimer</AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Gérer la candidature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {editing?.profile ? `${editing.profile.first_name} ${editing.profile.last_name}` : "—"} —{" "}
                {editing?.school?.name ?? "—"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Statut</div>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ApplicationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Remarque admin</div>
              <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={5} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Annuler
              </Button>
              <Button onClick={saveEdit}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Application Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open);
        if (!open) {
          // Reset form when closing
          setMassarSearch("");
          setSelectedStudent(null);
          setAddSchoolName("");
          setAddDiplome("");
          setAddStatus("en_attente");
          setAddDate(new Date().toISOString().split('T')[0]);
          setAddNote("");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter une candidature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Student CNE/Massar Search */}
            <div className="space-y-2">
              <Label htmlFor="massar">CNE/Massar de l'étudiant</Label>
              <div className="flex gap-2">
                <Input
                  id="massar"
                  placeholder="Entrez le code Massar ou CNE"
                  value={massarSearch}
                  onChange={(e) => setMassarSearch(e.target.value)}
                  onBlur={async () => {
                    if (massarSearch.trim()) {
                      setSearchingStudent(true);
                      const { data, error } = await supabase
                        .from("profiles")
                        .select("user_id, first_name, last_name, massar_code")
                        .eq("massar_code", massarSearch.trim())
                        .maybeSingle();
                      
                      if (error || !data) {
                        toast({
                          title: "Erreur",
                          description: "Étudiant introuvable avec ce code Massar.",
                          variant: "destructive",
                        });
                        setSelectedStudent(null);
                      } else {
                        setSelectedStudent(data as Profile);
                      }
                      setSearchingStudent(false);
                    }
                  }}
                />
                {searchingStudent && (
                  <div className="flex items-center text-sm text-muted-foreground">Recherche...</div>
                )}
              </div>
              {selectedStudent && (
                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  Étudiant trouvé: {selectedStudent.first_name} {selectedStudent.last_name}
                </div>
              )}
            </div>

            {/* School Name */}
            <div className="space-y-2">
              <Label htmlFor="school">Établissement/Bourse</Label>
              <Textarea
                id="school"
                value={addSchoolName}
                onChange={(e) => setAddSchoolName(e.target.value)}
                rows={3}
                placeholder="Entrez le nom de l'établissement ou de la bourse..."
              />
            </div>

            {/* Diplome */}
            <div className="space-y-2">
              <Label htmlFor="diplome">Diplôme</Label>
              <Textarea
                id="diplome"
                value={addDiplome}
                onChange={(e) => setAddDiplome(e.target.value)}
                rows={3}
                placeholder="Entrez le diplôme délivré..."
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">État</Label>
              <Select value={addStatus} onValueChange={(v) => setAddStatus(v as ApplicationStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Application Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date d'application</Label>
              <Input
                id="date"
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                rows={4}
                placeholder="Remarques ou notes additionnelles..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={async () => {
                  if (!selectedStudent) {
                    toast({
                      title: "Erreur",
                      description: "Veuillez rechercher et sélectionner un étudiant.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!addSchoolName.trim()) {
                    toast({
                      title: "Erreur",
                      description: "Veuillez entrer le nom de l'établissement ou de la bourse.",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Use first school as placeholder school_id (required by DB schema)
                  // Store the actual school name and diplome in form_data
                  const placeholderSchoolId = schools.length > 0 ? schools[0].id : null;
                  
                  if (!placeholderSchoolId) {
                    toast({
                      title: "Erreur",
                      description: "Aucune école disponible dans le système. Veuillez d'abord créer une école.",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Create application
                  const submittedDate = new Date(addDate);
                  submittedDate.setHours(new Date().getHours());
                  submittedDate.setMinutes(new Date().getMinutes());

                  const { error } = await supabase.from("applications").insert({
                    user_id: selectedStudent.user_id,
                    school_id: placeholderSchoolId,
                    status: addStatus,
                    admin_note: addNote.trim() || null,
                    form_data: {
                      school_name: addSchoolName.trim(),
                      diplome: addDiplome.trim() || null,
                      created_by_admin: true,
                    } as any,
                    submitted_at: submittedDate.toISOString(),
                  } as any);

                  if (error) {
                    toast({
                      title: "Erreur",
                      description: "Impossible d'ajouter la candidature.",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Log activity
                  await supabase.from("activity_logs").insert({
                    action: "application_created",
                    entity_type: "application",
                    entity_id: null,
                    details: { 
                      school_name: addSchoolName.trim(),
                      user_id: selectedStudent.user_id,
                      created_by_admin: true,
                    },
                  } as any);

                  toast({
                    title: "Succès",
                    description: "Candidature ajoutée avec succès.",
                  });

                  setAddOpen(false);
                  // Reset form
                  setMassarSearch("");
                  setSelectedStudent(null);
                  setAddSchoolName("");
                  setAddDiplome("");
                  setAddStatus("en_attente");
                  setAddDate(new Date().toISOString().split('T')[0]);
                  setAddNote("");
                  load();
                }}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

