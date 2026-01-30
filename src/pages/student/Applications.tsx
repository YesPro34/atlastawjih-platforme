import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eye, XCircle, FileText, AlertTriangle } from "lucide-react";

/**
 * Student "Voir mes candidatures" Page (Detailed View)
 * 
 * Displays all applications submitted by the logged-in student with detailed information.
 * Shows school name, status, submission date, choices made (from form_data), and admin notes.
 * This is the detailed card-based view accessible from /student/applications/view
 */

type Application = {
  id: string;
  status: string;
  submitted_at: string;
  school: {
    name: string;
    short_name: string | null;
  } | null;
};

type SchoolRefusal = {
  id: string;
  school_id: string;
  created_at: string;
  school: {
    name: string;
    short_name: string | null;
  } | null;
};

export default function StudentApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [refusals, setRefusals] = useState<SchoolRefusal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch applications for the logged-in student only
        const { data: appsData, error: appsError } = await supabase
          .from("applications")
          .select(`
            id,
            status,
            submitted_at,
            school:schools (
              name,
              short_name
            )
          `)
          .eq("user_id", user.id)
          .order("submitted_at", { ascending: false });

        if (appsError) throw appsError;

        // Fetch school refusals for the logged-in student
        const { data: refusalsData, error: refusalsError } = await supabase
          .from("school_refusals")
          .select(`
            id,
            school_id,
            created_at,
            school:schools (
              name,
              short_name
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (refusalsError) throw refusalsError;

        setApplications((appsData as any) ?? []);
        setRefusals((refusalsData as any) ?? []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <p className="text-muted-foreground">Chargement de vos candidatures...</p>;
  }

  if (error) {
    return <p className="text-red-500">Erreur: {error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Voir mes candidatures</h1>
        <p className="text-muted-foreground">
          Consultez toutes vos candidatures soumises et les écoles refusées.
        </p>
      </div>

      {/* Information Alert */}
      <Alert className="bg-muted/50">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="font-semibold">Information</AlertTitle>
        <AlertDescription>
          Les candidatures sont définitives. Pour toute modification, veuillez contacter l'administration.
        </AlertDescription>
      </Alert>

      {/* Candidatures soumises Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Candidatures soumises
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Vous n'avez pas encore soumis de candidature.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="font-medium text-foreground mb-2">
                    {app.school?.short_name ?? app.school?.name ?? "École inconnue"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(app.submitted_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Écoles refusées Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Écoles refusées
          </CardTitle>
        </CardHeader>
        <CardContent>
          {refusals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Vous n'avez refusé aucune école.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {refusals.map((refusal) => (
                <div
                  key={refusal.id}
                  className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="font-medium text-foreground mb-2">
                    {refusal.school?.short_name ?? refusal.school?.name ?? "École inconnue"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(refusal.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
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
