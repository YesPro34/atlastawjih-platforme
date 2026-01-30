import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import type { BacOption, FormConfig, School } from "@/types/database";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FieldType = "text" | "textarea" | "number" | "date" | "select" | "radio" | "checkbox";
type BuilderField = { id: string; key: string; label: string; type: FieldType; required?: boolean; options?: string[] };

/**
 * Student page that renders ONE school's dynamic form.
 *
 * For now, we support:
 * - extraFields described in admin config
 * - choices models via "builderType" + cities/filieres lists
 *
 * Why: keeps a single dynamic system as requested in `ecoles formulaires dynamique.pdf`.
 */
export default function StudentSchoolApply() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [configRow, setConfigRow] = useState<FormConfig | null>(null);
  const [bacOption, setBacOption] = useState<BacOption | null>(null);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [choices, setChoices] = useState<string[]>([]);
  // Temporary filière selection before adding to the city-specific list
  const [tempFiliere, setTempFiliere] = useState<string>("");
  // Per-city filière ranking list (max 3 filières per city before committing)
  const [tempCityChoices, setTempCityChoices] = useState<string[]>([]);
  // For encg_zone_rank: track the committed region to lock student to that region
  const [committedRegion, setCommittedRegion] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !schoolId) return;
    load();
  }, [user, schoolId]);

  const load = async () => {
    setLoading(true);
    try {
      const [schoolRes, configRes, profileRes] = await Promise.all([
        supabase.from("schools").select("*").eq("id", schoolId).maybeSingle(),
        supabase.from("form_configs").select("*").eq("school_id", schoolId).maybeSingle(),
        supabase.from("profiles").select("bac_option").eq("user_id", user?.id).maybeSingle(),
      ]);
      if (schoolRes.error) throw schoolRes.error;
      setSchool((schoolRes.data as any) ?? null);
      setConfigRow((configRes.data as any) ?? null);
      setBacOption((profileRes.data?.bac_option as BacOption | null) ?? null);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de charger le formulaire." });
    } finally {
      setLoading(false);
    }
  };

  const config = useMemo(() => (configRow?.config ?? {}) as any, [configRow]);
  const builderType = (config?.builderType ?? "single_city") as string;
  const maxChoices = (config?.maxChoices ?? configRow?.max_choices ?? 1) as number;
  // Max filières per city (hardcoded to 3 as per user requirement)
  // For scenario 8 (encg_zone_rank), we use maxChoices instead since zones can have many schools
  const MAX_FILIERES_PER_CITY = useMemo(() => {
    return builderType === "encg_zone_rank" ? maxChoices : 3;
  }, [builderType, maxChoices]);
  const cities = (config?.cities ?? configRow?.cities ?? []) as string[];
  const filieres = (config?.filieres ?? configRow?.filieres ?? []) as any[];
  const filieresByCity = (config?.filieresByCity ?? {}) as Record<string, any[]>;
  const allowedBacOptions = (config?.allowedBacOptions ?? []) as BacOption[];
  const extraFields = (config?.extraFields ?? []) as BuilderField[];

  // Fix: Fallback to keys from filieresByCity if the explicit cities array is empty.
  // This handles the case where admin only fills the JSON mapping without the "Villes" textarea.
  // For encg_zone_rank: if a region is committed, only show that region
  const cityOptions = useMemo(() => {
    const allOptions = cities.length > 0 ? cities : Object.keys(filieresByCity);
    // For encg_zone_rank scenario, if a region is committed, lock to that region only
    if (builderType === "encg_zone_rank" && committedRegion) {
      return allOptions.filter((c) => c === committedRegion);
    }
    return allOptions;
  }, [cities, filieresByCity, builderType, committedRegion]);

  // Fix: Filter filieres based on the student's Bac option.
  // The admin JSON structure is { name: string, allowedBacOptions?: string[] }.
  // If a filiere has allowedBacOptions defined, only show it if the student's Bac is in the list.
  // For scenario 8 (encg_zone_rank), the values are strings (school names), not objects.
  const filiereOptions = useMemo(() => {
    const rawList = selectedCity ? filieresByCity[selectedCity] : filieres;
    if (!rawList || !Array.isArray(rawList)) return [];

    // For scenario 8, values are strings (school names), so return them directly
    if (builderType === "encg_zone_rank") {
      return rawList.map((f: any) => (typeof f === "string" ? f : f?.name || f)).filter(Boolean);
    }

    return rawList.filter((f: any) => {
      // Handle both string and object formats
      if (typeof f === "string") return true;
      const allowed = f?.allowedBacOptions;
      // If no allowedBacOptions defined or empty, show the filiere to everyone
      if (!allowed || !Array.isArray(allowed) || allowed.length === 0) return true;
      // If student's bac option is in the allowed list, show it
      return bacOption && allowed.includes(bacOption);
    });
  }, [selectedCity, filieresByCity, filieres, bacOption, builderType]);

  const isEligible = useMemo(() => {
    if (!bacOption) return true;
    if (!allowedBacOptions?.length) return true;
    return allowedBacOptions.includes(bacOption);
  }, [allowedBacOptions, bacOption]);

  const addChoice = (value: string) => {
    if (!value) return;
    setChoices((prev) => {
      if (prev.includes(value)) return prev;
      if (prev.length >= maxChoices) return prev;
      return [...prev, value];
    });
  };

  const removeChoice = (value: string) => setChoices((prev) => prev.filter((x) => x !== value));

  /**
   * Add a filière to the per-city temporary ranking list.
   * For scenario 8 (encg_zone_rank), we allow ranking all schools in a zone up to maxChoices.
   */
  const addToCityChoices = (filiere: string) => {
    if (!filiere) return;
    if (tempCityChoices.includes(filiere)) {
      const itemLabel = builderType === "encg_zone_rank" ? "cette école" : "cette filière";
      toast({ title: "Déjà dans la liste", description: `${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} est déjà dans votre classement pour ${builderType === "encg_zone_rank" ? "cette zone" : "cette ville"}.` });
      return;
    }
    // For scenario 8, we use maxChoices directly (no per-zone limit)
    // For other scenarios, we limit to MAX_FILIERES_PER_CITY per city
    const perCityLimit = builderType === "encg_zone_rank" ? maxChoices : MAX_FILIERES_PER_CITY;
    if (tempCityChoices.length >= perCityLimit) {
      const limitLabel = builderType === "encg_zone_rank" ? `${maxChoices} écoles par zone` : `${MAX_FILIERES_PER_CITY} filières par ville`;
      toast({ title: "Limite atteinte", description: `Maximum ${limitLabel}.` });
      return;
    }
    // Check if adding would exceed global max
    const potentialTotal = choices.length + tempCityChoices.length + 1;
    if (potentialTotal > maxChoices) {
      toast({ title: "Limite globale atteinte", description: `Maximum ${maxChoices} choix au total.` });
      return;
    }
    setTempCityChoices((prev) => [...prev, filiere]);
    setTempFiliere(""); // Reset the dropdown
  };

  /**
   * Remove a filière from the per-city temporary ranking list.
   */
  const removeFromCityChoices = (filiere: string) => {
    setTempCityChoices((prev) => prev.filter((f) => f !== filiere));
  };

  /**
   * Commit all filières from the current city to the global choices list.
   * Each entry is formatted as "City — Filière".
   * For encg_zone_rank: lock the student to the first committed region.
   */
  const handleCommitCityChoices = () => {
    if (!selectedCity) {
      toast({ title: "Ville requise", description: "Veuillez d'abord choisir une ville." });
      return;
    }
    if (tempCityChoices.length === 0) {
      toast({ title: "Aucune filière", description: "Ajoutez au moins une filière avant de valider." });
      return;
    }
    // For encg_zone_rank: if a region is already committed, prevent adding from different region
    if (builderType === "encg_zone_rank" && committedRegion && committedRegion !== selectedCity) {
      toast({ 
        title: "Région verrouillée", 
        description: `Vous avez déjà validé des choix pour ${committedRegion}. Vous ne pouvez pas ajouter des écoles d'une autre région.` 
      });
      return;
    }
    // Check if adding would exceed global max
    if (choices.length + tempCityChoices.length > maxChoices) {
      toast({ title: "Limite dépassée", description: `Vous ne pouvez pas dépasser ${maxChoices} choix au total.` });
      return;
    }
    // Format each city choice and add to global list
    const newChoices = tempCityChoices.map((f) => `${selectedCity} — ${f}`);
    // Check for duplicates
    const duplicates = newChoices.filter((c) => choices.includes(c));
    if (duplicates.length > 0) {
      toast({ title: "Doublons détectés", description: "Certains choix existent déjà dans votre liste." });
      return;
    }
    setChoices((prev) => [...prev, ...newChoices]);
    // For encg_zone_rank: lock to the first committed region
    const isFirstCommit = builderType === "encg_zone_rank" && !committedRegion;
    if (isFirstCommit) {
      setCommittedRegion(selectedCity);
    }
    // Reset for next city (but keep selectedCity if we're locked to it for encg_zone_rank)
    if (builderType === "encg_zone_rank") {
      // Keep selectedCity if locked to region, but reset temp choices so student can add more schools
      setTempFiliere("");
      setTempCityChoices([]);
    } else {
      setSelectedCity("");
      setTempFiliere("");
      setTempCityChoices([]);
    }
    toast({ title: "Choix ajoutés", description: `${newChoices.length} filière(s) ajoutée(s) à votre classement.` });
  };

  /**
   * Reset the city/filière selection to start fresh for a new city.
   * For encg_zone_rank: prevent reset if region is already committed.
   */
  const handleResetSelection = () => {
    // For encg_zone_rank: prevent resetting if a region is already committed
    if (builderType === "encg_zone_rank" && committedRegion) {
      toast({ 
        title: "Région verrouillée", 
        description: `Vous avez déjà validé des choix pour ${committedRegion}. Vous ne pouvez pas changer de région.` 
      });
      return;
    }
    setSelectedCity("");
    setTempFiliere("");
    setTempCityChoices([]);
  };

  const submit = async () => {
    if (!user || !schoolId || !school) return;
    if (!isEligible) {
      toast({ title: "Non éligible", description: "Votre option du Bac n'est pas admissible pour cette école." });
      return;
    }

    // Store a normalized representation for exports:
    // - `choices`: ordered list (ranking)
    // - other answers: `formData`
    const payload = {
      ...formData,
      builderType,
      selectedCity: selectedCity || null,
      choices,
    };

    const { error } = await supabase.from("applications").insert({
      user_id: user.id,
      school_id: schoolId,
      form_data: payload as any,
      status: "en_attente",
    } as any);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer la candidature (déjà soumise ?)." });
      return;
    }

    // Track activity for admin "journal".
    await supabase.from("activity_logs").insert({
      action: "application_created",
      entity_type: "application",
      entity_id: null,
      details: { school_id: schoolId, user_id: user.id },
    } as any);

    toast({ title: "Candidature envoyée", description: `Votre candidature à ${school.name} a été enregistrée.` });
    navigate("/student/applications");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Chargement...</div>;
  if (!school) return <div className="text-sm text-muted-foreground">École introuvable.</div>;
  if (!configRow) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Aucun formulaire configuré pour cette école.</div>
        <Button variant="outline" onClick={() => navigate("/student/apply")}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formulaire — {school.name}</h1>
          <p className="text-muted-foreground">
            Remplissez le formulaire. Les choix sont limités selon la configuration de l’école.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/student/apply")}>
          Retour
        </Button>
      </div>

      {!isEligible ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Votre option du Bac n'est pas admissible pour cette école.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choix principaux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scénario: Sélection d'une seule ville (sans classement de filières) */}
          {builderType === "single_city" && (
            <div className="space-y-2">
              <Label>Ville</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une ville..." />
                </SelectTrigger>
                <SelectContent>
                  {cityOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Classement direct de villes (Scénario "ranking many cities") */}
          {builderType === "rank_cities" && (
            <div className="space-y-2">
              <Label>Classement des villes (max {maxChoices})</Label>
              <Select
                value=""
                onValueChange={(v) => {
                  addChoice(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ajouter une ville..." />
                </SelectTrigger>
                <SelectContent>
                  {cityOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                {choices.map((c, idx) => (
                  <div key={c} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">#{idx + 1}</span>
                      {c}
                    </div>
                    <Button variant="ghost" onClick={() => removeChoice(c)}>
                      Retirer
                    </Button>
                  </div>
                ))}
                {choices.length === 0 ? <div className="text-sm text-muted-foreground">Aucun choix ajouté.</div> : null}
              </div>
            </div>
          )}

          {/* Scénario 3: Ville → puis classement de filières (multi-city, multi-filière support)
              Flow: 1) Choisir ville 2) Classer jusqu'à 3 filières 3) Valider 4) Répéter pour autres villes
              Scénario 8: Zone → puis classement d'écoles ENCG (multi-zone, multi-école support) */}
          {(builderType === "city_then_rank_filieres" ||
            builderType === "complex_city_filiere_bac_rank" ||
            builderType === "cpge" ||
            builderType === "encg_zone_rank") && (
            <div className="space-y-6">
              {builderType === "encg_zone_rank" ? (
                <p className="text-sm text-muted-foreground">
                  Choisissez une zone, classez jusqu'à {maxChoices} écoles ENCG, puis cliquez sur "Ajouter ces choix".
                  {committedRegion ? (
                    <span className="font-medium text-foreground"> Vous êtes verrouillé à la région {committedRegion}.</span>
                  ) : (
                    <span> Une fois validé, vous serez verrouillé à cette région (max {maxChoices} choix au total).</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Choisissez une ville, classez jusqu'à {MAX_FILIERES_PER_CITY} filières, puis cliquez sur "Ajouter ces choix".
                  Vous pouvez répéter pour d'autres villes (max {maxChoices} choix au total).
                </p>
              )}

              {/* City Choice Builder Card */}
              <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground">
                    {selectedCity ? `Classement pour ${selectedCity}` : "Construire vos choix"}
                  </div>
                  {selectedCity && (
                    <Button variant="ghost" size="sm" onClick={handleResetSelection}>
                      Changer de ville
                    </Button>
                  )}
                </div>

                {/* Step 1: City/Zone selector */}
                <div className="space-y-2">
                  <Label>1. {builderType === "encg_zone_rank" ? "Choisir une zone" : "Choisir une ville"}</Label>
                  <Select
                    value={selectedCity}
                    onValueChange={(v) => {
                      // For encg_zone_rank: prevent changing region if one is already committed
                      if (builderType === "encg_zone_rank" && committedRegion && committedRegion !== v) {
                        toast({ 
                          title: "Région verrouillée", 
                          description: `Vous avez déjà validé des choix pour ${committedRegion}. Vous ne pouvez pas sélectionner une autre région.` 
                        });
                        return;
                      }
                      setSelectedCity(v);
                      setTempFiliere("");
                      setTempCityChoices([]); // Reset city choices when city changes
                    }}
                    disabled={tempCityChoices.length > 0 || (builderType === "encg_zone_rank" && committedRegion !== null)} // Lock city once filières are added, or if region is committed
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={builderType === "encg_zone_rank" ? "Sélectionner une zone..." : "Sélectionner une ville..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {cityOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tempCityChoices.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {builderType === "encg_zone_rank" ? "Zone verrouillée. Validez ou réinitialisez pour changer de zone." : "Ville verrouillée. Validez ou réinitialisez pour changer de ville."}
                    </p>
                  )}
                  {builderType === "encg_zone_rank" && committedRegion && (
                    <p className="text-xs text-muted-foreground">
                      Région verrouillée: {committedRegion}. Vous ne pouvez pas ajouter des écoles d'autres régions.
                    </p>
                  )}
                </div>

                {/* Step 2: Filière/École ranking for selected city/zone */}
                {selectedCity && (
                  <div className="space-y-3">
                    {builderType === "encg_zone_rank" ? (
                      <Label>2. Classer vos écoles ENCG dans {selectedCity} (max {maxChoices})</Label>
                    ) : (
                      <Label>2. Classer vos filières à {selectedCity} (max {MAX_FILIERES_PER_CITY})</Label>
                    )}
                    
                    {/* Filière/École dropdown to add */}
                    {filiereOptions.length > 0 ? (
                      <div className="flex gap-2">
                        <Select 
                          value={tempFiliere} 
                          onValueChange={setTempFiliere}
                          disabled={tempCityChoices.length >= MAX_FILIERES_PER_CITY || choices.length + tempCityChoices.length >= maxChoices}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={builderType === "encg_zone_rank" ? "Sélectionner une école ENCG..." : "Sélectionner une filière..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {filiereOptions.map((f: any) => {
                              const name = typeof f === "string" ? f : f?.name;
                              if (!name) return null;
                              // Check if already in city choices or global choices
                              const inCityList = tempCityChoices.includes(name);
                              const inGlobalList = choices.includes(`${selectedCity} — ${name}`);
                              const isDisabled = inCityList || inGlobalList;
                              return (
                                <SelectItem key={name} value={name} disabled={isDisabled}>
                                  {name} {inCityList ? "(dans la liste)" : inGlobalList ? "(déjà validé)" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => addToCityChoices(tempFiliere)}
                          disabled={!tempFiliere || tempCityChoices.length >= MAX_FILIERES_PER_CITY}
                        >
                          Ajouter
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {builderType === "encg_zone_rank" 
                          ? `Aucune école ENCG disponible dans ${selectedCity}.`
                          : "Aucune filière disponible pour votre option de Bac dans cette ville."}
                      </p>
                    )}

                    {/* Per-city/zone ranked list */}
                    {tempCityChoices.length > 0 && (
                      <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          {builderType === "encg_zone_rank" 
                            ? `Écoles ENCG classées pour ${selectedCity} (${tempCityChoices.length}/${maxChoices})`
                            : `Filières classées pour ${selectedCity} (${tempCityChoices.length}/${MAX_FILIERES_PER_CITY})`}
                        </div>
                        {tempCityChoices.map((f, idx) => (
                          <div key={f} className="flex items-center justify-between rounded bg-background px-3 py-2">
                            <div className="text-sm">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-medium mr-2">
                                {idx + 1}
                              </span>
                              {f}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeFromCityChoices(f)}>
                              Retirer
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    onClick={handleCommitCityChoices}
                    disabled={!selectedCity || tempCityChoices.length === 0}
                  >
                    Valider les choix pour {selectedCity || (builderType === "encg_zone_rank" ? "cette zone" : "cette ville")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetSelection}
                    disabled={!selectedCity && tempCityChoices.length === 0 || (builderType === "encg_zone_rank" && committedRegion !== null)}
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>

              {/* Global ranked choices list */}
              <div className="space-y-3">
                <Label className="text-base">Votre classement final ({choices.length}/{maxChoices})</Label>
                {choices.length > 0 ? (
                  <div className="space-y-2">
                    {choices.map((c, idx) => (
                      <div key={c} className="flex items-center justify-between rounded-md border px-4 py-3 bg-background">
                        <div className="text-sm">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium mr-3">
                            {idx + 1}
                          </span>
                          {c}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeChoice(c)}>
                          Retirer
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground rounded-md border border-dashed p-6 text-center">
                    {builderType === "encg_zone_rank" 
                      ? "Aucun choix validé. Sélectionnez une zone, classez vos écoles ENCG, puis validez."
                      : "Aucun choix validé. Sélectionnez une ville, classez vos filières, puis validez."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scénario: Classement de filières sans ville (liste globale) */}
          {(builderType === "single_filiere" || builderType === "rank_filieres") && (
            <div className="space-y-2">
              <Label>Choix (max {maxChoices})</Label>
              <Select
                value=""
                onValueChange={(v) => {
                  addChoice(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ajouter un choix..." />
                </SelectTrigger>
                <SelectContent>
                  {(filiereOptions ?? []).map((f: any) => {
                    const name = typeof f === "string" ? f : f?.name;
                    if (!name) return null;
                    const alreadyAdded = choices.includes(name);
                    return (
                      <SelectItem key={name} value={name} disabled={alreadyAdded}>
                        {name} {alreadyAdded ? "(déjà ajouté)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                {choices.map((c, idx) => (
                  <div key={c} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">#{idx + 1}</span>
                      {c}
                    </div>
                    <Button variant="ghost" onClick={() => removeChoice(c)}>
                      Retirer
                    </Button>
                  </div>
                ))}
                {choices.length === 0 ? <div className="text-sm text-muted-foreground">Aucun choix ajouté.</div> : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {extraFields.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations complémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {extraFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={String(formData[field.key] ?? "")}
                    onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={String(formData[field.key] ?? "")}
                    onValueChange={(v) => setFormData((p) => ({ ...p, [field.key]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    value={String(formData[field.key] ?? "")}
                    onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={submit}>Envoyer</Button>
      </div>
    </div>
  );
}

