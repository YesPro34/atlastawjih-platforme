import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DocumentTitle } from "@/components/DocumentTitle";

// Pages
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

import { AdminLayout } from "@/components/layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAdherents from "./pages/admin/Adherents";
import AdminSchools from "./pages/admin/Schools";
import AdminSchoolFormBuilder from "./pages/admin/SchoolFormBuilder";
import AdminApplications from "./pages/admin/Applications";
import AdminNotifications from "./pages/admin/Notifications";

// Student Pages
import { StudentLayout } from "@/components/layouts/StudentLayout";
import StudentDashboard from "./pages/student/Dashboard";
import StudentApply from "./pages/student/Apply";
import StudentSchoolApply from "./pages/student/SchoolApply";
import StudentApplications from "./pages/student/Applications";
import StudentApplicationTracking from "./pages/student/ApplicationTracking";
import StudentNotifications from "./pages/student/Notifications";
import StudentProfile from "./pages/student/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <DocumentTitle />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/adherents"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminAdherents />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/schools"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminSchools />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/schools/:schoolId/form"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminSchoolFormBuilder />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/applications"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminApplications />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <AdminNotifications />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Student routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['adherent']}>
                  <StudentLayout>
                    <StudentDashboard />
                  </StudentLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute allowedRoles={['adherent']}>
                  <StudentLayout>
                    <StudentProfile />
                  </StudentLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/apply"
              element={
                <ProtectedRoute allowedRoles={['adherent']}>
                  <StudentLayout>
                    <StudentApply />
                  </StudentLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/apply/:schoolId"
              element={
                <ProtectedRoute allowedRoles={['adherent']}>
                  <StudentLayout>
                    <StudentSchoolApply />
                  </StudentLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/applications"
              element={
                <ProtectedRoute allowedRoles={['adherent']}>
                  <StudentLayout>
                    <StudentApplicationTracking />
                  </StudentLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/applications/view"
              element={
                <ProtectedRoute allowedRoles={['adherent']}>
                  <StudentLayout>
                    <StudentApplications />
                  </StudentLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/notifications"
              element={
                <ProtectedRoute allowedRoles={['adherent']}>
                  <StudentLayout>
                    <StudentNotifications />
                  </StudentLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
