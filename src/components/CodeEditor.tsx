"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Undo,
  Redo,
  Play,
  FileCode,
  GitCommit,
  Diff,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import type { CodePatch, PatchOperation } from "@/lib/ast/patcher";

interface CodeEditorProps {
  filePath?: string;
  initialContent?: string;
  language?: string;
  onSave?: (content: string) => void;
  onExecute?: (content: string) => void;
}

export default function CodeEditor({
  filePath = "untitled.js",
  initialContent = "",
  language = "javascript",
  onSave,
  onExecute,
}: CodeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [originalContent, setOriginalContent] = useState(initialContent);
  const [history, setHistory] = useState<string[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [patchOperations, setPatchOperations] = useState<PatchOperation[]>([]);
  const [isPatching, setIsPatching] = useState(false);
  const [patchResult, setPatchResult] = useState<CodePatch | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [newOperation, setNewOperation] = useState<Partial<PatchOperation>>({
    type: "insert_function",
    target: "",
    content: "",
    position: "after",
  });

  useEffect(() => {
    setContent(initialContent);
    setOriginalContent(initialContent);
    setHistory([initialContent]);
    setHistoryIndex(0);
  }, [initialContent, filePath]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setContent(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(history[historyIndex + 1]);
    }
  };

  const hasChanges = content !== originalContent;

  const handleAddOperation = () => {
    if (newOperation.type && newOperation.target && newOperation.content) {
      setPatchOperations([
        ...patchOperations,
        newOperation as PatchOperation,
      ]);
      setNewOperation({
        type: "insert_function",
        target: "",
        content: "",
        position: "after",
      });
    }
  };

  const handleApplyPatch = async () => {
    if (patchOperations.length === 0) return;

    setIsPatching(true);
    setPatchError(null);

    try {
      const response = await fetch("/api/projects/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath,
          originalContent: content,
          operations: patchOperations,
          language,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPatchResult(result.patch);
        handleChange(result.patch.patchedContent);
        setPatchOperations([]);
        setShowPatchModal(false);
      } else {
        setPatchError(result.error || "Patch failed");
      }
    } catch (error) {
      setPatchError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsPatching(false);
    }
  };

  const lineCount = content.split("\n").length;
  const charCount = content.length;

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-[#222] bg-[#111]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#00ff41]" />
          <span className="text-[#00ff41] text-sm font-mono">{filePath}</span>
          {hasChanges && (
            <span className="text-xs text-[#ffaa00]">● modified</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="p-1.5 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-30"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-30"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[#333] mx-1" />
          <button
            onClick={() => setShowPatchModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#00ffff] hover:bg-[#00ffff]/10 rounded"
          >
            <GitCommit className="w-3 h-3" />
            AST PATCH
          </button>
          <div className="w-px h-4 bg-[#333] mx-1" />
          <button
            onClick={() => onSave?.(content)}
            disabled={!hasChanges}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] disabled:opacity-50 rounded"
          >
            <Save className="w-3 h-3" />
            SAVE
          </button>
          <button
            onClick={() => onExecute?.(content)}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-[#00ffff] text-black font-bold hover:bg-[#00cccc] rounded"
          >
            <Play className="w-3 h-3" />
            RUN
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div className="w-12 bg-[#0a0a0a] border-r border-[#222] py-2 text-right pr-2 select-none">
          {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
            <div
              key={i + 1}
              className="text-xs text-[#333] font-mono leading-5"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 bg-transparent text-[#00ff41] font-mono text-sm p-2 resize-none outline-none leading-5"
          spellCheck={false}
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#111] border-t border-[#222] text-xs text-[#008822]">
        <div className="flex items-center gap-4">
          <span>{language.toUpperCase()}</span>
          <span>UTF-8</span>
          <span>{lineCount} lines</span>
          <span>{charCount} chars</span>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && <span className="text-[#ffaa00]">Unsaved changes</span>}
          <span>[AD TERMINAL :: EDITOR]</span>
        </div>
      </div>

      {/* Patch Modal */}
      {showPatchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#111] border border-[#00ffff]/30 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <h3 className="text-[#00ffff] font-bold mb-4 flex items-center gap-2">
              <GitCommit className="w-5 h-5" />
              AST CODE PATCHING
            </h3>

            {/* Operations List */}
            <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
              {patchOperations.map((op, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-[#0a0a0a] border border-[#222] rounded text-xs"
                >
                  <span className="text-[#00ffff]">{op.type}</span>
                  <span className="text-[#008822]"> → </span>
                  <span className="text-[#00ff41]">{op.target}</span>
                </div>
              ))}
              {patchOperations.length === 0 && (
                <p className="text-[#008822] text-xs italic">
                  No operations added yet
                </p>
              )}
            </div>

            {/* Add Operation Form */}
            <div className="space-y-3 mb-4 p-3 bg-[#0a0a0a] rounded border border-[#222]">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newOperation.type}
                  onChange={(e) =>
                    setNewOperation({ ...newOperation, type: e.target.value as PatchOperation["type"] })
                  }
                  className="input-terminal text-xs"
                >
                  <option value="insert_function">Insert Function</option>
                  <option value="insert_class">Insert Class</option>
                  <option value="insert_import">Insert Import</option>
                  <option value="modify_function">Modify Function</option>
                  <option value="delete_function">Delete Function</option>
                  <option value="replace_block">Replace Block</option>
                  <option value="add_property">Add Property</option>
                  <option value="modify_line">Modify Line</option>
                </select>
                <input
                  type="text"
                  value={newOperation.target}
                  onChange={(e) =>
                    setNewOperation({ ...newOperation, target: e.target.value })
                  }
                  placeholder="Target (function/class name)"
                  className="input-terminal text-xs"
                />
              </div>
              <textarea
                value={newOperation.content}
                onChange={(e) =>
                  setNewOperation({ ...newOperation, content: e.target.value })
                }
                placeholder="New code content..."
                className="input-terminal w-full h-24 text-xs font-mono resize-none"
              />
              <button
                onClick={handleAddOperation}
                className="btn-terminal btn-terminal-cyan w-full text-xs"
              >
                ADD OPERATION
              </button>
            </div>

            {patchError && (
              <div className="mb-4 p-3 bg-[#ff0040]/10 border border-[#ff0040]/30 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#ff0040]" />
                <span className="text-[#ff0040] text-xs">{patchError}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowPatchModal(false)}
                className="btn-terminal flex-1"
              >
                CANCEL
              </button>
              <button
                onClick={handleApplyPatch}
                disabled={patchOperations.length === 0 || isPatching}
                className="btn-terminal btn-terminal-cyan flex-1 flex items-center justify-center gap-2"
              >
                {isPatching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    PATCHING...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    APPLY PATCH
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
