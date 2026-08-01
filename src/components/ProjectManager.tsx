"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  GitBranch,
  Terminal,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  Code,
  Globe,
  Cpu,
  ExternalLink,
} from "lucide-react";
import type { Project, Terminal as TerminalType } from "@/db/schema";

interface ProjectManagerProps {
  projects: Project[];
  terminals: TerminalType[];
  onCreateProject: (project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onBuildProject: (id: string, buildType: string) => void;
  onSelectProject: (project: Project) => void;
  selectedProject: Project | null;
}

const PROJECT_TYPES = [
  { value: "react", label: "React", icon: "⚛️" },
  { value: "nextjs", label: "Next.js", icon: "▲" },
  { value: "vue", label: "Vue.js", icon: "🟢" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "flask", label: "Flask", icon: "🌶️" },
  { value: "django", label: "Django", icon: "🎸" },
  { value: "nodejs", label: "Node.js", icon: "🟩" },
  { value: "static", label: "Static HTML", icon: "📄" },
  { value: "android", label: "Android", icon: "🤖" },
  { value: "generic", label: "Generic", icon: "📦" },
];

export default function ProjectManager({
  projects,
  terminals,
  onCreateProject,
  onDeleteProject,
  onBuildProject,
  onSelectProject,
  selectedProject,
}: ProjectManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    projectType: "react",
    terminalId: "",
    gitUrl: "",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProject.name && newProject.terminalId) {
      onCreateProject(newProject);
      setShowCreateModal(false);
      setNewProject({
        name: "",
        description: "",
        projectType: "react",
        terminalId: "",
        gitUrl: "",
      });
    }
  };

  const getProjectIcon = (type: string) => {
    const found = PROJECT_TYPES.find((t) => t.value === type);
    return found?.icon || "📦";
  };

  const getProjectLabel = (type: string) => {
    const found = PROJECT_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-[#00ff41]" />
          <h2 className="text-[#00ff41] font-bold">PROJECTS</h2>
          <span className="text-xs text-[#008822] bg-[#00ff41]/10 px-2 py-0.5 rounded">
            {projects.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] transition-colors"
        >
          <Plus className="w-3 h-3" />
          NEW
        </button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-[#008822]">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No projects yet</p>
            <p className="text-xs mt-1">Create your first project</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className={`p-3 rounded cursor-pointer transition-all ${
                  selectedProject?.id === project.id
                    ? "bg-[#00ff41]/10 border border-[#00ff41]/50"
                    : "bg-[#111] border border-[#222] hover:border-[#00ff41]/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getProjectIcon(project.projectType || "generic")}</span>
                    <div>
                      <p className="text-[#00ff41] font-medium text-sm">
                        {project.name}
                      </p>
                      <p className="text-xs text-[#008822]">
                        {getProjectLabel(project.projectType || "generic")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBuildProject(project.id || "", "development");
                      }}
                      className="p-1.5 text-[#00ff41] hover:bg-[#00ff41]/10 rounded"
                      title="Build & Run"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (project.id) onDeleteProject(project.id);
                      }}
                      className="p-1.5 text-[#ff0040] hover:bg-[#ff0040]/10 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="mt-2 text-xs text-[#008822] line-clamp-2">
                    {project.description}
                  </p>
                )}

                {project.gitUrl && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-[#00ffff]">
                    <GitBranch className="w-3 h-3" />
                    <span className="truncate">{project.gitUrl}</span>
                  </div>
                )}

                {project.localPath && (
                  <p className="mt-1 text-xs text-[#008822] font-mono truncate">
                    {project.localPath}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      project.status === "active"
                        ? "bg-[#00ff41]/20 text-[#00ff41]"
                        : "bg-[#333] text-[#666]"
                    }`}
                  >
                    {project.status?.toUpperCase() || "ACTIVE"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#111] border border-[#00ff41]/30 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-[#00ff41] font-bold mb-4">CREATE NEW PROJECT</h3>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-[#008822] mb-1">PROJECT NAME</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="input-terminal w-full"
                  placeholder="my-awesome-app"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#008822] mb-1">DESCRIPTION</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="input-terminal w-full h-20 resize-none"
                  placeholder="Project description..."
                />
              </div>

              <div>
                <label className="block text-xs text-[#008822] mb-1">PROJECT TYPE</label>
                <select
                  value={newProject.projectType}
                  onChange={(e) => setNewProject({ ...newProject, projectType: e.target.value })}
                  className="input-terminal w-full"
                >
                  {PROJECT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#008822] mb-1">TARGET TERMINAL</label>
                <select
                  value={newProject.terminalId}
                  onChange={(e) => setNewProject({ ...newProject, terminalId: e.target.value })}
                  className="input-terminal w-full"
                  required
                >
                  <option value="">Select terminal...</option>
                  {terminals
                    .filter((t) => t.status === "online")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.deviceName || t.nodeToken} ({t.osType})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#008822] mb-1">GIT URL (Optional)</label>
                <input
                  type="text"
                  value={newProject.gitUrl}
                  onChange={(e) => setNewProject({ ...newProject, gitUrl: e.target.value })}
                  className="input-terminal w-full"
                  placeholder="https://github.com/user/repo.git"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-terminal flex-1"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="btn-terminal btn-terminal-cyan flex-1"
                >
                  CREATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
