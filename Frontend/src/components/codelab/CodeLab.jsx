import React, { useState, useEffect, useRef } from 'react';
import {
  Play, RotateCcw, Terminal, Eye, Copy, Check, Code2,
  Volume2, VolumeX, Maximize2, Minimize2, Download,
  Plus, X, Sun, Moon, Sparkles, FileCode, GripHorizontal, AlignLeft
} from 'lucide-react';
import { detectCodeLanguage } from '../../utils/codeLanguageDetector.js';
import { runCodeSnippet } from '../../utils/codeRunner.js';
import { MonacoCodeEditor } from './MonacoCodeEditor.jsx';
import { InteractiveTerminal } from './InteractiveTerminal.jsx';

const DEFAULT_WORKSPACE_TEMPLATES = {
  python: [
    {
      name: 'main.py',
      language: 'python',
      content: `# Python 3 Interactive Script
age = int(input("Enter your age: "))

if age >= 18:
    print("Awesome! You are eligible to drive! 🚗")
else:
    print("Not eligible to drive yet.")`,
    },
  ],

  javascript: [
    {
      name: 'index.js',
      language: 'javascript',
      content: `// JavaScript Interactive Script
let greeting = "Hello, Adi!";
console.log(greeting);

for (let i = 0; i < 3; i++) {
    console.log(\`Count: \${i + 1}\`);
}`,
    },
  ],

  typescript: [
    {
      name: 'main.ts',
      language: 'typescript',
      content: `// TypeScript Script
interface Student {
  name: string;
  grade: string;
}

const user: Student = { name: "Adi", grade: "10th" };
console.log(\`Student: \${user.name}, Grade: \${user.grade}\`);`,
    },
  ],

  java: [
    {
      name: 'Main.java',
      language: 'java',
      content: `// Java Application
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
        int a = 15, b = 25;
        System.out.println("Sum: " + (a + b));
    }
}`,
    },
  ],

  cpp: [
    {
      name: 'main.cpp',
      language: 'cpp',
      content: `// C++ Program
#include <iostream>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}`,
    },
  ],

  c: [
    {
      name: 'main.c',
      language: 'c',
      content: `// C Program
#include <stdio.h>

int main() {
    printf("Hello from C!\\n");
    return 0;
}`,
    },
  ],

  rust: [
    {
      name: 'main.rs',
      language: 'rust',
      content: `// Rust Binary
fn main() {
    let name = "Adi";
    println!("Hello from Rust, {}!", name);
}`,
    },
  ],

  go: [
    {
      name: 'main.go',
      language: 'go',
      content: `// Go Program
package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")
}`,
    },
  ],

  csharp: [
    {
      name: 'Program.cs',
      language: 'csharp',
      content: `// C# Application
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello from C# .NET!");
    }
}`,
    },
  ],

  html: [
    {
      name: 'index.html',
      language: 'html',
      content: `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="card">
    <h2>Interactive Web Sandbox</h2>
    <p>Live Multi-file HTML + CSS + JS rendering!</p>
    <button id="actionBtn">Click Me</button>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
    },
    {
      name: 'styles.css',
      language: 'css',
      content: `body {
  font-family: system-ui, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
  background: #0f172a;
  color: white;
}
.card {
  background: #1e293b;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}
button {
  background: #f59e0b;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  color: black;
}`,
    },
    {
      name: 'app.js',
      language: 'javascript',
      content: `document.getElementById('actionBtn')?.addEventListener('click', () => {
  alert('Button clicked in live web preview!');
});`,
    },
  ],

  php: [
    {
      name: 'index.php',
      language: 'php',
      content: `<?php
$name = "Adi";
echo "Hello from PHP, " . $name . "!\\n";`,
    },
  ],

  sql: [
    {
      name: 'query.sql',
      language: 'sql',
      content: `-- SQL Relational Query
SELECT student_id, name, score
FROM students
WHERE score >= 85
ORDER BY score DESC;`,
    },
  ],

  shell: [
    {
      name: 'script.sh',
      language: 'shell',
      content: `#!/bin/bash
echo "Current Shell: $SHELL"
echo "Running system check..."
echo "All systems operational!"`,
    },
  ],
};

export function CodeLab({
  initialCode = '',
  initialLanguage = 'python',
  onSyncWithTeacher,
  onClose,
  isTeacherMuted = false,
  onToggleTeacherMute = null,
  isMaximized = false,
  onToggleMaximize = null,
}) {
  const [language, setLanguage] = useState(initialLanguage || 'python');
  const [files, setFiles] = useState(() => {
    if (initialCode) {
      const ext = initialLanguage === 'python' ? 'py' : initialLanguage === 'javascript' ? 'js' : initialLanguage;
      return [{ name: `main.${ext}`, language: initialLanguage, content: initialCode }];
    }
    return DEFAULT_WORKSPACE_TEMPLATES[initialLanguage] || DEFAULT_WORKSPACE_TEMPLATES.python;
  });
  const [activeFileName, setActiveFileName] = useState(() => files[0]?.name || 'main.py');

  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'preview'
  const [terminalLines, setTerminalLines] = useState([
    { type: 'system', text: 'Aristotle Code Lab Terminal ready. Press "Run Code" (Ctrl+Enter) to execute.' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [executionTimeMs, setExecutionTimeMs] = useState(null);
  const [compilerName, setCompilerName] = useState('Standard Toolchain');
  const [compilerOutput, setCompilerOutput] = useState('');

  // Appearance & Editor customization
  const [theme, setTheme] = useState('vs-dark'); // 'vs-dark' | 'light'
  const [fontSize, setFontSize] = useState(13);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const isDraggingTerminalRef = useRef(false);
  const editorInstanceRef = useRef(null);

  // Interactive input prompt state
  const [activePrompt, setActivePrompt] = useState(null);

  // Active file helper
  const activeFile = files.find((f) => f.name === activeFileName) || files[0];

  // Sync when initialCode changes from whiteboard
  useEffect(() => {
    if (initialCode) {
      const detected = detectCodeLanguage(initialCode, initialLanguage).toLowerCase();
      const normLang = detected === 'c++' ? 'cpp' : detected === 'c#' ? 'csharp' : detected;
      const ext = normLang === 'python' ? 'py' : normLang === 'javascript' ? 'js' : normLang;

      setLanguage(normLang);
      const newFiles = [{ name: `main.${ext}`, language: normLang, content: initialCode }];
      setFiles(newFiles);
      setActiveFileName(newFiles[0].name);

      if (normLang === 'html' || initialCode.includes('<!DOCTYPE') || initialCode.includes('<html')) {
        setActiveTab('preview');
      } else {
        setActiveTab('terminal');
      }
    }
  }, [initialCode, initialLanguage]);

  // Update active file content
  const handleCodeChange = (newContent) => {
    setFiles((prev) =>
      prev.map((f) => (f.name === activeFileName ? { ...f, content: newContent } : f))
    );
  };

  // Language change handler
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const tmpl = DEFAULT_WORKSPACE_TEMPLATES[newLang];
    if (tmpl) {
      setFiles(tmpl);
      setActiveFileName(tmpl[0].name);
    }
    if (newLang === 'html') {
      setActiveTab('preview');
    } else {
      setActiveTab('terminal');
    }
  };

  // Add new file tab
  const handleAddFile = () => {
    const ext = language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'txt';
    const newName = `file${files.length + 1}.${ext}`;
    const newFile = { name: newName, language, content: '' };
    setFiles([...files, newFile]);
    setActiveFileName(newName);
  };

  // Close a file tab
  const handleCloseFile = (fileName, e) => {
    e.stopPropagation();
    if (files.length <= 1) return;
    const remaining = files.filter((f) => f.name !== fileName);
    setFiles(remaining);
    if (activeFileName === fileName) {
      setActiveFileName(remaining[0].name);
    }
  };

  // Format code with Monaco action
  const handleFormatCode = () => {
    if (editorInstanceRef.current) {
      const action = editorInstanceRef.current.getAction('editor.action.formatDocument');
      if (action) action.run();
    }
  };

  // Download active file to student disk
  const handleDownloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handles input prompt callback from codeRunner (True Stdin)
  const handleInputPrompt = (promptText) => {
    setActiveTab('terminal');
    return new Promise((resolve) => {
      setActivePrompt({ promptText, resolve });
    });
  };

  // Submit user input response from interactive terminal
  const handleInputSubmit = (val) => {
    if (!activePrompt) return;

    setTerminalLines((prev) => [
      ...prev,
      { type: 'input', text: `${activePrompt.promptText || '› '}${val}` },
    ]);

    const resolver = activePrompt.resolve;
    setActivePrompt(null);
    resolver(val);
  };

  // Explain error with AI Voice Teacher
  const handleExplainError = (errorText) => {
    if (onSyncWithTeacher && activeFile) {
      onSyncWithTeacher(
        `[STUDENT ASKS FOR HELP WITH ERROR in ${activeFile.name} (${language})]:\nCode:\n${activeFile.content}\nError encountered in terminal:\n${errorText}\nPlease explain in simple Socratic terms what caused this error and guide me step-by-step on how to fix it.`
      );
    }
  };

  // Run or execute code
  const handleRun = async () => {
    if (!activeFile) return;
    setIsRunning(true);
    setExecutionTimeMs(null);
    setActivePrompt(null);

    const detected = detectCodeLanguage(activeFile.content, language);

    setTerminalLines([
      { type: 'command', text: `${language} ${activeFile.name}` },
    ]);

    // If HTML or multi-file web app, render in live preview
    if (language === 'html' || activeFile.name.endsWith('.html') || (activeFile.content.includes('<') && activeFile.content.includes('>'))) {
      setActiveTab('preview');
      setIsRunning(false);
      setTerminalLines((prev) => [
        ...prev,
        { type: 'output', text: 'Live Web Sandbox rendered successfully.' },
      ]);

      if (onSyncWithTeacher) {
        onSyncWithTeacher(
          `[STUDENT CODE LAB RUN - ${detected}]:\nCode (${activeFile.name}):\n${activeFile.content}\nResult:\nInteractive UI Preview rendered successfully on student screen.`
        );
      }
      return;
    }

    try {
      setActiveTab('terminal');
      const res = await runCodeSnippet(activeFile.content, language, handleInputPrompt);
      setExecutionTimeMs(res.executionTimeMs);
      if (res.compilerName) setCompilerName(res.compilerName);
      if (res.compilerOutput) setCompilerOutput(res.compilerOutput);

      if (res.isError) {
        setTerminalLines((prev) => [
          ...prev,
          { type: 'error', text: res.output },
          { type: 'system', text: `[Process exited with status ${res.exitCode ?? 1} in ${res.executionTimeMs}ms]` },
        ]);
      } else {
        setTerminalLines((prev) => [
          ...prev,
          { type: 'output', text: res.output },
          { type: 'system', text: `[Process completed in ${res.executionTimeMs}ms (exit 0)]` },
        ]);
      }

      if (onSyncWithTeacher) {
        onSyncWithTeacher(
          `[STUDENT CODE LAB RUN - ${detected} (${activeFile.name})]:\nCode:\n${activeFile.content}\nOutput:\n${res.output}`
        );
      }
    } catch (err) {
      setTerminalLines((prev) => [
        ...prev,
        { type: 'error', text: `Runtime Error: ${err.message}` },
      ]);

      if (onSyncWithTeacher) {
        onSyncWithTeacher(
          `[STUDENT CODE LAB RUN ERROR - ${detected}]:\nCode:\n${activeFile.content}\nError:\n${err.message}`
        );
      }
    } finally {
      setIsRunning(false);
      setActivePrompt(null);
    }
  };

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Jump editor cursor to line number on error click
  const handleErrorLineClick = (lineNum) => {
    if (editorInstanceRef.current && typeof lineNum === 'number') {
      editorInstanceRef.current.revealLineInCenter(lineNum);
      editorInstanceRef.current.setPosition({ lineNumber: lineNum, column: 1 });
      editorInstanceRef.current.focus();
    }
  };

  const handleReset = () => {
    const tmpl = DEFAULT_WORKSPACE_TEMPLATES[language];
    if (tmpl) {
      setFiles(tmpl);
      setActiveFileName(tmpl[0].name);
    }
    setTerminalLines([
      { type: 'system', text: 'Workspace reset to default template.' },
    ]);
    setActivePrompt(null);
  };

  // Draggable terminal resize handler
  const handleTerminalDividerMouseDown = (e) => {
    e.preventDefault();
    isDraggingTerminalRef.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isDraggingTerminalRef.current) return;
      const windowHeight = window.innerHeight;
      const newHeight = Math.max(120, Math.min(windowHeight - 200, windowHeight - moveEvent.clientY));
      setTerminalHeight(newHeight);
    };

    const onMouseUp = () => {
      isDraggingTerminalRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Compile multi-file web app (combines HTML + CSS + JS files in files array)
  const getCompiledHtml = () => {
    const htmlFile = files.find((f) => f.name.endsWith('.html')) || activeFile;
    const cssFile = files.find((f) => f.name.endsWith('.css'));
    const jsFile = files.find((f) => f.name.endsWith('.js') && !f.name.endsWith('.html'));

    let htmlContent = htmlFile?.content || '';
    if (cssFile && cssFile.content) {
      htmlContent = htmlContent.replace('</head>', `<style>${cssFile.content}</style></head>`);
      if (!htmlContent.includes('<style>') && !htmlContent.includes('</head>')) {
        htmlContent = `<style>${cssFile.content}</style>` + htmlContent;
      }
    }
    if (jsFile && jsFile.content) {
      htmlContent = htmlContent.replace('</body>', `<script>${jsFile.content}</script></body>`);
      if (!htmlContent.includes('<script>') && !htmlContent.includes('</body>')) {
        htmlContent = htmlContent + `<script>${jsFile.content}</script>`;
      }
    }
    return htmlContent;
  };

  return (
    <div
      className={`flex flex-col h-full ${
        theme === 'vs-dark' ? 'bg-[#18181b] text-stone-200' : 'bg-[#f4f1eb] text-stone-800'
      } border-l border-stone-800 shadow-2xl font-mono text-xs md:text-sm overflow-hidden`}
      data-testid="code-lab"
    >
      {/* Top CodeLab Bar with Language Selector & Actions */}
      <div
        className={`px-3 py-1.5 ${
          theme === 'vs-dark' ? 'bg-[#212124] border-stone-700/80' : 'bg-[#e7e3da] border-stone-300'
        } border-b flex items-center justify-between font-sans shrink-0 gap-2 flex-wrap`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs md:text-sm">Code Lab</span>

          {/* Multi-Language Dropdown */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className={`border text-xs px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer font-mono font-medium ${
              theme === 'vs-dark'
                ? 'bg-stone-800 border-stone-700 text-stone-200'
                : 'bg-white border-stone-300 text-stone-800'
            }`}
          >
            <option value="python">🐍 Python</option>
            <option value="javascript">⚡ JavaScript</option>
            <option value="typescript">🔷 TypeScript</option>
            <option value="java">☕ Java</option>
            <option value="cpp">⚙️ C++</option>
            <option value="c">🔹 C</option>
            <option value="rust">🦀 Rust</option>
            <option value="go">🐹 Go</option>
            <option value="csharp">🟣 C#</option>
            <option value="html">🌐 HTML / UI</option>
            <option value="php">🐘 PHP</option>
            <option value="sql">🗄️ SQL</option>
            <option value="shell">🐚 Bash / Shell</option>
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              theme === 'vs-dark' ? 'text-stone-400 hover:text-white hover:bg-stone-800' : 'text-stone-600 hover:bg-stone-200'
            }`}
            title={`Switch to ${theme === 'vs-dark' ? 'Light Theme' : 'Dark Theme'}`}
          >
            {theme === 'vs-dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Font Size (+ / -) */}
          <div className="flex items-center bg-stone-800/40 rounded-lg p-0.5 border border-stone-700/50 text-[11px]">
            <button
              onClick={() => setFontSize(Math.max(11, fontSize - 1))}
              className="px-1.5 py-0.5 text-stone-400 hover:text-white cursor-pointer"
              title="Decrease Font Size"
            >
              A-
            </button>
            <span className="px-1 text-[10px] text-stone-400 select-none">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(20, fontSize + 1))}
              className="px-1.5 py-0.5 text-stone-400 hover:text-white cursor-pointer"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* Format Document */}
          <button
            onClick={handleFormatCode}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
            title="Format Code (Ctrl+S)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          {/* Download File */}
          <button
            onClick={handleDownloadFile}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
            title="Download Code File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Template */}
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
            title="Reset to Template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Teacher Voice Focus Mode Toggle */}
          {onToggleTeacherMute && (
            <button
              onClick={onToggleTeacherMute}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                isTeacherMuted
                  ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                  : 'bg-stone-800/80 text-stone-400 hover:text-white'
              }`}
              title={isTeacherMuted ? 'Teacher Muted (Coding Focus Mode)' : 'Mute Teacher while typing'}
            >
              {isTeacherMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              <span className="text-[10px] hidden sm:inline">
                {isTeacherMuted ? 'Muted' : 'Focus'}
              </span>
            </button>
          )}

          {/* Maximize / Fullscreen Toggle */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title={isMaximized ? 'Restore Split View' : 'Maximize Code Lab (Fullscreen)'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Run Code Button */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-all shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50"
            title="Run Code in Terminal (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run</span>
          </button>

          {/* Close Panel Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer ml-1 text-xs"
              title="Close Code Lab"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Multi-File Tab Bar (Mini StackBlitz / Replit style) */}
      <div
        className={`px-2 py-1 ${
          theme === 'vs-dark' ? 'bg-[#18181b] border-stone-800' : 'bg-[#ded9cf] border-stone-300'
        } border-b flex items-center justify-between font-sans shrink-0 overflow-x-auto`}
      >
        <div className="flex items-center gap-1">
          {files.map((file) => {
            const isActive = file.name === activeFileName;
            return (
              <div
                key={file.name}
                onClick={() => setActiveFileName(file.name)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer select-none ${
                  isActive
                    ? theme === 'vs-dark'
                      ? 'bg-[#27272a] text-amber-400 font-semibold border-b-2 border-amber-500'
                      : 'bg-white text-stone-900 font-semibold border-b-2 border-amber-600 shadow-2xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileCode className="w-3 h-3 text-stone-500" />
                <span>{file.name}</span>
                {files.length > 1 && (
                  <button
                    onClick={(e) => handleCloseFile(file.name, e)}
                    className="hover:text-rose-400 rounded p-0.2 ml-0.5"
                    title="Close file"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddFile}
            className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800/50 transition-colors cursor-pointer ml-1"
            title="New File"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-[10px] text-stone-500 pr-2 hidden sm:inline">
          Ctrl+Enter to Run • Ctrl+S to Format
        </span>
      </div>

      {/* VS Code Engine (Microsoft Monaco Editor) */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <MonacoCodeEditor
          value={activeFile?.content || ''}
          language={activeFile?.language || language}
          onChange={handleCodeChange}
          onRunCode={handleRun}
          onMount={(editor) => {
            editorInstanceRef.current = editor;
          }}
          theme={theme}
          fontSize={fontSize}
        />
      </div>

      {/* Resizable Terminal Divider Bar */}
      <div
        onMouseDown={handleTerminalDividerMouseDown}
        className="h-1.5 bg-stone-800 hover:bg-amber-500 transition-colors cursor-row-resize flex items-center justify-center shrink-0 group select-none"
        title="Drag up or down to resize Terminal"
      >
        <GripHorizontal className="w-3.5 h-3 text-stone-600 group-hover:text-white" />
      </div>

      {/* Bottom Output / Terminal Section with Resizable Height */}
      <div
        style={{ height: `${terminalHeight}px` }}
        className={`border-t border-stone-800 ${
          theme === 'vs-dark' ? 'bg-[#0a0a0c]' : 'bg-[#18181b]'
        } flex flex-col shrink-0`}
      >
        {/* Output Header Tabs */}
        <div className="px-3 py-1 bg-[#141418] border-b border-stone-800 flex items-center justify-between text-[11px] font-sans">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-stone-800 text-emerald-400 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>Interactive Terminal</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-stone-800 text-amber-400 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Live UI Preview</span>
            </button>
          </div>

          <span className="text-[10px] text-stone-500 font-mono">
            {activeFile?.name} • stdin/stdout
          </span>
        </div>

        {/* Tab 1: Authentic Interactive Terminal */}
        {activeTab === 'terminal' && (
          <div className="flex-1 min-h-0">
            <InteractiveTerminal
              lines={terminalLines}
              activePrompt={activePrompt}
              onInputSubmit={handleInputSubmit}
              onClear={() => setTerminalLines([])}
              isRunning={isRunning}
              language={language}
              executionTimeMs={executionTimeMs}
              compilerName={compilerName}
              compilerOutput={compilerOutput}
              files={files}
              onRerun={handleRun}
              onExplainError={handleExplainError}
              onErrorLineClick={handleErrorLineClick}
            />
          </div>
        )}

        {/* Tab 2: Live Web / HTML / CSS / UI Sandbox Preview */}
        {activeTab === 'preview' && (
          <div className="flex-1 bg-white overflow-hidden relative" data-testid="code-lab-preview">
            <iframe
              title="Live Sandbox Preview"
              srcDoc={getCompiledHtml()}
              sandbox="allow-scripts allow-modals"
              className="w-full h-full border-none bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
