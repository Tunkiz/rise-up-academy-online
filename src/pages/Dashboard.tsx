import { useAuth } from "@/contexts/AuthProvider";
import AdminDashboard from "./AdminDashboard";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";

const Dashboard = () => {
  const { isAdmin, isTeacher } = useAuth();

  // Show AdminDashboard for admins only
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Show TeacherDashboard for teachers
  if (isTeacher) {
    return <TeacherDashboard />;
  }

  // Show StudentDashboard for students and other roles
  return <StudentDashboard />;
};

export default Dashboard;
