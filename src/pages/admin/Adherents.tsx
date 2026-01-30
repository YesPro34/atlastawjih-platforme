export default function Adherents() {
  // Note: Layout is provided by the route wrapper in `src/App.tsx`.
  // This page implements the "Voir les adhérents" sub-page from `ESPACE  ADMIN.pdf`.
  return <AdherentsPage />;
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ApplicationStatus, BacOption, Profile } from "@/types/database";
import { BAC_OPTIONS } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

type AdherentRow = Profile & {
  validatedCount: number;
  preselectedCount: number;
  admittedCount: number;
};

function AdherentsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdherentRow[]>([]);

  const [q, setQ] = useState("");
  const [bacYear, setBacYear] = useState<string>("all");
  const [bacOption, setBacOption] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdherentRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    user_id: "",
    first_name: "",
    last_name: "",
    massar_code: "",
    email: "",
    phone: "",
    parent_phone: "",
    city: "",
    lycee: "",
    bac_year: "",
    bac_option: "" as BacOption | "",
  });

  useEffect(() => {
    fetchRows();
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = (profiles ?? []).map((p: any) => p.user_id);
      const { data: apps } = await supabase
        .from("applications")
        .select("user_id, status")
        .in("user_id", userIds);

      const map = new Map<
        string,
        { validated: number; preselected: number; admitted: number }
      >();

      (apps ?? []).forEach((a: any) => {
        const cur = map.get(a.user_id) ?? { validated: 0, preselected: 0, admitted: 0 };
        if (a.status === "validee") cur.validated += 1;
        if (a.status === "preselectionne") cur.preselected += 1;
        if (a.status === "admis") cur.admitted += 1;
        map.set(a.user_id, cur);
      });

      const out: AdherentRow[] = (profiles ?? []).map((p: any) => {
        const c = map.get(p.user_id) ?? { validated: 0, preselected: 0, admitted: 0 };
        return {
          ...(p as Profile),
          validatedCount: c.validated,
          preselectedCount: c.preselected,
          admittedCount: c.admitted,
        };
      });

      setRows(out);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de charger les adhérents." });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const search = q.trim().toLowerCase();
      const matchesQ =
        !search ||
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(search) ||
        (r.massar_code ?? "").toLowerCase().includes(search);

      const matchesYear = bacYear === "all" || String(r.bac_year ?? "") === bacYear;
      const matchesOption = bacOption === "all" || String(r.bac_option ?? "") === bacOption;
      const active = (r as any).is_active !== false;
      const matchesStatus =
        status === "all" || (status === "active" && active) || (status === "inactive" && !active);
      return matchesQ && matchesYear && matchesOption && matchesStatus;
    });
  }, [rows, q, bacYear, bacOption, status]);

  const openEdit = (row: AdherentRow) => {
    setEditing(row);
    setEditForm({
      first_name: row.first_name,
      last_name: row.last_name,
      massar_code: row.massar_code,
      email: (row as any).email ?? null,
      phone: row.phone,
      parent_phone: (row as any).parent_phone ?? null,
      city: row.city,
      lycee: row.lycee,
      bac_year: row.bac_year,
      bac_option: row.bac_option,
      username: (row as any).username ?? null,
      birth_date: (row as any).birth_date ?? null,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    // Why: admin can update adherent information from the dashboard.
    const { error } = await supabase.from("profiles").update(editForm as any).eq("id", editing.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer les modifications." });
      return;
    }
    toast({ title: "Modifié", description: "Informations mises à jour." });
    setEditOpen(false);
    setEditing(null);
    setEditForm({});
    fetchRows();
  };

  const toggleActive = async (row: AdherentRow, next: boolean) => {
    // Why: "Désactiver le compte" must prevent the adherent from accessing the app.
    // We enforce this in-app via `useAuth` + `ProtectedRoute` reading `profiles.is_active`.
    const { error } = await supabase.from("profiles").update({ is_active: next } as any).eq("id", row.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de modifier le statut." });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? ({ ...r, is_active: next } as any) : r)));
  };

  const resetPassword = async (row: AdherentRow) => {
    const email = (row as any).email as string | null | undefined;
    if (!email) {
      toast({ title: "Email manquant", description: "Ajoutez l'email de l'adhérent pour réinitialiser le mot de passe." });
      return;
    }
    // Why: client-side password reset is possible via Supabase email reset flow (no service key needed).
    // Redirect to our custom reset password page
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer l'email de réinitialisation." });
      return;
    }
    toast({ title: "Envoyé", description: "Email de réinitialisation envoyé." });
  };

  const deleteAdherentData = async (row: AdherentRow) => {
    // Important: from the client we cannot delete auth.users rows. We delete *app data* and remove roles,
    // which effectively blocks access in this app (no role + profile removed).
    const userId = row.user_id;
    const [appsDel, refusalsDel, notifsDel, rolesDel, profileDel] = await Promise.all([
      supabase.from("applications").delete().eq("user_id", userId),
      supabase.from("school_refusals").delete().eq("user_id", userId),
      supabase.from("notifications").delete().eq("user_id", userId),
      supabase.from("user_roles").delete().eq("user_id", userId),
      supabase.from("profiles").delete().eq("user_id", userId),
    ]);
    const anyError = appsDel.error || refusalsDel.error || notifsDel.error || rolesDel.error || profileDel.error;
    if (anyError) {
      toast({ title: "Erreur", description: "Suppression incomplète (vérifiez les permissions RLS)." });
      return;
    }
    toast({ title: "Supprimé", description: "Données de l’adhérent supprimées." });
    fetchRows();
  };

  const exportCsv = () => {
    // Why: PDF requires "Export Excel". We export CSV which opens in Excel cleanly without extra dependencies.
    const header = [
      "Nom complet",
      "Massar",
      "Bac",
      "Option",
      "Candidatures validées",
      "Présélectionné",
      "Admis",
      "Statut",
    ];
    const lines = filtered.map((r) => {
      const fullName = `${r.first_name} ${r.last_name}`;
      const active = (r as any).is_active !== false;
      return [
        fullName,
        r.massar_code ?? "",
        r.bac_year ?? "",
        r.bac_option ?? "",
        r.validatedCount,
        r.preselectedCount,
        r.admittedCount,
        active ? "Actif" : "Désactivé",
      ]
        .map((v) => `"${String(v).replace('"', '""')}"`)
        .join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adherents_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(rows.map((r) => r.bac_year).filter(Boolean) as number[]));
    years.sort((a, b) => b - a);
    return years;
  }, [rows]);

  return (
      <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des adhérents</h1>
          <p className="text-muted-foreground">Recherche, filtres, statut, réinitialisation et export.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)}>Ajouter un adhérent</Button>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            Export CSV (Excel)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Rechercher (Nom, Massar...)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select value={bacYear} onValueChange={setBacYear}>
              <SelectTrigger>
                <SelectValue placeholder="Bac" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les bacs</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Bac {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bacOption} onValueChange={setBacOption}>
              <SelectTrigger>
                <SelectValue placeholder="Option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes options</SelectItem>
                {BAC_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Désactivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun adhérent.</div>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3">Nom complet</th>
                    <th className="p-3">Massar</th>
                    <th className="p-3">Bac</th>
                    <th className="p-3">Option</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Mot de passe</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const active = (r as any).is_active !== false;
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 font-medium">{r.first_name} {r.last_name}</td>
                        <td className="p-3">{r.massar_code ?? "-"}</td>
                        <td className="p-3">{r.bac_year ? `Bac ${r.bac_year}` : "-"}</td>
                        <td className="p-3">{r.bac_option ?? "-"}</td>

                        <td className="p-3">
                          {active ? (
                            <Badge className="bg-green-600 hover:bg-green-600">Actif</Badge>
                          ) : (
                            <Badge variant="destructive">Désactivé</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="outline" onClick={() => resetPassword(r)} disabled={!(r as any).email}>
                            Réinitialiser
                          </Button>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                              Modifier
                            </Button>
                            <div className="flex items-center gap-2 rounded-md border px-2 py-1">
                              <Switch checked={active} onCheckedChange={(v) => toggleActive(r, v)} />
                              <span className="text-xs text-muted-foreground">
                                {active ? "Actif" : "Désactivé"}
                              </span>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">Supprimer</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer définitivement cet adhérent ?\n
                                    Commentaire: on supprime les données applicatives (profil, candidatures, rôles...).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex justify-end gap-2">
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteAdherentData(r)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifier l’adhérent</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={String(editForm.first_name ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={String(editForm.last_name ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>CNE / Massar</Label>
              <Input value={String(editForm.massar_code ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, massar_code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={String((editForm as any).email ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value } as any))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={String(editForm.phone ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone parent</Label>
              <Input value={String((editForm as any).parent_phone ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, parent_phone: e.target.value } as any))} />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input value={String(editForm.city ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Lycée</Label>
              <Input value={String(editForm.lycee ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, lycee: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Bac (année)</Label>
              <Input
                type="number"
                value={String(editForm.bac_year ?? "")}
                onChange={(e) => setEditForm((p) => ({ ...p, bac_year: Number(e.target.value || 0) || null }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Option</Label>
              <Select value={String(editForm.bac_option ?? "")} onValueChange={(v) => setEditForm((p) => ({ ...p, bac_option: v as BacOption }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {BAC_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ajouter un nouvel adhérent</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Commentaire: depuis un navigateur, on ne peut pas créer un utilisateur Supabase Auth avec mot de passe “au nom
            de l’admin” (il faut une clé service-role). Cette UI permet donc d’associer un profil/role à un utilisateur
            déjà créé dans Supabase (ID utilisateur).
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>User ID (UUID Supabase Auth)</Label>
              <Input value={createForm.user_id} onChange={(e) => setCreateForm((p) => ({ ...p, user_id: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={createForm.first_name} onChange={(e) => setCreateForm((p) => ({ ...p, first_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={createForm.last_name} onChange={(e) => setCreateForm((p) => ({ ...p, last_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>CNE / Massar</Label>
              <Input value={createForm.massar_code} onChange={(e) => setCreateForm((p) => ({ ...p, massar_code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone parent</Label>
              <Input value={createForm.parent_phone} onChange={(e) => setCreateForm((p) => ({ ...p, parent_phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input value={createForm.city} onChange={(e) => setCreateForm((p) => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Lycée</Label>
              <Input value={createForm.lycee} onChange={(e) => setCreateForm((p) => ({ ...p, lycee: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Bac (année)</Label>
              <Input type="number" value={createForm.bac_year} onChange={(e) => setCreateForm((p) => ({ ...p, bac_year: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Option</Label>
              <Select value={createForm.bac_option} onValueChange={(v) => setCreateForm((p) => ({ ...p, bac_option: v as BacOption }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {BAC_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button
              onClick={async () => {
                if (!createForm.user_id || !createForm.first_name || !createForm.last_name) {
                  toast({ title: "Champs requis", description: "User ID, prénom et nom sont obligatoires." });
                  return;
                }
                const { error: profileErr } = await supabase.from("profiles").insert({
                  user_id: createForm.user_id,
                  first_name: createForm.first_name,
                  last_name: createForm.last_name,
                  massar_code: createForm.massar_code || null,
                  email: createForm.email || null,
                  phone: createForm.phone || null,
                  parent_phone: createForm.parent_phone || null,
                  city: createForm.city || null,
                  lycee: createForm.lycee || null,
                  bac_year: createForm.bac_year ? Number(createForm.bac_year) : null,
                  bac_option: createForm.bac_option || null,
                  is_active: true,
                } as any);
                if (profileErr) {
                  toast({ title: "Erreur", description: "Impossible de créer le profil." });
                  return;
                }
                // Give the user the adherent role so they can access student pages.
                const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: createForm.user_id, role: "adherent" } as any);
                if (roleErr) {
                  toast({ title: "Erreur", description: "Profil créé mais rôle non assigné." });
                } else {
                  toast({ title: "Créé", description: "Adhérent créé avec succès." });
                }
                setCreateOpen(false);
                setCreateForm({
                  user_id: "",
                  first_name: "",
                  last_name: "",
                  massar_code: "",
                  email: "",
                  phone: "",
                  parent_phone: "",
                  city: "",
                  lycee: "",
                  bac_year: "",
                  bac_option: "",
                });
                fetchRows();
              }}
            >
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
