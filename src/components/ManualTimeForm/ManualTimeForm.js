"use client";

import { useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CardTitle, CardDescription } from "@/components/ui/card";

export default function ManualTimeForm({ tasks, developerId }) {
  const projects = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => map.set(t.project_id, t.project_name));
    return Array.from(map.entries()).map(([project_id, project_name]) => ({
      project_id,
      project_name,
    }));
  }, [tasks]);

  const [form, setForm] = useState({
    task_id: "",
    project_id: "",
    developer_id: String(developerId),
    work_date: "",
    task_start: "",
    task_end: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const filteredTasks = useMemo(() => {
    if (!form.project_id) return tasks;
    return tasks.filter(
      (t) => String(t.project_id) === String(form.project_id)
    );
  }, [tasks, form.project_id]);

  const handleTaskChange = (e) => {
    const val = e.target.value;
    const selected = tasks.find((t) => String(t.task_id) === val);

    setForm((prev) => {
      const nextProjectId =
        prev.project_id || (selected ? String(selected.project_id) : "");
      return {
        ...prev,
        task_id: val,
        project_id: nextProjectId,
      };
    });
  };

  const handleProjectChange = (e) => {
    const projectId = e.target.value;

    setForm((prev) => {
      const currTask = tasks.find((t) => String(t.task_id) === prev.task_id);
      const taskBelongs =
        !prev.task_id ||
        (currTask && String(currTask.project_id) === String(projectId));

      return {
        ...prev,
        project_id: projectId,
        task_id: taskBelongs ? prev.task_id : "",
      };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.task_id) return "Please select a task.";
    if (!form.project_id) return "Please select a project.";
    if (!form.developer_id) return "Developer ID is required.";
    if (!form.work_date) return "Work date is required.";
    if (!form.task_start) return "Start time is required.";
    if (!form.task_end) return "End time is required.";
    if (form.task_end <= form.task_start)
      return "End time must be after start time.";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      task_id: parseInt(form.task_id, 10),
      project_id: parseInt(form.project_id, 10),
      developer_id: parseInt(form.developer_id, 10),
      work_date: form.work_date,
      task_start: `${form.work_date} ${form.task_start}`, 
      task_end: `${form.work_date} ${form.task_end}`,     
    };
    const parseLocal = (s) => new Date(s.replace(" ", "T"));

    const diffSeconds = Math.max(
      0,
      Math.floor((parseLocal(payload.task_end) - parseLocal(payload.task_start)) / 1000)
    );

    const selectedTask = tasks.find(t => String(t.task_id) === String(payload.task_id));
    const prevLast = parseInt(selectedTask?.last_timing ?? 0, 10) || 0;
    const totalTime = prevLast + diffSeconds;

    const apiBase =
      process.env.NEXT_PUBLIC_MAIN_HOST ||
      process.env.REACT_APP_API_BASE ||
      "";

    setSubmitting(true);
    const loadingId = toast.loading("Saving time entry...");

    try {
      const ttRes = await fetch(`${apiBase}/api/time-tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload), 
      });

      const ttData = await ttRes.json().catch(() => ({}));
      if (!ttRes.ok) {
        toast.dismiss(loadingId);
        toast.error(ttData?.error || "Failed to submit time tracking.");
        return;
      }

      const selectedTaskId = payload.task_id;
      const updateRes = await fetch(
        `${apiBase}/api/tasks/task-update/${selectedTaskId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            taskId: selectedTaskId,
            last_timing: totalTime, 
          }),
        }
      );

      if (!updateRes.ok) {
        const upd = await updateRes.json().catch(() => ({}));
        toast.dismiss(loadingId);
        toast.warning("Time saved, but updating task timing failed.", {
          description: upd?.error || "Could not update last_timing on the task.",
        });
      } else {
        toast.dismiss(loadingId);
        toast.success("Time tracking saved!", {
          description: `Added ${diffSeconds}s`,
        });
      }

      setForm({
        task_id: "",
        project_id: "",
        developer_id: String(developerId),
        work_date: "",
        task_start: "",
        task_end: "",
      });
    } catch (err) {
      console.error("Error submitting time tracking:", err);
      toast.dismiss(loadingId);
      toast.error("Network error submitting time tracking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Toaster richColors position="top-right" />

      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl overflow-hidden shadow-lg border border-primary/20 bg-white">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-2xl">Manual Time Entry</CardTitle>
                <CardDescription>
                  Submit manual time entries for tasks
                </CardDescription>
              </div>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Project</label>
                  <select
                    name="project_id"
                    value={form.project_id}
                    onChange={handleProjectChange}
                    className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">All projects</option>
                    {projects.map((p) => (
                      <option key={p.project_id} value={String(p.project_id)}>
                        {p.project_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Task</label>
                  <select
                    name="task_id"
                    value={form.task_id}
                    onChange={handleTaskChange}
                    className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">
                      {form.project_id ? "Select a task" : "All tasks"}
                    </option>
                    {filteredTasks.map((t) => (
                      <option key={t.task_id} value={String(t.task_id)}>
                        {t.task_name} — {t.project_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Developer ID</label>
                  <input
                    type="number"
                    name="developer_id"
                    value={form.developer_id}
                    readOnly
                    className="border rounded-md px-3 py-2 bg-muted"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Work Date</label>
                  <input
                    type="date"
                    name="work_date"
                    value={form.work_date}
                    onChange={handleChange}
                    className="border rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Task Start Time</label>
                  <input
                    type="time"
                    step="1"
                    name="task_start"
                    value={form.task_start}
                    onChange={handleChange}
                    className="border rounded-md px-3 py-2"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Task End Time</label>
                  <input
                    type="time"
                    step="1"
                    name="task_end"
                    value={form.task_end}
                    onChange={handleChange}
                    className="border rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Manual Time Entry"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
