import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { Info, FileText } from "lucide-react";

/**
 * Student "Suivi des candidatures" Page
 * 
 * Displays all applications in a table format with:
 * - Status legend
 * - Table columns: Établissement/Bourse, État, Date d'application, Note
 * - Pagination
 */

type Application = {
  id: string;
  status: string;
  submitted_at: string;
  admin_note: string | null;
  form_data: any;
  school: {
    name: string;
    short_name: string | null;
  } | null;
  diplome: string | null;
};

// Status configuration with colors matching the screenshot exactly
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  en_cours: { 
    label: "En cours de traitement", 
    className: "bg-yellow-100 text-yellow-800 border-yellow-200" 
  },
  admis: { 
    label: "Admis", 
    className: "bg-green-100 text-green-800 border-green-200" 
  },
  refuse: { 
    label: "Refusé", 
    className: "bg-red-100 text-red-800 border-red-200" 
  },
  validee: { 
    label: "Candidature validée", 
    className: "bg-blue-100 text-blue-800 border-blue-200" 
  },
  en_attente: { 
    label: "En attente", 
    className: "bg-purple-100 text-purple-800 border-purple-200" 
  },
  preselectionne: { 
    label: "Présélectionné", 
    className: "bg-pink-100 text-pink-800 border-pink-200" 
  },
};

const ITEMS_PER_PAGE = 10;

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { 
    label: status, 
    className: "bg-gray-100 text-gray-800 border-gray-200" 
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

export default function ApplicationTracking() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) return;

    const fetchApplications = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          submitted_at,
          admin_note,
          form_data,
          school_id,
          school:schools (
            name,
            short_name
          )
        `)
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      // Process applications: check form_data first (admin-created), then fall back to DB relationships
      if (data && data.length > 0) {
        const schoolIds = [...new Set(data.map((app: any) => app.school_id).filter(Boolean))];
        
        // Fetch diplome from form_configs for regular applications
        let diplomeMap = new Map<string, string | null>();
        if (schoolIds.length > 0) {
          const { data: formConfigs } = await supabase
            .from("form_configs")
            .select("school_id, config")
            .in("school_id", schoolIds);

          formConfigs?.forEach((fc: any) => {
            const config = fc.config as any;
            diplomeMap.set(fc.school_id, config?.diplome || null);
          });
        }

        // Process each application: prioritize form_data for admin-created applications
        const processedApplications = data.map((app: any) => {
          const formData = app.form_data || {};
          
          // For diplome: check form_data.diplome first (admin-created), then fall back to form_configs
          const diplome = formData.diplome || diplomeMap.get(app.school_id) || null;
          
          return {
            ...app,
            diplome,
          };
        });

        setApplications(processedApplications);
      } else {
        setApplications([]);
      }

      setLoading(false);
    };

    fetchApplications();
  }, [user]);

  // Pagination calculations
  const totalPages = Math.ceil(applications.length / ITEMS_PER_PAGE);
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return applications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [applications, currentPage]);

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
        <h1 className="text-2xl font-bold text-foreground">Suivi des candidatures</h1>
        <p className="text-muted-foreground">
          Consultez l'état de vos candidatures et les notes de l'administration.
        </p>
      </div>

      {/* Status Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Légende des statuts</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <span 
                key={key} 
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
              >
                {config.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mes candidatures ({applications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Vous n'avez pas encore soumis de candidature.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Établissement/Bourse</TableHead>
                      <TableHead>Diplôme</TableHead>
                      <TableHead>État</TableHead>
                      <TableHead>Date d'application</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedApplications.map((app) => {
                      // Get school name: prioritize form_data.school_name (admin-created) over school relationship
                      const schoolName = app.form_data?.school_name || app.school?.short_name || app.school?.name || "École inconnue";
                      
                      return (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">
                            {schoolName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {app.diplome ?? "-"}
                          </TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} />
                        </TableCell>
                        <TableCell>
                          {new Date(app.submitted_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {app.admin_note ?? "-"}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
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
    </div>
  );
}
