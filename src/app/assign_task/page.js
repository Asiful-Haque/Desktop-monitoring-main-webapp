'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    project_name: '',
    assigned_to: '',
    created_by: '',
    title: '',
    description: '',
    status: 'Pending',
    priority: 'Medium',
    due_date: '',
  });
   useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log("localStorage value", localStorage.getItem('token'));
    }
  }, []);

  const [message, setMessage] = useState('');

  //  useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     if (typeof window !== 'undefined') {
  //       console.log('LocalStorage token (every 3s):', localStorage.getItem('token'));
  //     }
  //   }, 3000);

  //   // Cleanup on unmount
  //   return () => clearInterval(intervalId);
  // }, []);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.assigned_to) {
      setMessage('❌ Title and Assigned To are required');
      return;
    }

    try {
      console.log("Submitting form data:", formData);
      const res = await fetch(`${process.env.NEXT_PUBLIC_MAIN_HOST}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok) {
        setMessage(`✅ Task created successfully with ID: ${result.taskId}`);
        setFormData({
          project_name: '',
          assigned_to: '',
          created_by: '',
          title: '',
          description: '',
          status: 'Pending',
          priority: 'Medium',
          due_date: '',
        });
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error(error);
      setMessage('❌ Failed to create task');
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-green-600 to-blue-200 min-h-screen flex items-center justify-center">
      <div className="w-[40%] mx-auto p-6 bg-gray-300 shadow-md rounded-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Assign a Task</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block font-semibold">Project Name</label>
            <input
              type="text"
              name="project_name"
              value={formData.project_name}
              onChange={handleChange}
              placeholder="Enter project name"
              className="w-full mt-1 p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Assigned To</label>
            <input
              type="text"
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              placeholder="Enter assignee's name"
              className="w-full mt-1 p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block font-semibold">Created By</label>
            <input
              type="text"
              name="created_by"
              value={formData.created_by}
              onChange={handleChange}
              placeholder="Enter creator's name"
              className="w-full mt-1 p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter task title"
              className="w-full mt-1 p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block font-semibold">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter task description"
              className="w-full mt-1 p-2 border rounded"
              rows="4"
            />
          </div>

          <div>
            <label className="block font-semibold">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded"
            >
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold">Due Date</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded"
            />
          </div>

          <div className="text-center">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Assign Task
            </button>
          </div>

          {message && (
            <p className="text-center mt-4 text-sm text-gray-700">{message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
