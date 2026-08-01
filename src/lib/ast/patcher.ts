/**
 * AD TERMINAL - AST Code Patching System
 * In-place code modification via AST/diff-patching
 */

export interface CodePatch {
  filePath: string;
  originalContent: string;
  patchedContent: string;
  changes: CodeChange[];
  timestamp: number;
}

export interface CodeChange {
  type: "insert" | "delete" | "replace";
  lineStart: number;
  lineEnd: number;
  originalText: string;
  newText: string;
  description: string;
}

export interface PatchRequest {
  filePath: string;
  language: "javascript" | "typescript" | "python" | "java" | "cpp" | "go" | "rust" | "html" | "css" | "json" | "yaml";
  operations: PatchOperation[];
}

export interface PatchOperation {
  type: "insert_function" | "insert_class" | "insert_import" | "modify_function" | "delete_function" | "replace_block" | "add_property" | "modify_line";
  target: string; // Function name, class name, or line number
  content: string;
  position?: "before" | "after" | "inside";
}

/**
 * Generate a unified diff between original and modified content
 */
export function generateDiff(original: string, modified: string, filePath: string = "file.txt"): string {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");
  
  let diff = `--- ${filePath}\n+++ ${filePath}\n`;
  
  // Simple line-by-line diff (LCS would be better for production)
  let i = 0, j = 0;
  let oldStart = 0, newStart = 0;
  
  while (i < originalLines.length || j < modifiedLines.length) {
    if (i < originalLines.length && j < modifiedLines.length && originalLines[i] === modifiedLines[j]) {
      i++;
      j++;
    } else {
      oldStart = i + 1;
      newStart = j + 1;
      
      let oldCount = 0;
      let newCount = 0;
      
      // Count removed lines
      while (i < originalLines.length && (j >= modifiedLines.length || originalLines[i] !== modifiedLines[j])) {
        i++;
        oldCount++;
      }
      
      // Count added lines
      while (j < modifiedLines.length && (i >= originalLines.length || originalLines[i] !== modifiedLines[j])) {
        j++;
        newCount++;
      }
      
      if (oldCount > 0 || newCount > 0) {
        diff += `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@\n`;
        
        // Output old lines
        for (let k = oldStart - 1; k < oldStart - 1 + oldCount; k++) {
          diff += `-${originalLines[k]}\n`;
        }
        
        // Output new lines
        for (let k = newStart - 1; k < newStart - 1 + newCount; k++) {
          diff += `+${modifiedLines[k]}\n`;
        }
      }
    }
  }
  
  return diff;
}

/**
 * Apply a diff to original content
 */
export function applyDiff(original: string, diff: string): string {
  const lines = original.split("\n");
  const diffLines = diff.split("\n");
  const result: string[] = [];
  
  let i = 0;
  let diffIndex = 0;
  
  while (diffIndex < diffLines.length) {
    const line = diffLines[diffIndex];
    
    if (line.startsWith("@@")) {
      // Parse hunk header
      const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
      if (match) {
        const oldStart = parseInt(match[1]) - 1;
        const oldCount = parseInt(match[2]);
        
        // Add unchanged lines before hunk
        while (i < oldStart && i < lines.length) {
          result.push(lines[i]);
          i++;
        }
        
        diffIndex++;
        
        // Process hunk
        while (diffIndex < diffLines.length && !diffLines[diffIndex].startsWith("@@")) {
          const hunkLine = diffLines[diffIndex];
          
          if (hunkLine.startsWith("-")) {
            // Skip removed line
            i++;
          } else if (hunkLine.startsWith("+")) {
            // Add new line
            result.push(hunkLine.substring(1));
          } else if (hunkLine.startsWith(" ")) {
            // Context line
            result.push(hunkLine.substring(1));
            i++;
          }
          
          diffIndex++;
        }
        
        continue;
      }
    }
    
    diffIndex++;
  }
  
  // Add remaining lines
  while (i < lines.length) {
    result.push(lines[i]);
    i++;
  }
  
  return result.join("\n");
}

/**
 * Parse JavaScript/TypeScript to find function/class boundaries
 */
export function parseJavaScriptBoundaries(code: string): Array<{type: string; name: string; startLine: number; endLine: number}> {
  const lines = code.split("\n");
  const boundaries: Array<{type: string; name: string; startLine: number; endLine: number}> = [];
  
  const patterns = [
    // Function declarations
    { regex: /^(export\s+)?(async\s+)?function\s+(\w+)/, type: "function" },
    // Arrow functions with const
    { regex: /^(export\s+)?const\s+(\w+)\s*=\s*(async\s+)?\(/, type: "arrow_function" },
    // Class declarations
    { regex: /^(export\s+)?class\s+(\w+)/, type: "class" },
    // Method definitions (simplified)
    { regex: /^\s+(async\s+)?(\w+)\s*\([^)]*\)\s*\{/, type: "method" },
    // Interface declarations
    { regex: /^(export\s+)?interface\s+(\w+)/, type: "interface" },
    // Type declarations
    { regex: /^(export\s+)?type\s+(\w+)/, type: "type" },
  ];
  
  let braceCount = 0;
  let currentBlock: {type: string; name: string; startLine: number} | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for new block start
    if (!currentBlock) {
      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          const name = match[match.length - 1];
          currentBlock = { type: pattern.type, name, startLine: i };
          break;
        }
      }
    }
    
    // Count braces
    for (const char of line) {
      if (char === "{" || char === "[" || char === "(") braceCount++;
      if (char === "}" || char === "]" || char === ")") braceCount--;
    }
    
    // Block ended
    if (currentBlock && braceCount === 0 && i > currentBlock.startLine) {
      boundaries.push({
        type: currentBlock.type,
        name: currentBlock.name,
        startLine: currentBlock.startLine,
        endLine: i,
      });
      currentBlock = null;
    }
  }
  
  return boundaries;
}

