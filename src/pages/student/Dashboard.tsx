// import { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { FileText, CheckCircle, Clock, XCircle, PlusCircle, ArrowRight } from 'lucide-react';
// import { supabase } from '@/integrations/supabase/client';
// import { useAuth } from '@/hooks/useAuth';

// export default function StudentDashboard() {
//   const { user } = useAuth();
//   const [profileName, setProfileName] = useState('');
//   const [stats, setStats] = useState({
//     total: 0,
//     validated: 0,
//     pending: 0,
//     refused: 0,
//     admitted: 0,
//   });

//   useEffect(() => {
//     if (user) {
//       fetchData();
//     }
//   }, [user]);

//   const fetchData = async () => {
//     const [profile, applications] = await Promise.all([
//       supabase.from('profiles').select('first_name').eq('user_id', user?.id).maybeSingle(),
//       supabase.from('applications').select('status').eq('user_id', user?.id),
//     ]);

//     if (profile.data) {
//       setProfileName(profile.data.first_name);
//     }

//     const appData = applications.data || [];
//     setStats({
//       total: appData.length,
//       validated: appData.filter(a => a.status === 'validee').length,
//       pending: appData.filter(a => a.status === 'en_attente').length,
//       refused: appData.filter(a => a.status === 'refuse').length,
//       admitted: appData.filter(a => a.status === 'admis').length,
//     });
//   };

//   const statCards = [
//     { title: 'Candidatures', value: stats.total, icon: FileText, color: 'text-primary' },
//     { title: 'Validées', value: stats.validated, icon: CheckCircle, color: 'text-success' },
//     { title: 'En attente', value: stats.pending, icon: Clock, color: 'text-warning' },
//     { title: 'Admis', value: stats.admitted, icon: CheckCircle, color: 'text-success' },
//   ];

//   // Note: Layout is provided by the route wrapper in `src/App.tsx`.
//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-foreground">
//           Bienvenue{profileName ? `, ${profileName}` : ''} !
//         </h1>
//         <p className="text-muted-foreground">Gérez vos candidatures aux écoles marocaines</p>
//       </div>

//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//         {statCards.map((stat) => (
//           <Card key={stat.title}>
//             <CardHeader className="flex flex-row items-center justify-between pb-2">
//               <CardTitle className="text-sm font-medium text-muted-foreground">
//                 {stat.title}
//               </CardTitle>
//               <stat.icon className={`h-5 w-5 ${stat.color}`} />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{stat.value}</div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       <div className="grid gap-4 md:grid-cols-2">
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg">Actions rapides</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3">
//             <Button asChild className="w-full justify-between">
//               <Link to="/student/apply">
//                 <span className="flex items-center gap-2">
//                   <PlusCircle className="h-4 w-4" />
//                   Nouvelle candidature
//                 </span>
//                 <ArrowRight className="h-4 w-4" />
//               </Link>
//             </Button>
//             <Button asChild variant="outline" className="w-full justify-between">
//               <Link to="/student/applications">
//                 <span className="flex items-center gap-2">
//                   <FileText className="h-4 w-4" />
//                   Voir mes candidatures
//                 </span>
//                 <ArrowRight className="h-4 w-4" />
//               </Link>
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }




// ------------------------------------------------------------------


import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  GraduationCap,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    validated: 0,
    pending: 0,
    refused: 0,
    admitted: 0,
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const [profile, applications] = await Promise.all([
      supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', user?.id)
        .maybeSingle(),
      supabase.from('applications').select('status').eq('user_id', user?.id),
    ]);

    if (profile.data) setProfileName(profile.data.first_name);

    const appData = applications.data || [];
    setStats({
      total: appData.length,
      validated: appData.filter(a => a.status === 'validee').length,
      pending: appData.filter(a => a.status === 'en_attente').length,
      refused: appData.filter(a => a.status === 'refuse').length,
      admitted: appData.filter(a => a.status === 'admis').length,
    });
  };

  return (
    <div className="space-y-6">
      {/* 🔵 Welcome Banner */}
      <div className="rounded-xl bg-primary p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">
          Bienvenue{profileName ? `, ${profileName}` : ''} 👋
        </h1>
        <p className="opacity-90 mt-1">
          Gérez vos candidatures et suivez votre orientation depuis votre espace personnel.
        </p>
      </div>

      {/* 📊 Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Candidatures validées"
          value={stats.validated}
          icon={CheckCircle}
          color="text-blue-600"
        />
        <StatCard
          label="En cours de traitement"
          value={stats.pending}
          icon={Clock}
          color="text-yellow-500"
        />
        <StatCard
          label="Admissions"
          value={stats.admitted}
          icon={GraduationCap}
          color="text-green-600"
        />
        <StatCard
          label="Refusées"
          value={stats.refused}
          icon={XCircle}
          color="text-red-500"
        />
      </div>

      {/* 🚀 Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-lg font-semibold">Nouvelle candidature</h3>
            <p className="text-sm text-muted-foreground">
              Explorez les écoles disponibles et soumettez votre candidature.
            </p>
            <Button asChild>
              <Link to="/student/apply" className="flex items-center gap-2">
                Postuler maintenant
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-lg font-semibold">Mes candidatures</h3>
            <p className="text-sm text-muted-foreground">
              Consultez l'état de vos candidatures et les notes de l'administration.
            </p>
            <Button asChild variant="outline">
              <Link to="/student/applications" className="flex items-center gap-2">
                Voir le suivi
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 📦 Total */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total des candidatures</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/student/applications" className="flex items-center gap-2">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* 🔹 Reusable Stat Card */
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`rounded-lg bg-muted p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
