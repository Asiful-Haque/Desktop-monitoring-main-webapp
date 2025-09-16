import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, FileText } from "lucide-react";
import UserManagementCard from "@/components/UserManagementCard";
import ProjOverviewCards from "@/components/ProjOverviewCards";
import ProjTaskCard from "@/components/ProjTaskCard";
import ProjDetailsCard from "@/components/ProjDetailsCard";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import GanttChart from "@/components/commonComponent/GanttChart";
import { redirect } from "next/navigation";

/** ---------- Simple SSR cookie header (no refresh here) ---------- */
async function buildCookieHeader() {
  const store = await cookies();
  const token = store.get("token")?.value;
  const refresh = store.get("refresh_token")?.value;
  return [token && `token=${token}`, refresh && `refresh_token=${refresh}`]
    .filter(Boolean)
    .join("; ");
}

/** ---------- API wrappers (plain fetch, just forwards cookies) ---------- */
const getTeamMembers = async (projectId, cookieHeader) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/team-member/${projectId}`,
      { cache: "no-store", headers: { Cookie: cookieHeader } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Error fetching team members:", e);
    return [];
  }
};

const getProjectTasks = async (projectId, cookieHeader) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tasks/task-project/${projectId}`,
      { cache: "no-store", headers: { Cookie: cookieHeader } }
    );
    if (!res.ok) throw new Error("Failed to fetch tasks");
    const data = await res.json();
    return data.tasks || [];
  } catch (e) {
    console.error("Error fetching tasks:", e);
    return [];
  }
};

const getProjectTasksByDate = async (projectId, date, cookieHeader) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/time-tracking/${projectId}?date=${encodeURIComponent(date)}`,
      { cache: "no-store", headers: { Cookie: cookieHeader } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error("Error fetching tasks by date:", e);
    return [];
  }
};

const getProjectData = async (projectId, cookieHeader) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects/details/${projectId}`,
      { cache: "no-store", headers: { Cookie: cookieHeader } }
    );
    if (!res.ok) throw new Error("Failed to fetch project data");
    const data = await res.json();
    return data.projectDetailsResponse || {};
  } catch (e) {
    console.error("Error fetching project data:", e);
    return {};
  }
};

/** ---------- Page ---------- */
const ProjectDetails = async ({ params }) => {
  const store = await cookies();
  const token = store.get("token")?.value;
  const refresh = store.get("refresh_token")?.value;

  // If no tokens at all → go to login
  if (!token && !refresh) return redirect(`/logggg`);

  // Build Cookie header for SSR -> API calls (auth happens in API routes)
  const cookieHeader = await buildCookieHeader();

  const raw = token ? jwt.decode(token) : null;
  const { projectId } = await params;

  const [teamMembers, tasks, projectData] = await Promise.all([
    getTeamMembers(projectId, cookieHeader),
    getProjectTasks(projectId, cookieHeader),
    getProjectData(projectId, cookieHeader),
  ]);

  const currentDate = new Date().toISOString().split("T")[0];
  const tasksbyDate = await getProjectTasksByDate(projectId, currentDate, cookieHeader);

  const teamCount = teamMembers.members?.length || 0;
  const currentUser = raw;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const project = {
    id: projectId,
    name: projectData.project_name,
    description: projectData.project_description,
    status: projectData.status,
    progress: completionPercentage,
    deadline: projectData.deadline || "2024-02-15",
    createdDate: projectData.created_at || "2023-10-01",
    budget: projectData.budget || "$150,000",
    client: projectData.client_name || "TechCorp Inc.",
    category: projectData.category || "Web Development",
    priority: projectData.priority || "High",
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
      case "On Track":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "Active":
        return "bg-green-100 text-green-800";
      case "Away":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-5xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-600 mt-5">{project.description}</p>
          <div className="flex items-center space-x-4 mt-4">
            <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
            <Badge className={getPriorityColor(project.priority)}>{project.priority} Priority</Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            View Reports
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <GitBranch className="mr-2 h-4 w-4" />
            Manage Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjOverviewCards project={project} teamCount={teamCount} />
        <UserManagementCard users={teamMembers} />
      </div>

      <GanttChart projectId={projectId} tasks={tasksbyDate} />
      <ProjTaskCard tasks={tasks} curruser={currentUser} />
      <ProjDetailsCard project={project} />
    </div>
  );
};

export default ProjectDetails;
