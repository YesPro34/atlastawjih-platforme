import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  FileText, 
  PlusCircle, 
  Bell, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  ClipboardList,
  Eye,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StudentLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Tableau de bord', href: '/student', icon: LayoutDashboard },
  { name: 'Mes informations', href: '/student/profile', icon: User },
  { name: 'Suivi des candidatures', href: '/student/applications', icon: ClipboardList },
  { name: 'Nouvelle candidature', href: '/student/apply', icon: PlusCircle },
  { name: 'Voir mes candidatures', href: '/student/applications/view', icon: Eye },
  { name: 'Notifications', href: '/student/notifications', icon: Bell },
];

export function StudentLayout({ children }: StudentLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileName, setProfileName] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchProfile();
    }
    // We also refresh the unread count when the route changes so that
    // visiting /student/notifications (which marks notifications as read)
    // keeps the badge in sync.
  }, [user, location.pathname]);

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('is_read', false);
    
    setUnreadCount(count ?? 0);
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user?.id)
      .maybeSingle();
    
    if (data) {
      setProfileName(`${data.first_name} ${data.last_name}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-card border-r border-border text-foreground transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center justify-between px-6 border-b border-border">
          <Link to="/student" className="flex items-center gap-3">
          <img src="/logo-blue.png" alt="Atlas Tawjih" className="h-10 w-10 rounded-full object-cover" />
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">Atlas Tawjih</span>
              <span className="text-xs text-muted-foreground">Espace Adhérent</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-foreground hover:text-primary"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            // Handle active state for exact and nested routes
            const isActive = item.href === '/student/applications' 
              ? location.pathname === '/student/applications'
              : item.href === '/student/applications/view'
              ? location.pathname === '/student/applications/view'
              : location.pathname === item.href;
            const isNotifications = item.href === '/student/notifications';
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </div>
                {isNotifications && unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-foreground hover:bg-muted hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-foreground hover:text-primary"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <Link to="/student/notifications" className="relative">
            <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                  {profileName.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline max-w-32 truncate">{profileName || 'Utilisateur'}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/student/profile')}>
                <User className="h-4 w-4 mr-2" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
