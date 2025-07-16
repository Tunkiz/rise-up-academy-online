import { useAuth } from "@/contexts/AuthProvider";
import AdminDashboard from "./AdminDashboard";
import StudentDashboard from "./StudentDashboard";

const Dashboard = () => {
  const { isAdmin, isTeacher } = useAuth();

  // Show AdminDashboard for admins and teachers
  if (isAdmin || isTeacher) {
    return <AdminDashboard />;
  }

  // Show StudentDashboard for students and other roles
  return <StudentDashboard />;
};

export default Dashboard;
