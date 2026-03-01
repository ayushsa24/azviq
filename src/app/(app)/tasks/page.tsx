"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Sparkles,
  MoreHorizontal,
  Pin,
  Star,
  Trash2,
  MoveRight,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { CreateProjectModal } from "@/components/tasks/CreateProjectModal";
import { AITaskModal } from "@/components/tasks/AITaskModal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { ProjectDetailModal } from "@/components/tasks/ProjectDetailModal";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setMoveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, projectsRes, notesRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store", headers: { "Cache-Control": "no-cache" } }),
        fetch("/api/projects", { cache: "no-store", headers: { "Cache-Control": "no-cache" } }),
        fetch("/api/notes", { cache: "no-store", headers: { "Cache-Control": "no-cache" } }),
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }

      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
      }
    } catch (error) {
      console.error("Failed to load tasks and projects");
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      console.error("Failed to update status");
      fetchData(); // Revert on failure
    }
  };

  const handleTaskUpdated = (updatedTask?: any) => {
    if (updatedTask) {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    }
    fetchData(); // Re-sync in background to be safe
  };

  const handleQuickCreateTask = async (status: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Task",
          status,
        }),
      });

      if (res.ok) {
        const { task } = await res.json();
        setTasks((prev) => [task, ...prev]);
        setSelectedTask(task); // Open it immediately
      }
    } catch (e) {
      console.error("Failed to create task", e);
    }
  };

  const handleQuickCreateProject = async () => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Project",
          status: "not_started",
        }),
      });

      if (res.ok) {
        const { project } = await res.json();
        setProjects((prev) => [project, ...prev]);
        setSelectedProject(project); // Open it immediately
      }
    } catch (e) {
      console.error("Failed to create project", e);
    }
  };

  const handleProjectUpdated = (updatedProject: any) => {
    setProjects((prev: any) =>
      prev.map((p: any) => (p.id === updatedProject.id ? updatedProject : p))
    );
    fetchData();
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setOpenMenuId(null);
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete task", e);
      fetchData();
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setProjects((prev: any) => prev.filter((p: any) => p.id !== projectId));
    setOpenMenuId(null);
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete project", e);
      fetchData();
    }
  };

  const handleToggleTaskPin = async (task: any) => {
    const updated = { ...task, is_pinned: !task.is_pinned };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    setOpenMenuId(null);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: updated.is_pinned }),
    });
  };

  const handleToggleTaskFavorite = async (task: any) => {
    const updated = { ...task, is_favorite: !task.is_favorite };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    setOpenMenuId(null);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: updated.is_favorite }),
    });
  };

  const handleToggleProjectPin = async (project: any) => {
    const updated = { ...project, is_pinned: !project.is_pinned };
    setProjects((prev: any) => prev.map((p: any) => (p.id === project.id ? updated : p)));
    setOpenMenuId(null);
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: updated.is_pinned }),
    });
  };

  const handleToggleProjectFavorite = async (project: any) => {
    const updated = { ...project, is_favorite: !project.is_favorite };
    setProjects((prev: any) => prev.map((p: any) => (p.id === project.id ? updated : p)));
    setOpenMenuId(null);
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: updated.is_favorite }),
    });
  };

  const handleMoveTaskStatus = async (taskId: string, newStatus: string) => {
    setOpenMenuId(null);
    setMoveMenuId(null);
    updateTaskStatus(taskId, newStatus);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      updateTaskStatus(taskId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col bg-[#F5F3EF] dark:bg-[#111111]">
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 pb-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#161514] dark:text-gray-100">
          Project Management
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-xl text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Generate with AI</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-2 border-b border-[#E8E5E0] dark:border-[#333]">
        <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
          <button className="text-black dark:text-white border-b-2 border-black dark:border-white pb-2 -mb-[9px] flex items-center gap-2">
            Projects
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide" ref={menuRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Phase 4: Projects Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Projects</h2>
                <button
                  onClick={handleQuickCreateProject}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {projects.length === 0 ? (
                  <p className="text-sm text-gray-500">No projects yet.</p>
                ) : (
                  [...projects]
                    .sort((a: any, b: any) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
                    .map((p: any) => {
                      const projTasks = tasks.filter((t) => t.project_id === p.id);
                      const doneTasks = projTasks.filter((t) => t.status === "done" || t.status === "archived").length;
                      return (
                        <div
                          key={p.id}
                          className="relative min-w-[200px] h-32 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md flex flex-col justify-between cursor-pointer hover:border-gray-300 dark:hover:border-[#555] transition-all group"
                        >
                          {/* Dropdown */}
                          {openMenuId === p.id && (
                            <div className="absolute top-10 right-2 z-50 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleToggleProjectPin(p)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                                <Pin className="w-4 h-4" />
                                {p.is_pinned ? "Unpin" : "Pin"}
                              </button>
                              <button onClick={() => handleToggleProjectFavorite(p)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                                <Star className="w-4 h-4" />
                                {p.is_favorite ? "Unfavorite" : "Favorite"}
                              </button>
                              <div className="border-t border-gray-100 dark:border-[#444] my-1" />
                              <button onClick={() => handleDeleteProject(p.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}

                          {/* Single title row: pin/star + title + 3-dot */}
                          <div className="flex items-center gap-1.5">
                            {p.is_pinned && <Pin className="w-3 h-3 text-[#C2A27A] flex-shrink-0" />}
                            {p.is_favorite && <Star className="w-3 h-3 text-[#C2A27A] fill-[#C2A27A] flex-shrink-0" />}
                            <h3
                              onClick={() => setSelectedProject(p)}
                              className="font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 group-hover:text-black dark:group-hover:text-white text-sm"
                            >
                              {p.title}
                            </h3>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id); setMoveMenuId(null); }}
                              className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>



                          <div onClick={() => setSelectedProject(p)}>
                            <p className="text-xs text-gray-400 mt-1">
                              {projTasks.length > 0 ? `${doneTasks}/${projTasks.length} Tasks done` : "No tasks"}
                            </p>
                          </div>

                          <div className="flex items-center justify-between" onClick={() => setSelectedProject(p)}>
                            <span className={`text-xs px-2 py-1 rounded w-fit font-medium capitalize ${p.status === "in_progress" ? "bg-blue-50 text-blue-600" :
                              p.status === "done" ? "bg-green-50 text-green-600" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                              {p.status ? p.status.replace("_", " ") : "Not started"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Phase 5: Tasks Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Tasks</h2>
                <button
                  onClick={() => handleQuickCreateTask("not_started")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </button>
              </div>

              <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-[#333] p-4 min-h-[300px]">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {/* Kanban Columns */}
                  {[
                    "not_started",
                    "in_progress",
                    "in_review",
                    "done",
                    "archived",
                  ].map((status) => (
                    <div
                      key={status}
                      className="flex flex-col gap-2 min-h-[150px] bg-[#f0ede8] dark:bg-[#252525] rounded-xl p-2 border border-transparent hover:border-gray-200 dark:hover:border-[#444] transition-colors"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, status)}
                    >
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 capitalize flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${status === "done"
                              ? "bg-green-500"
                              : status === "in_progress"
                                ? "bg-blue-500"
                                : status === "in_review"
                                  ? "bg-purple-500"
                                  : status === "archived"
                                    ? "bg-gray-400"
                                    : "bg-orange-500"
                              }`}
                          ></span>
                          {status.replace("_", " ")}
                        </div>
                        <span className="text-xs bg-gray-200 dark:bg-[#333] text-gray-600 dark:text-gray-400 px-2 rounded-full">
                          {
                            filteredTasks.filter((t) => t.status === status)
                              .length
                          }
                        </span>
                      </h3>
                      {filteredTasks
                        .filter((t) => t.status === status)
                        .sort((a: any, b: any) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
                        .map((t) => (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, t.id)}
                            className="relative p-3 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#3A3A3A] rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-gray-300 dark:hover:border-[#555] transition-colors group/card"
                          >
                            {/* Dropdown */}
                            {openMenuId === t.id && (
                              <div className="absolute top-8 right-1 z-50 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleToggleTaskPin(t)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                                  <Pin className="w-4 h-4" />
                                  {t.is_pinned ? "Unpin" : "Pin"}
                                </button>
                                <button onClick={() => handleToggleTaskFavorite(t)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                                  <Star className="w-4 h-4" />
                                  {t.is_favorite ? "Unfavorite" : "Favorite"}
                                </button>
                                {/* Move submenu */}
                                <div className="relative">
                                  <button
                                    onClick={() => setMoveMenuId(moveMenuId === t.id ? null : t.id)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"
                                  >
                                    <MoveRight className="w-4 h-4" />
                                    Move to
                                    <span className="ml-auto text-gray-400">›</span>
                                  </button>
                                  {moveMenuId === t.id && (
                                    <div className="absolute left-full top-0 ml-1 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[150px]">
                                      {["not_started", "in_progress", "in_review", "done", "archived"].filter(s => s !== status).map(s => (
                                        <button
                                          key={s}
                                          onClick={() => handleMoveTaskStatus(t.id, s)}
                                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors capitalize"
                                        >
                                          {s.replace("_", " ")}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="border-t border-gray-100 dark:border-[#444] my-1" />
                                <button onClick={() => handleDeleteTask(t.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}

                            {/* Card content — single title row with pin left, 3-dot right */}
                            <div onClick={() => setSelectedTask(t)} className="cursor-pointer">
                              <div className="flex items-center gap-1.5">
                                {t.is_pinned && <Pin className="w-3 h-3 text-[#C2A27A] flex-shrink-0" />}
                                {t.is_favorite && <Star className="w-3 h-3 text-[#C2A27A] fill-[#C2A27A] flex-shrink-0" />}
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">
                                  {t.title}
                                </p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); setMoveMenuId(null); }}
                                  className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#444] opacity-0 group-hover/card:opacity-100 transition-all flex-shrink-0"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {t.due_date && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Due {format(new Date(t.due_date), "MMM d")}
                                </p>
                              )}
                              {t.linked_document_id && (
                                <Link
                                  href={`/library/${t.linked_document_type}/${t.linked_document_id}`}
                                  className="mt-3 flex items-center gap-1 w-fit px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 rounded text-[10px] font-semibold transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FileText className="w-3 h-3" />
                                  {t.linked_document_type === "pdf" ? "Open PDF" : "Open Note"}
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}

                      {/* Inline New Page Button */}
                      <button
                        onClick={() => handleQuickCreateTask(status)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#333] p-2 rounded-lg transition-colors mt-1 w-full text-left"
                      >
                        <Plus className="w-4 h-4" />
                        New page
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={fetchData}
      />

      <AITaskModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSuccess={fetchData}
        projects={projects}
      />

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        projects={projects}
        notes={notes}
        onTaskUpdated={handleTaskUpdated}
      />

      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        tasks={tasks}
        notes={notes}
        onProjectUpdated={handleProjectUpdated}
        onTaskUpdated={fetchData} // Trigger a root fetch to sync any inline task edits
      />
    </div>
  );
}
