import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Route to title mapping
const routeTitles: Record<string, string> = {
  '/auth': 'Connexion - Atlas Tawjih',
  '/reset-password': 'Réinitialisation du mot de passe - Atlas Tawjih',
  '/admin': 'Tableau de bord - Atlas Tawjih',
  '/admin/adherents': 'Adhérents - Atlas Tawjih',
  '/admin/schools': 'Écoles - Atlas Tawjih',
  '/admin/applications': 'Candidatures - Atlas Tawjih',
  '/admin/notifications': 'Notifications - Atlas Tawjih',
  '/student': 'Tableau de bord - Atlas Tawjih',
  '/student/profile': 'Profil - Atlas Tawjih',
  '/student/apply': 'Candidater - Atlas Tawjih',
  '/student/applications': 'Suivi des candidatures - Atlas Tawjih',
  '/student/applications/view': 'Voir mes candidatures - Atlas Tawjih',
  '/student/notifications': 'Notifications - Atlas Tawjih',
};

// Helper function to get title from pathname
const getTitleFromPath = (pathname: string): string => {
  // Check for exact match first
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }

  // Check for dynamic routes (e.g., /admin/schools/:schoolId/form)
  if (pathname.startsWith('/admin/schools/') && pathname.includes('/form')) {
    return 'Formulaire d\'école - Atlas Tawjih';
  }

  if (pathname.startsWith('/student/apply/')) {
    return 'Formulaire de candidature - Atlas Tawjih';
  }

  // Default title
  return 'Atlas Tawjih';
};

export function DocumentTitle() {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = getTitleFromPath(location.pathname);
    document.title = pageTitle;
  }, [location.pathname]);

  return null;
}
