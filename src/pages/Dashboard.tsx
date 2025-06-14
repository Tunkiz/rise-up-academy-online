
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Book, Calendar, Bell } from "lucide-react";

const Dashboard = () => (
  <div className="container py-10">
    <h1 className="text-3xl font-bold">Welcome back, Student!</h1>
    <p className="text-muted-foreground mt-2 mb-8">Here's a snapshot of your learning journey.</p>

    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {/* My Progress Card */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Book className="mr-2 h-5 w-5" />
            My Progress
          </CardTitle>
          <CardDescription>Your overall progress across all subjects.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Mathematics</span>
                <span className="text-sm text-muted-foreground">75%</span>
              </div>
              <Progress value={75} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Physical Sciences</span>
                <span className="text-sm text-muted-foreground">60%</span>
              </div>
              <Progress value={60} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">English</span>
                <span className="text-sm text-muted-foreground">88%</span>
              </div>
              <Progress value={88} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Upcoming Deadlines
          </CardTitle>
          <CardDescription>Don't miss these important dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Maths Assignment 5</p>
                <p className="text-sm text-muted-foreground">Due: 2025-06-20</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Exam Registration</p>
                <p className="text-sm text-muted-foreground">Closes: 2025-07-01</p>
              </div>
            </li>
            <li className="flex items-start">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="font-medium">Science Project Proposal</p>
                  <p className="text-sm text-muted-foreground">Due: 2025-06-18</p>
                </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>What's new in your courses.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">English</TableCell>
                <TableCell>New quiz available: "Shakespeare's Sonnets"</TableCell>
                <TableCell className="text-right text-muted-foreground">2 days ago</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Mathematics</TableCell>
                <TableCell>Lesson "Algebra II" completed</TableCell>
                <TableCell className="text-right text-muted-foreground">3 days ago</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Physical Sciences</TableCell>
                <TableCell>Grade received for "Lab Report 3"</TableCell>
                <TableCell className="text-right text-muted-foreground">4 days ago</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
);
export default Dashboard;
