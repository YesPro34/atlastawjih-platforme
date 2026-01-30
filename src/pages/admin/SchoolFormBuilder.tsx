import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { BacOption, FormConfig, School } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BAC_OPTIONS } from "@/types/database";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

type FormBuilderType =
  | "single_city"
  | "single_filiere"
  | "rank_filieres"
  | "city_then_rank_filieres"
  | "rank_cities" // classement direct de villes (scénario “ranking cities”)
  | "complex_city_filiere_bac_rank"
  | "cpge"
  | "encg_zone_rank";

type FieldType = "text" | "textarea" | "number" | "date" | "select" | "radio" | "checkbox";

type BuilderField = {
  id: string;
  key: string; // stored inside applications.form_data under this key
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for select/radio
};

type FormBuilderConfig = {
  version: 1;
  builderType: FormBuilderType;
  // Core configuration described in the PDF.
  allowedBacOptions: BacOption[];
  maxChoices: number;
  // Cities, filieres and mapping (varies by scenario)
  cities: string[];
  filieres: { name: string; allowedBacOptions?: BacOption[] }[];
  filieresByCity: Record<string, { name: string; allowedBacOptions?: BacOption[] }[]>;
  // Extra rules for advanced cases (we keep it generic to remain extensible).
  rules: Record<string, unknown>;
  // Optional extra fields that some schools might need (kept simple).
  extraFields: BuilderField[];
  // Diploma information
  diplome?: string;
};

/**
 * Dynamic form builder editor for ONE school.
 *
 * Why this shape:
 * - We store the entire config as JSONB in `form_configs.config` (as required).
 * - We also fill the typed columns `cities`, `filieres`, `max_choices`, `rules` for convenience (existing schema).
 */
