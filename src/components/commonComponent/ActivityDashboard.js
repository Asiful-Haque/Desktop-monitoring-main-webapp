import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Chart as ChartJS, registerables } from 'chart.js';
import 'chartjs-adapter-luxon'; // Ensure Luxon adapter is imported

ChartJS.register(...registerables);

const ProjectActivityDashboard = () => {
  const [activityData, setActivityData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '2025-07-01',
    endDate: '2025-07-30',
    selectedTypes: ['rb', 'apt', 'ocn', 'ptc']
  });

  const chartRef = useRef(null); // Using useRef to get the chart context directly

  const activityTypes = React.useMemo(() => [
    { id: 'rb', name: 'P1', color: '#2563eb' },
    { id: 'apt', name: 'P2', color: '#f59e0b' },
    { id: 'ocn', name: 'P3', color: '#ef4444' },
    { id: 'ptc', name: 'P4', color: '#10b981' }
  ], []);

  const staticActivityData = [
    { project: 'Project A', date: '2025-07-01', activityType: 'rb', count: 2 },
    { project: 'Project B', date: '2025-07-02', activityType: 'apt', count: 1 },
    { project: 'Project C', date: '2025-07-03', activityType: 'ocn', count: 3 },
    { project: 'Project D', date: '2025-07-05', activityType: 'ptc', count: 1 },
    { project: 'Project E', date: '2025-07-06', activityType: 'rb', count: 2 },
    { project: 'Project A', date: '2025-07-08', activityType: 'apt', count: 2 },
    { project: 'Project B', date: '2025-07-10', activityType: 'ocn', count: 1 },
    { project: 'Project C', date: '2025-07-12', activityType: 'ptc', count: 2 },
    { project: 'Project D', date: '2025-07-15', activityType: 'rb', count: 3 },
    { project: 'Project E', date: '2025-07-18', activityType: 'apt', count: 1 },
    { project: 'Project F', date: '2025-07-20', activityType: 'ocn', count: 2 },
    { project: 'Project G', date: '2025-07-22', activityType: 'ptc', count: 1 },
    { project: 'Project H', date: '2025-07-25', activityType: 'rb', count: 2 },
    { project: 'Project I', date: '2025-07-27', activityType: 'apt', count: 3 },
    { project: 'Project J', date: '2025-07-29', activityType: 'ocn', count: 1 }
  ];

  // Initialize the activity data
  useEffect(() => {
    setActivityData(staticActivityData); // Initialize activity data
  }, []);

  const createDatasets = React.useCallback((typesToInclude) => {
    const groupedData = {};
    activityData.forEach((item) => {
      if (!typesToInclude.includes(item.activityType)) return;
      const key = `${item.project}_${item.date}_${item.activityType}`;
      if (!groupedData[key]) groupedData[key] = { ...item, count: 0 };
      groupedData[key].count += item.count;
    });
    return activityTypes.map((type) => ({
      label: type.name,
      data: Object.values(groupedData)
        .filter((item) => item.activityType === type.id)
        .map((item) => ({ x: item.project, y: item.date, count: item.count })),
      backgroundColor: type.color + '80',
      borderColor: type.color,
      pointRadius: (context) => {
        const count = context.raw ? context.raw.count : 1;
        return Math.min(8 + count * 2, 16);
      },
      pointHoverRadius: (context) => {
        const count = context.raw ? context.raw.count : 1;
        return Math.min(12 + count * 2, 20);
      },
      pointStyle: 'circle'
    }));
  }, [activityData, activityTypes]);

  const updateChart = React.useCallback((chart) => {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
    const selectedTypes = filters.selectedTypes;

    chart.data.datasets = createDatasets(selectedTypes);
    chart.options.scales.y.min = startDate;
    chart.options.scales.y.max = endDate;
    chart.update();
  }, [filters.startDate, filters.endDate, filters.selectedTypes, createDatasets]);

  const handleDateChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleTypeChange = (e) => {
    const { checked, id } = e.target;
    setFilters({
      ...filters,
      selectedTypes: checked
        ? [...filters.selectedTypes, id]
        : filters.selectedTypes.filter((type) => type !== id)
    });
  };

  // useEffect to handle chart initialization and updates
  useEffect(() => {
    const ctx = chartRef.current.getContext('2d');

    const activityChart = new Chart(ctx, {
      type: 'scatter',
      data: { datasets: createDatasets(filters.selectedTypes) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category',
            title: { display: true, text: 'Projects', color: '#333' },
            ticks: { color: '#666' },
            grid: { display: false }
          },
          y: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: { day: 'MMM d' },
              tooltipFormat: 'MMM d, yyyy'
            },
            title: { display: true, text: 'Date', color: '#333' },
            ticks: { color: '#666' },
            grid: { color: '#e5e5e5' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Activities: ${context.raw.count}`,
              afterLabel: (context) => `Project: ${context.raw.x}`,
              title: (context) => {
                const date = new Date(context[0].raw.y);
                return date.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                });
              }
            }
          }
        }
      }
    });

    // Initial chart update
    updateChart(activityChart);

    // Cleanup chart on component unmount
    return () => {
      activityChart.destroy();
    };
  }, [filters.selectedTypes, filters.startDate, filters.endDate, createDatasets, updateChart]); // Re-run when filters change

  return (
    <div className="container mx-auto px-6 py-8">
      <header className="text-center mb-8 py-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-gray-900">Project Activity Dashboard</h1>
        <p className="text-gray-600 mt-2">Visualize project activities over time with interactive filters</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Filters */}
        <div className="bg-white rounded-lg p-6 shadow-md">
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
            <h3 className="text-lg font-medium text-gray-800">Persons</h3>
            <div className="space-y-4">
              {activityTypes.map((type) => (
                <div className="flex items-center space-x-3" key={type.id}>
                  <div
                    className="w-4 h-4 rounded-sm"
                    style={{
                      backgroundColor: type.color,
                      borderColor: type.color,
                    }}
                  />
                  <span className="text-gray-800">{type.name}</span>
                  <input
                    type="checkbox"
                    id={type.id}
                    className="w-5 h-5"
                    checked={filters.selectedTypes.includes(type.id)}
                    onChange={handleTypeChange}
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            className="w-full mt-6 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-500 transition"
            onClick={() => {
              setFilters({
                startDate: '2025-07-01',
                endDate: '2025-07-30',
                selectedTypes: activityTypes.map((type) => type.id),
              });
            }}
          >
            Reset Filters
          </button>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg p-6 shadow-md col-span-2">
          <h2 className="text-xl font-medium text-gray-900">Activity Overview</h2>
          <div className="w-full h-[400px] mt-6">
            <canvas ref={chartRef} id="activityChart"></canvas>
          </div>

          {/* Info Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8 p-6 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-semibold text-blue-600" id="totalProjects">10</div>
              <div className="text-sm text-gray-600">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold text-blue-600" id="totalActivities">42</div>
              <div className="text-sm text-gray-600">Activities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold text-blue-600" id="activityTypes">4</div>
              <div className="text-sm text-gray-600">Persons</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold text-blue-600" id="dateRange">45</div>
              <div className="text-sm text-gray-600">Days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 

export default ProjectActivityDashboard;
