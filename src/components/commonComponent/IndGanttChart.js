"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

// Function to generate random colors
const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const IndGanttChart = ({ currUser, tasks }) => {
  const [developerColors, setDeveloperColors] = useState({});
  const [isMounted, setIsMounted] = useState(false);

  // Generate random colors for each developer only on the client-side
  useEffect(() => {
    const generateColors = () => {
      const colors = {};
      tasks.forEach(task => {
        if (!colors[task.developer_id]) {
          colors[task.developer_id] = getRandomColor(); // Generate a random color per developer
        }
      });
      setDeveloperColors(colors);
      setIsMounted(true); // Indicate that the component is mounted and ready for rendering
    };

    generateColors();
  }, [tasks]); // Regenerate colors when tasks change

  // Function to calculate task bar position and width
  const getTaskBarStyle = (task, index, allTasks) => {
    const startTime = new Date(task.task_start);
    const endTime = new Date(task.task_end);

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    const startPercentage = (startHour + startMinute / 60) / 24 * 100;
    const endPercentage = (endHour + endMinute / 60) / 24 * 100;
    const width = endPercentage - startPercentage;

    // Handling overlapping tasks by adjusting their left offset
    const overlapCount = allTasks.filter(t => t.task_start === task.task_start).length;
    const offset = (index / overlapCount) * 5; // Create subtle offset for overlapping tasks

    return {
      left: `${startPercentage + offset}%`,
      width: `${Math.max(width, 2)}%`,
    };
  };

  // Filter tasks for the current user (based on currUser's developer_id)
  const filteredTasks = tasks.filter(task => task.developer_id === currUser.id);

  // Group tasks by project and sort by task start time
  const groupedByProject = filteredTasks.reduce((acc, task) => {
    const projectId = task.project_id;
    if (!acc[projectId]) {
      acc[projectId] = { project: { id: projectId, name: `Project ${projectId}` }, tasks: [] };
    }
    acc[projectId].tasks.push(task);
    return acc;
  }, {});

  // Sort tasks by start time for each project
  Object.values(groupedByProject).forEach(group => {
    group.tasks.sort((a, b) => new Date(a.task_start).getTime() - new Date(b.task_start).getTime());
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Don't render until the client-side calculations are done
  if (!isMounted) {
    return null; // or a loading spinner
  }

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-blue-700">Developers Project Timeline</CardTitle>
        <CardDescription>24-hour task timeline showing developers work sessions for each project</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Time axis */}
          <div className="relative">
            <div className="flex justify-between text-xs text-gray-500 mb-2 ml-48">
              {hours.filter((_, i) => i % 2 === 0).map(hour => (
                <span key={hour} className="w-8 text-center">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              ))}
            </div>
            <div className="h-px bg-gray-200 mb-4 ml-48"></div>
          </div>

          {/* Project timelines */}
          <div className="space-y-4">
            {Object.values(groupedByProject).map((group) => (
              <div key={group.project.id} className="flex items-center space-x-4">
                {/* Project Info */}
                <div className="flex items-center space-x-3 w-44 flex-shrink-0">
                  <div>
                    <h3 className="font-medium text-gray-900">{group.project.name}</h3>
                  </div>
                </div>

                {/* Single timeline bar with all tasks */}
                <div className="relative flex-1 h-10 bg-gray-100 rounded-lg overflow-hidden">
                  {/* Hour grid lines */}
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className="absolute top-0 bottom-0 w-px bg-gray-200"
                      style={{ left: `${(hour / 24) * 100}%` }}
                    />
                  ))}

                  {/* Task bars */}
                  {group.tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="absolute top-1 bottom-1 rounded-sm flex items-center justify-center text-xs text-white font-medium hover:opacity-80 cursor-pointer transition-all duration-200 shadow-sm"
                      style={{
                        ...getTaskBarStyle(task, idx, group.tasks), // Adjusts task bar style dynamically
                        backgroundColor: developerColors[task.developer_id] || '#6B7280',
                        minWidth: '32px'
                      }}
                      title={`Task ${task.task_id} (${moment(task.work_date).format('YYYY-MM-DD')}): ${moment(task.task_start).format('HH:mm')} - ${moment(task.task_end).format('HH:mm')}`}
                    >
                      <span className="truncate px-1">T{task.task_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IndGanttChart;
