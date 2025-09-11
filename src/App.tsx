import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import LearningPortal from "./pages/LearningPortal";
import ExamAssistance from "./pages/ExamAssistance";
import StudyPlanner from "./pages/StudyPlanner";
import ResourceLibrary from "./pages/ResourceLibrary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { AuthProvider } from "./contexts/AuthProvider";
import AdminPage from "./pages/Admin";
import SuperAdminPage from "./pages/SuperAdminPage";
import SuperAdminDiagnosticPage from "./pages/SuperAdminDiagnosticPage";
import SubjectDashboard from "./pages/SubjectDashboard";
import TopicPage from "./pages/TopicPage";
import LessonPage from "./pages/LessonPage";
import ProfilePage from "./pages/ProfilePage";
import AdminUserProfilePage from "./pages/AdminUserProfilePage";
import TutorNotes from "./pages/TutorNotes";
import { TourProvider } from "./components/tour/TourProvider";
import { TourGuide } from "./components/tour/TourGuide";
import { RoleBasedRoute } from "./components/layout/RoleBasedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TourProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<ProfilePage />} />
                
                {/* Student-only routes */}
                <Route path="/learning-portal" element={
                  <RoleBasedRoute allowedRoles={['student']}>
                    <LearningPortal />
                  </RoleBasedRoute>
                } />
                <Route path="/subject/:subjectId" element={
                  <RoleBasedRoute allowedRoles={['student']}>
                    <SubjectDashboard />
                  </RoleBasedRoute>
                } />
                <Route path="/subject/:subjectId/topic/:topicId" element={
                  <RoleBasedRoute allowedRoles={['student']}>
                    <TopicPage />
                  </RoleBasedRoute>
                } />
                <Route path="/subject/:subjectId/topic/:topicId/lesson/:lessonId" element={
                  <RoleBasedRoute allowedRoles={['student']}>
                    <LessonPage />
                  </RoleBasedRoute>
                } />
                <Route path="/exam-assistance" element={
                  <RoleBasedRoute allowedRoles={['student']}>
                    <ExamAssistance />
                  </RoleBasedRoute>
                } />
                <Route path="/tutor-notes" element={
                  <RoleBasedRoute allowedRoles={['student']}>
                    <TutorNotes />
                  </RoleBasedRoute>
                } />
                <Route path="/study-planner" element={
                  <RoleBasedRoute allowedRoles={['student']}>
                    <StudyPlanner />
                  </RoleBasedRoute>
                } />
                <Route path="/resource-library" element={
                  <RoleBasedRoute allowedRoles={['student']}>
                    <ResourceLibrary />
                  </RoleBasedRoute>
                } />
                
                {/* Admin/Teacher-only routes */}
                <Route path="/admin" element={
                  <RoleBasedRoute allowedRoles={['admin', 'teacher']}>
                    <AdminPage />
                  </RoleBasedRoute>
                } />
                <Route path="/admin/user/:userId" element={
                  <RoleBasedRoute allowedRoles={['admin', 'teacher', 'tutor']}>
                    <AdminUserProfilePage />
                  </RoleBasedRoute>
                } />
                <Route path="/super-admin" element={
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <SuperAdminPage />
                  </RoleBasedRoute>
                } />
                <Route path="/super-admin-debug" element={
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <SuperAdminDiagnosticPage />
                  </RoleBasedRoute>
                } />
              </Route>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <TourGuide />
          </TourProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