/**
 * Insert code at specific position
 */
export function insertCode(
  original: string,
  insertion: string,
  position: "start" | "end" | "after_imports" | {after: string} | {before: string}
): string {
  const lines = original.split("\n");
  
  if (position === "start") {
    return insertion + "\n" + original;
  }
  
  if (position === "end") {
    return original + "\n" + insertion;
  }
  
  if (position === "after_imports") {
    let lastImportLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^(import|require|from)\s/) || lines[i].match(/^const\s+.*\s+=\s+require\(/)) {
        lastImportLine = i + 1;
      }
    }
    lines.splice(lastImportLine, 0, insertion);
    return lines.join("\n");
  }
  
  if (typeof position === "object" && "after" in position) {
    const target = position.after;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(target)) {
        lines.splice(i + 1, 0, ...insertion.split("\n"));
        return lines.join("\n");
      }
    }
  }
  
  if (typeof position === "object" && "before" in position) {
    const target = position.before;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(target)) {
        lines.splice(i, 0, ...insertion.split("\n"));
        return lines.join("\n");
      }
    }
  }
  
  return original;
}

/**
 * Replace a function or class in code
 */
export function replaceBlock(
  original: string,
  blockName: string,
  newContent: string,
  language: string = "javascript"
): string {
  const boundaries = parseJavaScriptBoundaries(original);
  const target = boundaries.find(b => b.name === blockName);
  
  if (!target) {
    throw new Error(`[AD TERMINAL :: PATCHER] Block '${blockName}' not found`);
  }
  
  const lines = original.split("\n");
  const before = lines.slice(0, target.startLine);
  const after = lines.slice(target.endLine + 1);
  
  return [...before, newContent, ...after].join("\n");
}

/**
 * Delete a function or class from code
 */
export function deleteBlock(original: string, blockName: string): string {
  const boundaries = parseJavaScriptBoundaries(original);
  const target = boundaries.find(b => b.name === blockName);
  
  if (!target) {
    throw new Error(`[AD TERMINAL :: PATCHER] Block '${blockName}' not found`);
  }
  
  const lines = original.split("\n");
  const before = lines.slice(0, target.startLine);
  const after = lines.slice(target.endLine + 1);
  
  return [...before, ...after].join("\n");
}

/**
 * Generate a patch from a request
 */
export function generatePatch(request: PatchRequest, originalContent: string): CodePatch {
  let patchedContent = originalContent;
  const changes: CodeChange[] = [];
  
  for (const op of request.operations) {
    const originalLines = patchedContent.split("\n");
    const startLine = originalLines.length;
    
    switch (op.type) {
      case "insert_function":
      case "insert_class":
        patchedContent = insertCode(patchedContent, op.content, 
          op.position === "before" ? {before: op.target} : 
          op.position === "after" ? {after: op.target} : "end"
        );
        break;
        
      case "insert_import":
        patchedContent = insertCode(patchedContent, op.content, "after_imports");
        break;
        
      case "modify_function":
      case "replace_block":
        patchedContent = replaceBlock(patchedContent, op.target, op.content, request.language);
        break;
        
      case "delete_function":
        patchedContent = deleteBlock(patchedContent, op.target);
        break;
        
      case "add_property":
      case "modify_line":
        // Find line containing target and replace
        const lines = patchedContent.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(op.target)) {
            lines[i] = op.content;
            break;
          }
        }
        patchedContent = lines.join("\n");
        break;
    }
    
    const endLine = patchedContent.split("\n").length;
    
    changes.push({
      type: op.type.includes("delete") ? "delete" : op.type.includes("insert") ? "insert" : "replace",
      lineStart: startLine,
      lineEnd: endLine,
      originalText: originalContent,
      newText: patchedContent,
      description: `${op.type}: ${op.target}`,
    });
  }
  
  return {
    filePath: request.filePath,
    originalContent,
    patchedContent,
    changes,
    timestamp: Date.now(),
  };
}

/**
 * Validate a patch before applying
 */
export function validatePatch(patch: CodePatch): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for syntax issues (basic)
  const openBraces = (patch.patchedContent.match(/\{/g) || []).length;
  const closeBraces = (patch.patchedContent.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push(`Mismatched braces: ${openBraces} opening, ${closeBraces} closing`);
  }
  
  const openParens = (patch.patchedContent.match(/\(/g) || []).length;
  const closeParens = (patch.patchedContent.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    errors.push(`Mismatched parentheses: ${openParens} opening, ${closeParens} closing`);
  }
  
  // Check for common issues
  if (patch.patchedContent.includes("undefinedundefined")) {
    errors.push("Possible concatenation issue: 'undefinedundefined' detected");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  generateDiff,
  applyDiff,
  parseJavaScriptBoundaries,
  insertCode,
  replaceBlock,
  deleteBlock,
  generatePatch,
  validatePatch,
};
