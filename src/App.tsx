
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
import { AuthProvider } from "./contexts/AuthProvider";
import AdminPage from "./pages/Admin";
import SubjectDashboard from "./pages/SubjectDashboard";
import TopicPage from "./pages/TopicPage";
import LessonPage from "./pages/LessonPage";
import ProfilePage from "./pages/ProfilePage";
import AdminUserProfilePage from "./pages/AdminUserProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/learning-portal" element={<LearningPortal />} />
              <Route path="/subject/:subjectId" element={<SubjectDashboard />} />
              <Route path="/subject/:subjectId/topic/:topicId" element={<TopicPage />} />
              <Route path="/subject/:subjectId/topic/:topicId/lesson/:lessonId" element={<LessonPage />} />
              <Route path="/exam-assistance" element={<ExamAssistance />} />
              <Route path="/study-planner" element={<StudyPlanner />} />
              <Route path="/resource-library" element={<ResourceLibrary />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/user/:userId" element={<AdminUserProfilePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
