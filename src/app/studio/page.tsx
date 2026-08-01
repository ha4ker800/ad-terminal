"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import ProjectManager from "@/components/ProjectManager";
import CodeEditor from "@/components/CodeEditor";
import ApiTester from "@/components/ApiTester";
import AddTerminalModal from "@/components/AddTerminalModal";
import type { Project, Terminal as TerminalType } from "@/db/schema";
import {
  Code,
  Globe,
  Terminal,
  Layout,
  Settings,
  Play,
  Pause,
  ExternalLink,
  Smartphone,
  Monitor,
  RefreshCw,
} from "lucide-react";

const ASCII_STUDIO = `
    _    ____  ____  _   _ ___ _   _  ____ 
   / \\\\  |  _ \\|  _ \\| | | |_ _| \\ | |/ ___|
  / _ \\ | | | | |_) | | | || ||  \\| | |  _ 
 / ___ \\| |_| |  __/| |_| || || |\\  | |_| |
/_/   \\_\\____/|_|    \\___/|___|_| \\_|\\____|
                                              
         [APP BUILDING STUDIO v1.0]
`;

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<"projects" | "editor" | "api" | "preview">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [terminals, setTerminals] = useState<TerminalType[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [executionMode, setExecutionMode] = useState<"single" | "parallel" | "adgodmode">("single");
  const [godModeActive, setGodModeActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLog, setBuildLog] = useState<string[]>([]);

  // Fetch data on mount
  useEffect(() => {
    fetchProjects();
    fetchTerminals();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("[AD TERMINAL :: ERROR] Failed to fetch projects:", error);
    }
  };

  const fetchTerminals = async () => {
    try {
      const response = await fetch("/api/terminals");
      if (response.ok) {
        const data = await response.json();
        setTerminals(data.terminals || []);
      }
    } catch (error) {
      console.error("[AD TERMINAL :: ERROR] Failed to fetch terminals:", error);
    }
  };

  const handleCreateProject = async (project: Partial<Project>) => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });

      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error("[AD TERMINAL :: ERROR] Failed to create project:", error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      fetchProjects();
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    } catch (error) {
      console.error("[AD TERMINAL :: ERROR] Failed to delete project:", error);
    }
  };

  const handleBuildProject = async (id: string, environment: string) => {
    setIsBuilding(true);
    setBuildLog((prev) => [
      ...prev,
      `[AD TERMINAL :: BUILD] Starting ${environment} build...`,
    ]);

    try {
      const response = await fetch(`/api/projects/${id}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildType: "full", environment }),
      });

      if (response.ok) {
        const data = await response.json();
        setBuildLog((prev) => [
          ...prev,
          `[AD TERMINAL :: BUILD] Commands:`,
          ...data.buildCommands.map((cmd: string) => `  > ${cmd}`),
        ]);
        
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
          setActiveTab("preview");
        }
      }
    } catch (error) {
      setBuildLog((prev) => [
        ...prev,
        `[AD TERMINAL :: BUILD ERROR] ${error}`,
      ]);
    } finally {
      setIsBuilding(false);
    }
  };

  const toggleGodMode = () => {
    const newMode = !godModeActive;
    setGodModeActive(newMode);
    setExecutionMode(newMode ? "adgodmode" : "single");
  };

  // Sample code for editor
  const sampleCode = `// AD TERMINAL Generated Code
import { useState, useEffect } from 'react';

export default function App() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Auto-generated fetch
    fetch('/api/data')
      .then(r => r.json())
      .then(setData);
  }, []);
  
  return (
    <div className="p-4">
      <h1>AD TERMINAL App</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}`;

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Navigation
        onAddTerminal={() => setIsAddModalOpen(true)}
        godModeActive={godModeActive}
        onToggleGodMode={toggleGodMode}
        executionMode={executionMode}
        onChangeMode={setExecutionMode}
      />

      <div className="p-4 md:p-6">
        {/* ASCII Header */}
        <div className="mb-4 overflow-x-auto">
          <pre className="ascii-art text-[6px] md:text-[8px] text-[#00ff41]/50">
            {ASCII_STUDIO}
          </pre>
        </div>

        {/* Studio Navigation */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "projects"
                ? "bg-[#00ff41] text-black"
                : "bg-[#111] text-[#00ff41] border border-[#222] hover:border-[#00ff41]"
            }`}
          >
            <Layout className="w-4 h-4" />
            PROJECTS
          </button>
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "editor"
                ? "bg-[#00ff41] text-black"
                : "bg-[#111] text-[#00ff41] border border-[#222] hover:border-[#00ff41]"
            }`}
          >
            <Code className="w-4 h-4" />
            CODE EDITOR
          </button>
          <button
            onClick={() => setActiveTab("api")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "api"
                ? "bg-[#00ff41] text-black"
                : "bg-[#111] text-[#00ff41] border border-[#222] hover:border-[#00ff41]"
            }`}
          >
            <Globe className="w-4 h-4" />
            API TESTER
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "preview"
                ? "bg-[#00ff41] text-black"
                : "bg-[#111] text-[#00ff41] border border-[#222] hover:border-[#00ff41]"
            }`}
          >
            <Monitor className="w-4 h-4" />
            PREVIEW
          </button>
        </div>

        {/* Content Area */}
        <div className="glass-card" style={{ height: "calc(100vh - 300px)", minHeight: "500px" }}>
          {activeTab === "projects" && (
            <ProjectManager
              projects={projects}
              terminals={terminals}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onBuildProject={handleBuildProject}
              onSelectProject={setSelectedProject}
              selectedProject={selectedProject}
            />
          )}

          {activeTab === "editor" && (
            <CodeEditor
              filePath={selectedProject ? `${selectedProject.name}/app.tsx` : "untitled.js"}
              initialContent={sampleCode}
              language="typescript"
              onSave={(content) => {
                console.log("[AD TERMINAL :: SAVE]", content);
              }}
              onExecute={(content) => {
                console.log("[AD TERMINAL :: EXECUTE]", content);
              }}
            />
          )}

          {activeTab === "api" && <ApiTester />}

          {activeTab === "preview" && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-[#00ff41]" />
                  <h2 className="text-[#00ff41] font-bold">LIVE PREVIEW</h2>
                </div>
                <div className="flex items-center gap-2">
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#00ff41] border border-[#00ff41]/30 rounded hover:bg-[#00ff41]/10"
                    >
                      <ExternalLink className="w-3 h-3" />
                      OPEN
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewUrl(null)}
                    className="p-1.5 text-[#008822] hover:text-[#00ff41]"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white">
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    title="Preview"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-[#111]">
                    <div className="text-center text-[#008822]">
                      <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No Preview Available</p>
                      <p className="text-sm">
                        Build and run a project to see the preview here
                      </p>
                      <button
                        onClick={() => setActiveTab("projects")}
                        className="mt-4 btn-terminal"
                      >
                        GO TO PROJECTS
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {buildLog.length > 0 && (
                <div className="h-32 bg-[#0a0a0a] border-t border-[#222] p-2 overflow-y-auto font-mono text-xs">
                  {buildLog.slice(-10).map((log, idx) => (
                    <div key={idx} className="text-[#00ff41]/70">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AddTerminalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTerminalAdded={() => {
          fetchTerminals();
        }}
      />
    </main>
  );
}
