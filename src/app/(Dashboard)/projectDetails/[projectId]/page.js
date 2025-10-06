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
import PayStatsRow from "@/components/PayStatsRow";

/* ---------- Helpers ---------- */

// Parse many time formats to minutes: "1h 30m", "45m", "01:15", "01:15:30", "00h 02m", 75, "75"
function parseToMinutes(val) {
  if (val == null) return 0;

  if (typeof val === "number" && !isNaN(val))
    return Math.max(0, Math.floor(val));
  if (typeof val === "string" && /^\s*\d+(\.\d+)?\s*$/.test(val)) {
    return Math.max(0, Math.floor(Number(val)));
  }

  const s = String(val).trim().toLowerCase();

  // "1h 30m", "2h", "45m", "1h30m"
  const reHM = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/;
  const hm = s.match(reHM);
  if (hm && (hm[1] || hm[2])) {
    const h = hm[1] ? parseInt(hm[1], 10) : 0;
    const m = hm[2] ? parseInt(hm[2], 10) : 0;
    return h * 60 + m;
  }

  // "HH:MM:SS"
  const hms = s.match(/^(\d{1,2}):([0-5]?\d):([0-5]?\d)$/);
  if (hms) {
    const h = parseInt(hms[1], 10),
      m = parseInt(hms[2], 10),
      sec = parseInt(hms[3], 10);
    return h * 60 + m + Math.floor(sec / 60);
  }

  // "HH:MM"
  const hm2 = s.match(/^(\d{1,2}):([0-5]?\d)$/);
  if (hm2) {
    const h = parseInt(hm2[1], 10),
      m = parseInt(hm2[2], 10);
    return h * 60 + m;
  }

  return 0;
}

const sumField = (arr, key) =>
  arr.reduce((acc, x) => acc + (Number(x?.[key]) || 0), 0);

/* ---------- Simple SSR cookie header ---------- */
async function buildCookieHeader() {
  const store = await cookies();
  const token = store.get("token")?.value;
  const refresh = store.get("refresh_token")?.value;
  return [token && `token=${token}`, refresh && `refresh_token=${refresh}`]
    .filter(Boolean)
    .join("; ");
}

/* ---------- API wrappers ---------- */
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
      `${
        process.env.NEXT_PUBLIC_MAIN_HOST
      }/api/time-tracking/${projectId}?date=${encodeURIComponent(date)}`,
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

