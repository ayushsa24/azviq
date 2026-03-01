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
  CalendarDays,
  Layers,
  LayoutGrid,
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
  const [projectSearch, setProjectSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<"all" | "in_progress" | "done" | "archived" | "not_started">("all");
  const [taskView, setTaskView] = useState<"kanban" | "by_date" | "by_projects">("kanban");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu') && !target.closest('.context-menu-button')) {
        setOpenMenuId(null);
        setMoveMenuId(null);
        setMenuPosition(null);
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

  const filteredProjects = [...projects]
    .filter((p: any) => {
      const matchesSearch = p.title.toLowerCase().includes(projectSearch.toLowerCase());
      const matchesFilter = projectFilter === "all" || p.status === projectFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a: any, b: any) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  // By Date view: group tasks by due_date
  const tasksByDate = filteredTasks.reduce((acc: Record<string, any[]>, t: any) => {
    const key = t.due_date ? format(new Date(t.due_date), "MMM d, yyyy") : "No due date";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  // By Projects view: group tasks by project
  const tasksByProject = filteredTasks.reduce((acc: Record<string, any[]>, t: any) => {
    const proj = projects.find((p: any) => p.id === t.project_id);
    const key = proj ? proj.title : "No Project";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  // Tab style helper (matches library page)
  const tabCls = (active: boolean) =>
    `px-1 py-2.5 border-b-2 font-medium text-sm mr-6 whitespace-nowrap snap-start transition-colors ${active
      ? "border-[#252525] dark:border-[#CFCFCF] text-[#252525] dark:text-[#CFCFCF]"
      : "border-transparent text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
    }`;

  const viewBtnCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${active
      ? "bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525]"
      : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#E8E5E0] dark:hover:bg-[#252525]"
    }`;

  return (
    <div className="flex h-full flex-col bg-[#F5F3EF] dark:bg-[#111111]">
      {/* ── Page Title + AI button ── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#161514] dark:text-[#CFCFCF]">Project Management</h1>
        <button
          onClick={() => setIsAIModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-xl text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Generate with AI</span>
        </button>
      </div>

      {/* ── Scrollable main area ── */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-8 pt-4">

            {/* ══════════════════════════════
                PROJECTS SECTION
            ══════════════════════════════ */}
            <div>
              {/* Row 1: Search + New Project */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#545454] dark:text-[#7D7D7D]" size={16} />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#333] rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#C2A27A] dark:focus:border-[#C2A27A] transition-all text-[#252525] dark:text-[#CFCFCF] placeholder-[#9E9E9E]"
                  />
                </div>
                <button
                  onClick={handleQuickCreateProject}
                  className="flex items-center gap-2 px-4 py-2 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white rounded-full text-sm font-medium transition-all shadow-sm shrink-0"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">New Project</span>
                </button>
              </div>

              {/* Row 2: Filter Tabs */}
              <div className="relative flex border-b border-[#E8E5E0] dark:border-[#333] mb-4">
                <div className="flex overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x flex-1">
                  {(["all", "in_progress", "done", "archived", "not_started"] as const).map((f) => (
                    <button key={f} onClick={() => setProjectFilter(f)} className={tabCls(projectFilter === f)}>
                      {f === "all" ? "All Projects" : f === "in_progress" ? "In Progress" : f === "done" ? "Done" : f === "archived" ? "Archive" : "Not Started"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Project Cards */}
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {filteredProjects.length === 0 ? (
                  <p className="text-sm text-[#545454] dark:text-[#7D7D7D] py-6">No projects found.</p>
                ) : (
                  filteredProjects.map((p: any) => {
                    const projTasks = tasks.filter((t) => t.project_id === p.id);
                    const doneTasks = projTasks.filter((t) => t.status === "done" || t.status === "archived").length;
                    return (
                      <div
                        key={p.id}
                        className="relative min-w-[200px] h-32 rounded-xl bg-white dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#333] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md flex flex-col justify-between cursor-pointer hover:border-[#C2A27A] dark:hover:border-[#C2A27A] transition-all group"
                      >
                        {/* Title row */}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openMenuId === p.id) {
                                setOpenMenuId(null);
                                setMenuPosition(null);
                              } else {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setMenuPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                setOpenMenuId(p.id);
                              }
                              setMoveMenuId(null);
                            }}
                            className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] sm:opacity-0 sm:group-hover:opacity-100 transition-all flex-shrink-0 context-menu-button"
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
                          <span className={`text-xs px-2 py-1 rounded w-fit font-medium capitalize ${p.status === "in_progress" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                            p.status === "done" ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" :
                              p.status === "archived" ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400" :
                                "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
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

            {/* ══════════════════════════════
                TASKS SECTION
            ══════════════════════════════ */}
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#161514] dark:text-[#CFCFCF] mb-3">Tasks</h2>

              {/* Row 1: Search + New Task */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#545454] dark:text-[#7D7D7D]" size={16} />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#333] rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#C2A27A] dark:focus:border-[#C2A27A] transition-all text-[#252525] dark:text-[#CFCFCF] placeholder-[#9E9E9E]"
                  />
                </div>
                <button
                  onClick={() => handleQuickCreateTask("not_started")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white rounded-full text-sm font-medium transition-all shadow-sm shrink-0"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">New Task</span>
                </button>
              </div>

              {/* Row 2: View Toggle Tabs */}
              <div className="relative flex border-b border-[#E8E5E0] dark:border-[#333] mb-4">
                <div className="flex overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x">
                  <button onClick={() => setTaskView("kanban")} className={tabCls(taskView === "kanban")}>
                    <LayoutGrid size={14} className="inline mr-1.5" />Kanban
                  </button>
                  <button onClick={() => setTaskView("by_date")} className={tabCls(taskView === "by_date")}>
                    <CalendarDays size={14} className="inline mr-1.5" />By Date
                  </button>
                  <button onClick={() => setTaskView("by_projects")} className={tabCls(taskView === "by_projects")}>
                    <Layers size={14} className="inline mr-1.5" />By Projects
                  </button>
                </div>
              </div>

              {/* ── Kanban View ── */}
              {taskView === "kanban" && (
                <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-[#E8E5E0] dark:border-[#333] p-4 min-h-[300px] overflow-x-auto">
                  <div className="flex gap-4">
                    {["not_started", "in_progress", "in_review", "done", "archived"].map((status) => (
                      <div
                        key={status}
                        className="flex flex-col gap-2 min-h-[200px] min-w-[260px] flex-1 bg-[#f0ede8] dark:bg-[#252525] rounded-xl p-3 border border-transparent hover:border-[#E8E5E0] dark:hover:border-[#444] transition-colors"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                      >
                        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 capitalize flex items-center justify-between mb-2 px-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${status === "done" ? "bg-green-500" :
                              status === "in_progress" ? "bg-blue-500" :
                                status === "in_review" ? "bg-purple-500" :
                                  status === "archived" ? "bg-gray-400" : "bg-orange-500"
                              }`} />
                            {status.replace("_", " ")}
                          </div>
                          <span className="text-xs bg-gray-200 dark:bg-[#333] text-gray-600 dark:text-gray-400 px-2 rounded-full">
                            {filteredTasks.filter((t) => t.status === status).length}
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
                              className="relative p-3 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#3A3A3A] rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-[#C2A27A] dark:hover:border-[#C2A27A] transition-colors group/card"
                            >
                              {openMenuId === t.id && (
                                <div className="absolute top-8 right-1 z-50 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[180px] context-menu" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => handleToggleTaskPin(t)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                                    <Pin className="w-4 h-4" />{t.is_pinned ? "Unpin" : "Pin"}
                                  </button>
                                  <button onClick={() => handleToggleTaskFavorite(t)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                                    <Star className="w-4 h-4" />{t.is_favorite ? "Unfavorite" : "Favorite"}
                                  </button>
                                  <div className="relative">
                                    <button onClick={() => setMoveMenuId(moveMenuId === t.id ? null : t.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                                      <MoveRight className="w-4 h-4" />Move to<span className="ml-auto text-gray-400">›</span>
                                    </button>
                                    {moveMenuId === t.id && (
                                      <div className="absolute left-full top-0 ml-1 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[150px]">
                                        {["not_started", "in_progress", "in_review", "done", "archived"].filter(s => s !== status).map(s => (
                                          <button key={s} onClick={() => handleMoveTaskStatus(t.id, s)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors capitalize">
                                            {s.replace("_", " ")}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="border-t border-gray-100 dark:border-[#444] my-1" />
                                  <button onClick={() => handleDeleteTask(t.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <Trash2 className="w-4 h-4" />Delete
                                  </button>
                                </div>
                              )}
                              <div onClick={() => setSelectedTask(t)} className="cursor-pointer">
                                <div className="flex items-center gap-1.5">
                                  {t.is_pinned && <Pin className="w-3 h-3 text-[#C2A27A] flex-shrink-0" />}
                                  {t.is_favorite && <Star className="w-3 h-3 text-[#C2A27A] fill-[#C2A27A] flex-shrink-0" />}
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{t.title}</p>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); setMoveMenuId(null); }}
                                    className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#444] sm:opacity-0 sm:group-hover/card:opacity-100 transition-all flex-shrink-0 context-menu-button"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {t.due_date && <p className="text-xs text-gray-500 mt-2">Due {format(new Date(t.due_date), "MMM d")}</p>}
                                {t.linked_document_id && (
                                  <Link href={`/library/${t.linked_document_type}/${t.linked_document_id}`} className="mt-3 flex items-center gap-1 w-fit px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 rounded text-[10px] font-semibold transition-colors" onClick={(e) => e.stopPropagation()}>
                                    <FileText className="w-3 h-3" />{t.linked_document_type === "pdf" ? "Open PDF" : "Open Note"}
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        <button onClick={() => handleQuickCreateTask(status)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#333] p-2 rounded-lg transition-colors mt-1 w-full text-left">
                          <Plus className="w-4 h-4" />New page
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── By Date View ── */}
              {taskView === "by_date" && (
                <div className="space-y-4">
                  {Object.keys(tasksByDate).length === 0 ? (
                    <p className="text-sm text-[#545454] dark:text-[#7D7D7D] py-6">No tasks found.</p>
                  ) : (
                    Object.entries(tasksByDate)
                      .sort(([a], [b]) => {
                        if (a === "No due date") return 1;
                        if (b === "No due date") return -1;
                        return new Date(a).getTime() - new Date(b).getTime();
                      })
                      .map(([dateLabel, dateTasks]) => (
                        <div key={dateLabel}>
                          <h3 className="text-xs font-bold text-[#545454] dark:text-[#7D7D7D] uppercase tracking-widest mb-2">{dateLabel}</h3>
                          <div className="space-y-2">
                            {(dateTasks as any[]).map((t: any) => (
                              <div key={t.id} onClick={() => setSelectedTask(t)} className="flex items-center gap-3 p-3 bg-white dark:bg-[#1A1A1A] rounded-xl border border-[#E8E5E0] dark:border-[#333] hover:border-[#C2A27A] dark:hover:border-[#C2A27A] cursor-pointer transition-colors">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === "done" ? "bg-green-500" :
                                  t.status === "in_progress" ? "bg-blue-500" :
                                    t.status === "in_review" ? "bg-purple-500" :
                                      t.status === "archived" ? "bg-gray-400" : "bg-orange-500"
                                  }`} />
                                {t.is_pinned && <Pin className="w-3 h-3 text-[#C2A27A] flex-shrink-0" />}
                                {t.is_favorite && <Star className="w-3 h-3 text-[#C2A27A] fill-[#C2A27A] flex-shrink-0" />}
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{t.title}</p>
                                <span className="text-xs text-[#545454] dark:text-[#7D7D7D] capitalize">{t.status?.replace("_", " ")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}

              {/* ── By Projects View ── */}
              {taskView === "by_projects" && (
                <div className="space-y-4">
                  {Object.keys(tasksByProject).length === 0 ? (
                    <p className="text-sm text-[#545454] dark:text-[#7D7D7D] py-6">No tasks found.</p>
                  ) : (
                    Object.entries(tasksByProject).map(([projLabel, projTasks]) => (
                      <div key={projLabel}>
                        <h3 className="text-xs font-bold text-[#545454] dark:text-[#7D7D7D] uppercase tracking-widest mb-2">{projLabel}</h3>
                        <div className="space-y-2">
                          {(projTasks as any[]).map((t: any) => (
                            <div key={t.id} onClick={() => setSelectedTask(t)} className="flex items-center gap-3 p-3 bg-white dark:bg-[#1A1A1A] rounded-xl border border-[#E8E5E0] dark:border-[#333] hover:border-[#C2A27A] dark:hover:border-[#C2A27A] cursor-pointer transition-colors">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === "done" ? "bg-green-500" :
                                t.status === "in_progress" ? "bg-blue-500" :
                                  t.status === "in_review" ? "bg-purple-500" :
                                    t.status === "archived" ? "bg-gray-400" : "bg-orange-500"
                                }`} />
                              {t.is_pinned && <Pin className="w-3 h-3 text-[#C2A27A] flex-shrink-0" />}
                              {t.is_favorite && <Star className="w-3 h-3 text-[#C2A27A] fill-[#C2A27A] flex-shrink-0" />}
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{t.title}</p>
                              <span className="text-xs text-[#545454] dark:text-[#7D7D7D] capitalize">{t.status?.replace("_", " ")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
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

      {/* Project 3-dot dropdown — fixed so it escapes overflow scroll */}
      {openMenuId && menuPosition && (() => {
        const p = filteredProjects.find((proj: any) => proj.id === openMenuId);
        if (!p) return null;
        return (
          <div
            className="fixed z-[9999] bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[160px] context-menu"
            style={{ top: menuPosition.top, right: menuPosition.right }}
            onClick={(e) => e.stopPropagation()}
          >
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
        );
      })()}
    </div>
  );
}
