import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { Chart as ChartJS, registerables } from "chart.js";
import "chartjs-adapter-luxon";

ChartJS.register(...registerables);
const hashStringToHue = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
};

const colorForUser = (userName, alpha = 1) => {
  const h = hashStringToHue(userName);
  const s = 90;
  const l = 60;
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
};

const ProjectActivityDashboard = ({ curruser, teamSupremeProjects }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    selectedUsers: [],
  });
  const [projectCount, setProjectCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);
  const chartRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const todayStr = new Date().toISOString().split("T")[0];

  const openDatePicker = (ref) => {
    if (!ref?.current) return;
    if (typeof ref.current.showPicker === "function") ref.current.showPicker();
    else {
      ref.current.focus();
      ref.current.click();
    }
  };

  const clampToToday = (dateStr) => {
    if (!dateStr) return "";
    return dateStr > todayStr ? todayStr : dateStr;
  };

  const getFirstAndLastDateOfMonth = () => {
    const currentDate = new Date();
    const firstDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const lastDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    return {
      firstDay: firstDay.toISOString().split("T")[0],
      lastDay: lastDay.toISOString().split("T")[0],
    };
  };

  useEffect(() => {
    const { firstDay, lastDay } = getFirstAndLastDateOfMonth();
    const safeLast = lastDay > todayStr ? todayStr : lastDay;

    setFilters((prev) => ({
      ...prev,
      startDate: firstDay,
      endDate: safeLast,
    }));
  }, [todayStr]);

  useEffect(() => {
    const fetchTasksData = async () => {
      try {
        const taskRes = await fetch(
          `${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tasks`
        );

        if (!taskRes.ok) {
          console.error("Failed to fetch data from API");
          return;
        }

        const tasksData = await taskRes.json();
        let finalTasks = tasksData?.tasks ?? [];

        const roleRaw = String(curruser?.role || "").trim();
        const role = roleRaw.toLowerCase();

        const isDeveloper = role === "developer";
        const isTeamLead = role === "team lead";
        const isPM = role === "project manager";
        const isAdmin = role === "admin";
        const isFreelancer = role === "freelancer";

        if (curruser?.tenant_id != null) {
          finalTasks = finalTasks.filter((t) => {
            if (t?.tenant_id == null) return true;
            return String(t.tenant_id) === String(curruser.tenant_id);
          });
        }

        // ✅ Developer → only own tasks
        if (isDeveloper || isFreelancer) {
          finalTasks = finalTasks.filter(
            (task) => task.assigned_to_id === curruser.id
          );
        }

        // ✅ Team Lead / Project Manager → only tasks from their projects
        // ✅ Admin → should NOT be restricted to teamSupremeProjects
        if ((isTeamLead || isPM) && Array.isArray(teamSupremeProjects)) {
          const projectNames = teamSupremeProjects.map((p) =>
            typeof p === "object" ? p.project_name ?? p.name : p
          );
          finalTasks = finalTasks.filter((task) =>
            projectNames.includes(task.project_name)
          );
        }
        const usersList = Array.from(
          new Set(finalTasks.map((task) => task.assigned_to).filter(Boolean))
        );
        const completedTasks = finalTasks.filter(
          (task) => task.status === "completed" && task.end_date != null
        );

        const completedTasksCount = completedTasks.length;

        const projectList = Array.from(
          new Set(completedTasks.map((task) => task.project_name).filter(Boolean))
        );
        setTasks(completedTasks);
        setUsers(usersList);
        setProjectCount(projectList.length);
        setUserCount(usersList.length);
        setActivityCount(completedTasksCount);
        setFilters((prev) => ({
          ...prev,
          selectedUsers: usersList,
        }));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchTasksData();
  }, [curruser, teamSupremeProjects]);

  const completedTasks = React.useMemo(() => {
    return tasks.filter(
      (task) => task.status === "completed" && task.end_date !== null
    );
  }, [tasks]);

  const createDatasets = React.useCallback(
    (usersToInclude) => {
      const projectNames = Array.from(
        new Set(completedTasks.map((task) => task.project_name).filter(Boolean))
      );

      return projectNames.map((projectName) => ({
        label: projectName,
        data: completedTasks
          .filter(
            (task) =>
              task.project_name === projectName &&
              usersToInclude.includes(task.assigned_to)
          )
          .map((task) => ({
            x: task.project_name,
            y: task.end_date,
            count: 1,
            userColor: colorForUser(task.assigned_to),
          })),
        backgroundColor: "transparent",
        borderColor: "transparent",
        pointBorderColor: (ctx) => ctx.raw?.userColor || "gray",
        pointBackgroundColor: (ctx) => ctx.raw?.userColor || "gray",
        pointRadius: (ctx) => Math.min(8 + (ctx.raw?.count || 1) * 2, 16),
        pointHoverRadius: (ctx) => Math.min(12 + (ctx.raw?.count || 1) * 2, 20),
        pointStyle: "circle",
      }));
    },
    [completedTasks]
  );

  const updateChart = React.useCallback(
    (chart) => {
      const selectedUsers = filters.selectedUsers;

      chart.data.datasets = createDatasets(selectedUsers);
      if (filters.startDate && filters.endDate) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);

        chart.options.scales.y.min = startDate;
        chart.options.scales.y.max = endDate;
      }

      chart.update();
    },
    [filters.startDate, filters.endDate, filters.selectedUsers, createDatasets]
  );

  const handleDateChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => {
      let startDate = prev.startDate;
      let endDate = prev.endDate;

      if (name === "startDate") {
        startDate = clampToToday(value);
        if (!endDate || endDate < startDate) endDate = startDate;
        endDate = clampToToday(endDate);
      }

      if (name === "endDate") {
        endDate = clampToToday(value);
        if (!startDate) startDate = endDate;
        if (endDate < startDate) endDate = startDate;
        startDate = clampToToday(startDate);
      }
      return { ...prev, startDate, endDate };
    });
  };

  const handleUserChange = (e) => {
    const { checked, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      selectedUsers: checked
        ? [...prev.selectedUsers, value]
        : prev.selectedUsers.filter((user) => user !== value),
    }));
  };

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext("2d");

    const activityChart = new Chart(ctx, {
      type: "scatter",
      data: { datasets: createDatasets(filters.selectedUsers) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "category",
            title: { display: true, text: "Projects", color: "#333" },
            ticks: { color: "#666" },
            grid: { display: false },
          },
          y: {
            type: "time",
            time: {
              unit: "day",
              displayFormats: { day: "MMM d" },
              tooltipFormat: "MMM d, yyyy",
            },
            title: { display: true, text: "End Date", color: "#333" },
            ticks: { color: "#666" },
            grid: { color: "#e5e5e5" },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Tasks: ${context.raw.count}`,
              afterLabel: (context) => `Project: ${context.raw.x}`,
              title: (context) => {
                const date = new Date(context[0].raw.y);
                return date.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });
              },
            },
          },
        },
      },
    });

    updateChart(activityChart);

    return () => {
      activityChart.destroy();
    };
  }, [
    filters.selectedUsers,
    filters.startDate,
    filters.endDate,
    createDatasets,
    updateChart,
  ]);

  return (
    <div className="container mx-auto px-6 py-8">
      <header className="text-center mb-8 py-6 bg-white/70 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-gray-900">
          Project Activity Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Visualize project activities over time with interactive filters by completed tasks
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white/70 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-medium text-gray-900">Filters</h2>
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800">Date Range</h3>
            <div className="mt-4 space-y-4">
              <div
                className="w-full p-3 border border-gray-300 rounded-md bg-white cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => openDatePicker(startInputRef)}
                onKeyDown={(e) =>
                  e.key === "Enter" || e.key === " "
                    ? openDatePicker(startInputRef)
                    : null
                }
              >
                <input
                  ref={startInputRef}
                  type="date"
                  name="startDate"
                  className="w-full bg-transparent outline-none cursor-pointer"
                  value={filters.startDate}
                  onChange={handleDateChange}
                  max={
                    filters.endDate
                      ? filters.endDate < todayStr
                        ? filters.endDate
                        : todayStr
                      : todayStr
                  }
                />
              </div>

              <div
                className="w-full p-3 border border-gray-300 rounded-md bg-white cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => openDatePicker(endInputRef)}
                onKeyDown={(e) =>
                  e.key === "Enter" || e.key === " "
                    ? openDatePicker(endInputRef)
                    : null
                }
              >
                <input
                  ref={endInputRef}
                  type="date"
                  name="endDate"
                  className="w-full bg-transparent outline-none cursor-pointer"
                  value={filters.endDate}
                  onChange={handleDateChange}
                  min={filters.startDate || ""}
                  max={todayStr}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800">Users</h3>
            <div className="space-y-4 overflow-auto" style={{ maxHeight: "200px" }}>
              {users.map((user) => (
                <div className="flex items-center space-x-3" key={user}>
                  <input
                    type="checkbox"
                    value={user}
                    id={user}
                    className="w-5 h-5"
                    checked={filters.selectedUsers.includes(user)}
                    onChange={handleUserChange}
                  />
                  <span className="text-gray-800">{user}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            className="w-full mt-6 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-500 transition"
            onClick={() => {
              const today = new Date();
              const startDateObj = new Date(today);
              startDateObj.setDate(today.getDate() - 30);

              const endDate = today.toISOString().split("T")[0];
              const startDateFormatted = startDateObj.toISOString().split("T")[0];

              setFilters((prev) => ({
                ...prev,
                startDate: startDateFormatted,
                endDate: endDate,
                selectedUsers: users,
              }));
            }}
          >
            Reset Filters (Last 30 Days)
          </button>
        </div>

        <div className="bg-white/70 rounded-lg p-6 shadow-md col-span-2">
          <h2 className="text-xl font-medium text-gray-900">
            Activity Overview
          </h2>

          <div className="w-full h-[400px] mt-6">
            <canvas ref={chartRef} id="activityChart"></canvas>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-8 p-6 bg-blue-100 rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-semibold text-blue-600">
                {projectCount}
              </div>
              <div className="text-sm text-gray-600">Projects</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-semibold text-blue-600">
                {activityCount}
              </div>
              <div className="text-sm text-gray-600">Activities</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-semibold text-blue-600">
                {userCount}
              </div>
              <div className="text-sm text-gray-600">Users</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectActivityDashboard;