/* ---------- Page ---------- */
const ProjectDetails = async ({ params }) => {
  const store = await cookies();
  const token = store.get("token")?.value;
  const refresh = store.get("refresh_token")?.value;

  if (!token && !refresh) return redirect(`/logggg`);

  const cookieHeader = await buildCookieHeader();

  const raw = token ? jwt.decode(token) : null;
  const { projectId } = await params;

  const [teamMembers, tasks, projectData] = await Promise.all([
    getTeamMembers(projectId, cookieHeader),
    getProjectTasks(projectId, cookieHeader),
    getProjectData(projectId, cookieHeader),
  ]);

  const currentDate = new Date().toISOString().split("T")[0];
  const tasksbyDate = await getProjectTasksByDate(
    projectId,
    currentDate,
    cookieHeader
  );

  const teamCount = teamMembers.members?.length || 0;
  const currentUser = raw;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // ---- NEW: aggregate time & amounts from tasks ----
  const totalSpentMinutesFromTasks = tasks.reduce(
    (acc, t) => acc + parseToMinutes(t?.last_timing),
    0
  );

  // If your task objects include these amount fields, they’ll be summed; otherwise zero.
  const spentAmountFromTasks = sumField(tasks, "spent_amount");
  const billableAmountFromTasks = sumField(tasks, "billable_amount");
  const invoicedAmountFromTasks = sumField(tasks, "invoiced_amount");

  const asLocalDate = (v) =>
    v ? new Date(v).toLocaleDateString("en-CA") : "Not set yet";

  // DEV HOUR
  function computeLiveCostDeveloperHour(tasks, teamMembers) {
    const members = Array.isArray(teamMembers?.members)
      ? teamMembers.members
      : [];

    const rateById = new Map();
    for (const m of members) {
      const r = Number(m?.user_rate_for_this_project);
      rateById.set(String(m?.user_id), isNaN(r) ? 0 : r);
    }

    let total = 0;
    const byUser = new Map(); 

    for (const t of tasks) {
      const minutes = parseToMinutes(t?.last_timing);
      const hours = minutes / 60;

      const rate = rateById.get(String(t?.assigned_to)) ?? 0;

      const amount = +(hours * rate).toFixed(2);
      total += amount;

      const key = String(t?.assigned_to);
      if (!byUser.has(key)) {
        byUser.set(key, {
          user_id: t?.assigned_to,
          username: t?.assigned_to_name || "Unknown",
          hours: 0,
          rate,
          amount: 0,
        });
      }
      const agg = byUser.get(key);
      agg.hours += hours;
      agg.amount += amount;
    }

    total = +total.toFixed(2);
    for (const v of byUser.values()) {
      v.hours = +v.hours.toFixed(2);
      v.amount = +v.amount.toFixed(2);
    }

    return { total, breakdown: Array.from(byUser.values()) };
  }

  // PROJECT HOUR
  function computeLiveCostProjectHour(
    totalSpentMinutesFromTasks,
    project_hour_rate
  ) {
    const rate = Number(project_hour_rate);
    const safeRate = isNaN(rate) ? 0 : rate;
    const hours = (Number(totalSpentMinutesFromTasks) || 0) / 60;
    const total = +(hours * safeRate).toFixed(2);

    return {
      total,
      breakdown: [
        {
          user_id: null,
          username: "Project rate",
          hours: +hours.toFixed(2),
          rate: safeRate,
          amount: total,
        },
      ],
    };
  }

  let liveCost = 0;
  let liveBreakdown = [];
  const type = String(projectData?.project_type || "").toLowerCase();

  if (type === "developer_hour") {
    const res = computeLiveCostDeveloperHour(tasks, teamMembers);
    liveCost = res.total;
    liveBreakdown = res.breakdown;
  } else if (type === "hourly") {
    const res = computeLiveCostProjectHour(
      totalSpentMinutesFromTasks,
      projectData?.project_hour_rate
    );
    liveCost = res.total;
    liveBreakdown = res.breakdown; 
  }
  console.log("Live Cost:", liveCost, "Breakdown:", liveBreakdown);

  // --------------------------------------

  const project = {
    id: projectId,
    name: projectData.project_name,
    description: projectData.project_description,
    status: projectData.status,
    progress: completionPercentage,
    deadline: asLocalDate(projectData.deadline),
    budget:
      projectData.total_budget == null
        ? "Not set yet"
        : `$${Number(projectData.total_budget).toFixed(2)}`,
    client: projectData.client_name || "TechCorp Inc.",
    category: projectData.category || "Web Development",
    priority: projectData.priority || "High",
    spentMinutes: totalSpentMinutesFromTasks,
    liveCost: liveCost,
    billableAmount: billableAmountFromTasks,
    invoicedAmount: invoicedAmountFromTasks,
    project_type: projectData.project_type,
    project_hour_rate: projectData.project_hour_rate,
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-5xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-600 mt-5">{project.description}</p>
          <div className="flex items-center space-x-4 mt-4">
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            <Badge className={getPriorityColor(project.priority)}>
              {project.priority} Priority
            </Badge>
            <Badge className="bg-purple-100 text-purple-800">
              {project.project_type || "Project Type Not Set"}
            </Badge>
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

      <PayStatsRow project={project} curruser={currentUser} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjOverviewCards
          project={project}
          teamCount={teamCount}
          curruser={currentUser}
        />
        <UserManagementCard users={teamMembers} teamCount={teamCount} />
      </div>

      <GanttChart projectId={projectId} tasks={tasksbyDate} />
      <ProjTaskCard tasks={tasks} curruser={currentUser} />
      <ProjDetailsCard project={project} />
    </div>
  );
};

export default ProjectDetails;
