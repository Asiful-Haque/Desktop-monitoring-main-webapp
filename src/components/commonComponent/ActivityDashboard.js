import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { Chart as ChartJS, registerables } from "chart.js";
import "chartjs-adapter-luxon"; // Ensure Luxon adapter is imported

ChartJS.register(...registerables);

// Utility function to hash a string into a hue value (to generate unique colors)
const hashStringToHue = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
};

// Function to generate colors dynamically based on the user's name
const colorForUser = (userName, alpha = 1) => {
  const h = hashStringToHue(userName);
  const s = 90; // Increase saturation for more vibrant colors
  const l = 60; // Increase lightness for brighter colors
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`; // Adjusted alpha for more visibility
};

const ProjectActivityDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]); // Added state for users
  const [filters, setFilters] = useState({
    startDate: "", // Set dynamically to the first day of the current month
    endDate: "", // Set dynamically to the last day of the current month
    selectedUsers: [], // Change to track selected users
  });
  const [projectCount, setProjectCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);

  const chartRef = useRef(null); // Using useRef to get the chart context directly

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
    // Set the default date range to the current month
    const { firstDay, lastDay } = getFirstAndLastDateOfMonth();
    setFilters((prevFilters) => ({
      ...prevFilters,
      startDate: firstDay,
      endDate: lastDay,
    }));
  }, []);

  // Fetch Projects and Tasks data from APIs
  useEffect(() => {
    const fetchTasksData = async () => {
      try {
        const taskRes = await fetch("http://localhost:5500/api/tasks");

        if (!taskRes.ok) {
          console.error("Failed to fetch data from API");
          return;
        }

        const tasksData = await taskRes.json();

        // Now we use 'assigned_to' directly since it's a string
        const usersList = Array.from(
          new Set(tasksData.tasks.map((task) => task.assigned_to))
        );

        // Calculate the number of unique projects
        const projectList = Array.from(
          new Set(tasksData.tasks.map((task) => task.project_name))
        );

        // Calculate the activities count (completed tasks)
        const completedTasksCount = tasksData.tasks.filter(
          (task) => task.status === "completed"
        ).length;

        console.log("Tasks:", tasksData);
        console.log("Users:", usersList);
        console.log("Projects:", projectList);

        setTasks(tasksData.tasks);
        setUsers(usersList); // Set unique users
        setProjectCount(projectList.length); // Set project count
        setUserCount(usersList.length); // Set user count
        setActivityCount(completedTasksCount); // Set activity count

        // Set all users as selected by default
        setFilters((prevFilters) => ({
          ...prevFilters,
          selectedUsers: usersList,
        }));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchTasksData();
  }, []);

  // Filter and process completed tasks only
  const completedTasks = React.useMemo(() => {
    return tasks.filter(
      (task) => task.status === "completed" && task.end_date !== null
    );
  }, [tasks]);

  // Generate datasets based on selected users and project data
  const createDatasets = React.useCallback(
    (usersToInclude) => {
      // Get unique project names for the X-axis
      const projectNames = Array.from(
        new Set(completedTasks.map((task) => task.project_name))
      );

      const groupedData = {};

      completedTasks.forEach((task) => {
        // Only include tasks for selected users
        if (!usersToInclude.includes(task.assigned_to)) return;

        const key = `${task.project_name}_${task.end_date}_${task.assigned_to}`;
        if (!groupedData[key]) groupedData[key] = { ...task, count: 0 };
        groupedData[key].count += 1;
      });

      // Map projects and set the x-axis to be unique project names
      return projectNames.map((projectName) => ({
        label: projectName,
        data: completedTasks
          .filter(
            (task) =>
              task.project_name === projectName &&
              usersToInclude.includes(task.assigned_to)
          )
          .map((task) => ({
            x: task.project_name, // Ensure the project name appears on the x-axis
            y: task.end_date, // End date of task
            count: 1, // Fallback count value
            userColor: colorForUser(task.assigned_to), // Generate unique color for each user
          })),
        backgroundColor: "transparent", // No background for the entire dataset
        borderColor: "transparent", // Transparent border
        pointBorderColor: (ctx) => ctx.raw?.userColor || "gray", // Use dynamic color for user, fallback to gray
        pointBackgroundColor: (ctx) => ctx.raw?.userColor || "gray", // Use dynamic color for user, fallback to gray
        pointRadius: (ctx) => Math.min(8 + (ctx.raw?.count || 1) * 2, 16), // Check if `ctx.raw.count` exists
        pointHoverRadius: (ctx) => Math.min(12 + (ctx.raw?.count || 1) * 2, 20), // Check if `ctx.raw.count` exists
        pointStyle: "circle",
      }));
    },
    [completedTasks] // Ensure dependencies include completed tasks
  );

  // Update the chart with filtered data
  const updateChart = React.useCallback(
    (chart) => {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      const selectedUsers = filters.selectedUsers;

      chart.data.datasets = createDatasets(selectedUsers);
      chart.options.scales.y.min = startDate;
      chart.options.scales.y.max = endDate;
      chart.update();
    },
    [filters.startDate, filters.endDate, filters.selectedUsers, createDatasets]
  );

  // Handle date change in filters
  const handleDateChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  // Handle user selection change
  const handleUserChange = (e) => {
    const { checked, value } = e.target;
    setFilters({
      ...filters,
      selectedUsers: checked
        ? [...filters.selectedUsers, value]
        : filters.selectedUsers.filter((user) => user !== value),
    });
  };

  // Initialize chart and update on user or filter change
  useEffect(() => {
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

    // Initial chart update
    updateChart(activityChart);

    // Cleanup chart on component unmount
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
          Visualize project activities over time with interactive filters
        </p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Filters */}
        <div className="bg-white/70 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-medium text-gray-900">Filters</h2>
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800">Date Range</h3>
            <div className="mt-4 space-y-4">
              <input
                type="date"
                name="startDate"
                className="w-full p-3 border border-gray-300 rounded-md"
                value={filters.startDate}
                onChange={handleDateChange}
              />
              <input
                type="date"
                name="endDate"
                className="w-full p-3 border border-gray-300 rounded-md"
                value={filters.endDate}
                onChange={handleDateChange}
              />
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800">Users</h3>
            <div
              className="space-y-4 overflow-auto"
              style={{ maxHeight: "200px" }} // Make the list scrollable if there are many users
            >
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
              // Get today's date
              const today = new Date();
              const startDate = new Date(today);
              // Calculate 30 days ago
              startDate.setDate(today.getDate() - 30);
              // Set the end date to today (formatted as yyyy-mm-dd)
              const endDate = today.toISOString().split("T")[0];
              // Set the start date to 30 days ago (formatted as yyyy-mm-dd)
              const startDateFormatted = startDate.toISOString().split("T")[0];
              setFilters({
                startDate: startDateFormatted, // 30 days ago
                endDate: endDate, // today
                selectedUsers: users,
              });
            }}
          >
            Reset Filters (Last 30 Days)
          </button>
        </div>

        {/* Chart */}
        <div className="bg-white/70 rounded-lg p-6 shadow-md col-span-2">
          <h2 className="text-xl font-medium text-gray-900">
            Activity Overview
          </h2>
          <div className="w-full h-[400px] mt-6">
            <canvas ref={chartRef} id="activityChart"></canvas>
          </div>

          {/* Info Panel */}
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
