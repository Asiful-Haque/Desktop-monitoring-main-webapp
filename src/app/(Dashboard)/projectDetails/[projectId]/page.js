import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  FileText,
} from "lucide-react";
import UserManagementCard from "@/components/UserManagementCard";
import ProjOverviewCards from "@/components/ProjOverviewCards";
import ProjTaskCard from "@/components/ProjTaskCard";
import ProjDetailsCard from "@/components/ProjDetailsCard";
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const getTeamMembers = async (projectId) => { // Its the api calling function
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/team-member/${projectId}`,
      {
        // To ensure data is fresh on every SSR request:
        cache: "no-store",
      }
    );
    if (!res.ok) {
      // throw new Error("Failed to fetch team members");
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching team members:", error);
    return [];
  }
};
const getProjectTasks = async (projectId) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tasks/task-project/${projectId}`, // Its the api calling function
      {
        cache: "no-store", // SSR fresh data
      }
    );
    if (!res.ok) {
      throw new Error("Failed to fetch tasks");
    }
    const data = await res.json();
    return data.tasks || [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

const getProjectData = async (projectId) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/projects/details/${projectId}`,
      {
        cache: "no-store", // SSR fresh data
      }
    );
    if (!res.ok) {
      throw new Error("Failed to fetch project data");
    }
    const data = await res.json();
    return data.projectDetailsResponse || {}; 
  } catch (error) {
    console.error("Error fetching project data:", error);
    return {}; 
  }
};


const ProjectDetails = async ({ params }) => {
  const { projectId } = await params;
  const teamMembers = await getTeamMembers(projectId); // calling the api from a function
  const tasks = await getProjectTasks(projectId);
  const projectData = await getProjectData(projectId);
  const teamCount = teamMembers.members?.length || 0;

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const currentUser = token ? jwt.decode(token) : null;

  // Mock project data - in real app, this would be fetched based on projectId
  const project = {
    id: projectId,
    name: projectData.project_name,
    description: projectData.project_description,
    status: projectData.status,
    progress: 75,
    deadline: "2024-02-15",
    createdDate: "2023-10-01",
    budget: "$150,000",
    client: "TechCorp Inc.",
    category: "Web Development",
    priority: "High",
  };

  // const tasks = [
  //   {
  //     id: 1,
  //     title: "User Authentication System",
  //     status: "Completed",
  //     assignee: "Alex Developer",
  //     dueDate: "2024-01-15",
  //   },
  //   {
  //     id: 2,
  //     title: "Product Catalog Integration",
  //     status: "In Progress",
  //     assignee: "Mike PM",
  //     dueDate: "2024-01-25",
  //   },
  //   {
  //     id: 3,
  //     title: "Payment Gateway Setup",
  //     status: "Pending",
  //     assignee: "Sarah Designer",
  //     dueDate: "2024-02-05",
  //   },
  //   {
  //     id: 4,
  //     title: "Mobile Responsiveness",
  //     status: "In Progress",
  //     assignee: "Tom QA",
  //     dueDate: "2024-02-10",
  //   },
  // ];
  //   {
  //     id: 1,
  //     username: "Alex Developer",
  //     role: "Lead Developer",
  //     avatar: "AD",
  //     status: "Active",
  //   },
  //   {
  //     id: 2,
  //     username: "Mike PM",
  //     role: "Product Manager",
  //     avatar: "MP",
  //     status: "Active",
  //   },
  //   {
  //     id: 3,
  //     username: "Sarah Designer",
  //     role: "UI/UX Designer",
  //     avatar: "SD",
  //     status: "Away",
  //   },
  //   {
  //     id: 4,
  //     username: "Tom QA",
  //     role: "QA Engineer",
  //     avatar: "TQ",
  //     status: "Active",
  //   },
  //       {
  //     id: 5,
  //     username: "Mike PM",
  //     role: "Product Manager",
  //     avatar: "MP",
  //     status: "Active",
  //   },
  //   {
  //     id: 6,
  //     username: "Sarah Designer",
  //     role: "UI/UX Designer",
  //     avatar: "SD",
  //     status: "Away",
  //   },
  //   {
  //     id: 7,
  //     username: "Tom QA",
  //     role: "QA Engineer",
  //     avatar: "TQ",
  //     status: "Active",
  //   },
  // ];

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "On Track":
        return "bg-blue-100 text-blue-800";
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
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            <Badge className={getPriorityColor(project.priority)}>
              {project.priority} Priority
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjOverviewCards project={project} teamCount={teamCount}/>
        <UserManagementCard users={teamMembers} />
      </div>
      <ProjTaskCard tasks={tasks} curruser={currentUser} />
      <ProjDetailsCard project={project} />
    </div>
  );
};

export default ProjectDetails;