export default function AdminSchoolFormBuilder() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [formConfigRow, setFormConfigRow] = useState<FormConfig | null>(null);

  const [builderType, setBuilderType] = useState<FormBuilderType>("single_city");
  const [allowedBacOptions, setAllowedBacOptions] = useState<BacOption[]>([]);
  const [maxChoices, setMaxChoices] = useState<number>(1);
  const [citiesText, setCitiesText] = useState<string>("");
  const [filieresText, setFilieresText] = useState<string>("");
  const [mappingJson, setMappingJson] = useState<string>("{}");
  const [rulesJson, setRulesJson] = useState<string>("{}");
  const [extraFieldsJson, setExtraFieldsJson] = useState<string>("[]");
  const [diplome, setDiplome] = useState<string>("");

  useEffect(() => {
    if (!schoolId) return;
    load();
  }, [schoolId]);

  const load = async () => {
    setLoading(true);
    try {
      const [schoolRes, configRes] = await Promise.all([
        supabase.from("schools").select("*").eq("id", schoolId).maybeSingle(),
        supabase.from("form_configs").select("*").eq("school_id", schoolId).maybeSingle(),
      ]);
      if (schoolRes.error) throw schoolRes.error;
      setSchool((schoolRes.data as any) ?? null);

      const row = (configRes.data as any) as FormConfig | null;
      setFormConfigRow(row);

      // Hydrate UI from saved config (if any).
      const cfg = (row?.config ?? {}) as any;
      if (cfg?.builderType) setBuilderType(cfg.builderType);
      if (Array.isArray(cfg?.allowedBacOptions)) setAllowedBacOptions(cfg.allowedBacOptions);
      if (typeof cfg?.maxChoices === "number") setMaxChoices(cfg.maxChoices);

      const cities = (cfg?.cities ?? row?.cities ?? []) as string[];
      setCitiesText((cities ?? []).join("\n"));

      const filieres = (cfg?.filieres ?? row?.filieres ?? []) as any[];
      setFilieresText((filieres ?? []).map((f) => (typeof f === "string" ? f : f?.name)).filter(Boolean).join("\n"));

      setMappingJson(JSON.stringify(cfg?.filieresByCity ?? {}, null, 2));
      setRulesJson(JSON.stringify(cfg?.rules ?? row?.rules ?? {}, null, 2));
      setExtraFieldsJson(JSON.stringify(cfg?.extraFields ?? [], null, 2));
      setDiplome(cfg?.diplome ?? "");
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de charger la configuration du formulaire." });
    } finally {
      setLoading(false);
    }
  };

  const builtConfig: FormBuilderConfig = useMemo(() => {
    let citiesFromText = citiesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const filieres = filieresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    let filieresByCity: FormBuilderConfig["filieresByCity"] = {};
    let rules: Record<string, unknown> = {};
    let extraFields: BuilderField[] = [];

    try {
      filieresByCity = JSON.parse(mappingJson || "{}");
    } catch {
      // We keep invalid JSON in the editor; user will fix before saving.
    }
    try {
      rules = JSON.parse(rulesJson || "{}");
    } catch {}
    try {
      extraFields = JSON.parse(extraFieldsJson || "[]");
    } catch {}

    // Auto-extract cities from filieresByCity JSON if the "Villes" textarea is empty.
    // This ensures the student form can derive city options from the JSON mapping.
    const cities = citiesFromText.length > 0 ? citiesFromText : Object.keys(filieresByCity);

    return {
      version: 1,
      builderType,
      allowedBacOptions,
      maxChoices,
      cities,
      filieres,
      filieresByCity,
      rules,
      extraFields,
      diplome: diplome.trim() || undefined,
    };
  }, [allowedBacOptions, builderType, citiesText, diplome, extraFieldsJson, filieresText, mappingJson, maxChoices, rulesJson]);

  const save = async () => {
    if (!schoolId) return;
    // Simple validation: mapping/rules must be valid JSON if user typed it.
    try {
      JSON.parse(mappingJson || "{}");
      JSON.parse(rulesJson || "{}");
      JSON.parse(extraFieldsJson || "[]");
    } catch {
      toast({ title: "JSON invalide", description: "Vérifiez les champs JSON avant d'enregistrer." });
      return;
    }

    const payload = {
      school_id: schoolId,
      config: builtConfig as any,
      max_choices: builtConfig.maxChoices,
      cities: builtConfig.cities,
      filieres: builtConfig.filieres as any,
      rules: builtConfig.rules as any,
    };

    // Why: Upsert ensures each school has at most one config row (simple mental model).
    const { error } = await supabase.from("form_configs").upsert(payload, { onConflict: "school_id" } as any);
    if (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer." });
      return;
    }
    toast({ title: "Enregistré", description: "Configuration du formulaire mise à jour." });
    load();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement...</div>;
  }

  if (!school) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">École introuvable.</div>
        <Button variant="outline" onClick={() => navigate("/admin/schools")}>
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
            Configurez le formulaire dynamique (JSONB) selon les scénarios du document “formulaires dynamiques”.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/schools")}>
            Retour
          </Button>
          <Button onClick={save}>Enregistrer</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Type de formulaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Scénario</Label>
            <Select value={builderType} onValueChange={(v) => setBuilderType(v as FormBuilderType)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_city">Scénario 1 — Sélection d’une seule ville</SelectItem>
                <SelectItem value="rank_filieres">Scénario 2 — Classement de filières</SelectItem>
                <SelectItem value="city_then_rank_filieres">Scénario 3 — Ville puis filières (classement)</SelectItem>
                <SelectItem value="single_filiere">Scénario 4 — Choix d’une seule filière</SelectItem>
                <SelectItem value="rank_cities">Scénario 5 — Classement de villes uniquement</SelectItem>
                <SelectItem value="complex_city_filiere_bac_rank">Scénario 6 — Ville → filière → Bac + classement</SelectItem>
                <SelectItem value="cpge">Scénario 7 — CPGE multiconditions</SelectItem>
                <SelectItem value="encg_zone_rank">Scénario 8 — ENCG selon zone + classement</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Commentaire: on garde une liste finie de “types” pour guider l’admin, mais on sauvegarde tout en JSONB pour
              rester flexible.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Nombre maximum de choix</Label>
            <Input
              type="number"
              min={1}
              value={String(maxChoices)}
              onChange={(e) => setMaxChoices(Number(e.target.value || 1))}
            />
          </div>

          <div className="space-y-2">
            <Label>Options Bac admises (global)</Label>
            <div className="grid grid-cols-2 gap-2">
              {BAC_OPTIONS.map((opt) => {
                const checked = allowedBacOptions.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        setAllowedBacOptions((prev) => (v ? [...prev, opt.value] : prev.filter((x) => x !== opt.value)));
                      }}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Villes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Une ville par ligne</Label>
            <Textarea value={citiesText} onChange={(e) => setCitiesText(e.target.value)} rows={10} />
            <p className="text-xs text-muted-foreground">
              Astuce: Si ce champ est vide, les villes seront automatiquement extraites des clés du JSON "Filières par ville".
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filières (liste globale)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Une filière par ligne</Label>
            <Textarea value={filieresText} onChange={(e) => setFilieresText(e.target.value)} rows={10} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filières par ville (JSON)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Commentaire: ce champ couvre les scénarios “ville → filières”. Format recommandé :
            <br />
            <code>{`{ \"Agadir\": [{\"name\":\"Génie Info\",\"allowedBacOptions\":[\"PC\",\"SMA\"]}] }`}</code>
          </p>
          <Textarea value={mappingJson} onChange={(e) => setMappingJson(e.target.value)} rows={12} />
        </CardContent>
      </Card>

      {/* <Card>
        <CardHeader>
          <CardTitle className="text-base">Règles (JSON)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Commentaire: pour les cas “complexes” (doublons, répétition de ville, limitations par Bac…), on stocke ici des
            flags/paramètres que l’UI élève appliquera.
          </p>
          <Textarea value={rulesJson} onChange={(e) => setRulesJson(e.target.value)} rows={10} />
        </CardContent>
      </Card> */}


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diplôme délivré</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Description du diplôme</Label>
          <Textarea 
            value={diplome} 
            onChange={(e) => setDiplome(e.target.value)} 
            rows={5}
            placeholder="Ex: Diplôme d'Ingénieur, Licence, Master, etc."
          />
          <p className="text-xs text-muted-foreground">
            Indiquez le type de diplôme que cette école délivre. Ce champ peut contenir du texte libre.
          </p>
        </CardContent>
      </Card>

      {/* <Card>
        <CardHeader>
          <CardTitle className="text-base">Aperçu (côté élève)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Commentaire: cet aperçu aide l’admin à valider la config sans aller dans l’espace élève.
          </p>
          <div className="rounded-md border p-4 space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Scénario:</span> <span className="font-medium">{builderType}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Max choix:</span> <span className="font-medium">{maxChoices}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Villes:</span>{" "}
              <span className="font-medium">{builtConfig.cities.length ? builtConfig.cities.slice(0, 6).join(", ") : "—"}</span>
              {builtConfig.cities.length > 6 ? <span className="text-muted-foreground"> …</span> : null}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Filières (global):</span>{" "}
              <span className="font-medium">{builtConfig.filieres.length ? builtConfig.filieres.slice(0, 6).map(f => f.name).join(", ") : "—"}</span>
              {builtConfig.filieres.length > 6 ? <span className="text-muted-foreground"> …</span> : null}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Champs extra:</span>{" "}
              <span className="font-medium">{builtConfig.extraFields.length ? builtConfig.extraFields.map(f => f.label).join(", ") : "—"}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Diplôme:</span>{" "}
              <span className="font-medium">{builtConfig.diplome || "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
}

