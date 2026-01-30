import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BAC_OPTIONS, type BacOption } from '@/types/database';

type BacOptionData = {
  name: string;
  value: number;
  percentage: number;
};

type AdherentEvolutionData = {
  date: string;
  count: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalAdherents: 0,
    totalSchools: 0,
    activeSchools: 0,
    inactiveSchools: 0,
    totalApplications: 0,
  });
  const [bacOptionData, setBacOptionData] = useState<BacOptionData[]>([]);
  const [adherentEvolution, setAdherentEvolution] = useState<AdherentEvolutionData[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [adherentsRes, schoolsRes, applicationsRes, profilesRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('schools').select('id, is_active'),
      supabase.from('applications').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('bac_option, created_at'),
    ]);

    const totalAdherents = adherentsRes.count ?? 0;
    const totalApplications = applicationsRes.count ?? 0;
    
    const schools = schoolsRes.data || [];
    const totalSchools = schools.length;
    const activeSchools = schools.filter((s: any) => s.is_active).length;
    const inactiveSchools = totalSchools - activeSchools;

    setStats({
      totalAdherents,
      totalSchools,
      activeSchools,
      inactiveSchools,
      totalApplications,
    });

    // Calculate BacOption distribution
    const profiles = profilesRes.data || [];
    const bacOptionCounts = new Map<BacOption, number>();
    
    profiles.forEach((profile: any) => {
      if (profile.bac_option) {
        const current = bacOptionCounts.get(profile.bac_option) || 0;
        bacOptionCounts.set(profile.bac_option, current + 1);
      }
    });

    const totalWithBac = Array.from(bacOptionCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const bacData: BacOptionData[] = BAC_OPTIONS.map((option) => {
      const count = bacOptionCounts.get(option.value) || 0;
      const percentage = totalWithBac > 0 ? Math.round((count / totalWithBac) * 100) : 0;
      return {
        name: option.value,
        value: count,
        percentage,
      };
    }).filter((item) => item.value > 0); // Only show options that exist

    setBacOptionData(bacData);

    // Calculate adherent evolution over time
    const evolutionMap = new Map<string, number>();
    
    profiles.forEach((profile: any) => {
      if (profile.created_at) {
        const date = new Date(profile.created_at);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = evolutionMap.get(dateKey) || 0;
        evolutionMap.set(dateKey, current + 1);
      }
    });

    // Sort by date and calculate cumulative
    const sortedDates = Array.from(evolutionMap.keys()).sort();
    let cumulative = 0;
    const evolutionData: AdherentEvolutionData[] = sortedDates.map((dateKey) => {
      cumulative += evolutionMap.get(dateKey) || 0;
      return {
        date: dateKey,
        count: cumulative,
      };
    });

    setAdherentEvolution(evolutionData);
  };

  const statCards = [
    { title: 'Total Adhérents', value: stats.totalAdherents, icon: Users, color: 'text-primary' },
    { title: 'Total Écoles', value: stats.totalSchools, icon: GraduationCap, color: 'text-accent' },
    { title: 'Écoles Actives', value: stats.activeSchools, icon: GraduationCap, color: 'text-green-600' },
    { title: 'Écoles Inactives', value: stats.inactiveSchools, icon: GraduationCap, color: 'text-red-600' },
    { title: 'Total Candidatures', value: stats.totalApplications, icon: FileText, color: 'text-blue-600' },
  ];

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value} ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la plateforme Atlas Tawjih</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart - BacOption Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par Option du Bac</CardTitle>
          </CardHeader>
          <CardContent>
            {bacOptionData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bacOptionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bacOptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Line Chart - Adherent Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution du Nombre d'Adhérents</CardTitle>
          </CardHeader>
          <CardContent>
            {adherentEvolution.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={adherentEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Nombre d'adhérents"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
