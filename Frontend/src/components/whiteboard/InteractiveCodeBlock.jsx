import React, { useState } from 'react';
import { Play, Check, Terminal, Loader2, RotateCcw, Edit3, Eye, Copy } from 'lucide-react';
import { detectCodeLanguage } from '../../utils/codeLanguageDetector.js';
import { runCodeSnippet } from '../../utils/codeRunner.js';
import { InteractiveTerminal } from '../codelab/InteractiveTerminal.jsx';

/**
 * InteractiveCodeBlock Component
 * Features:
 * - Directly Editable right on the Whiteboard canvas
 * - Live Interactive Terminal integration with true standard input (stdin) support
 * - Seamless hand-off to full Code Lab
 */
export function InteractiveCodeBlock({ code: initialCode = '', language = '', onOpenInCodeLab }) {
  const [code, setCode] = useState(initialCode);
  const [isEditing, setIsEditing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalLines, setTerminalLines] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [activePrompt, setActivePrompt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [compilerName, setCompilerName] = useState(null);
  const [compilerOutput, setCompilerOutput] = useState(null);

  const detectedLang = detectCodeLanguage(code, language);

  const handleInputPrompt = (promptText) => {
    setShowTerminal(true);
    return new Promise((resolve) => {
      setActivePrompt({ promptText, resolve });
    });
  };

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

  const handleRun = async () => {
    setIsRunning(true);
    setShowTerminal(true);
    setActivePrompt(null);
    setExecutionTime(null);

    const cmdExt = detectedLang.toLowerCase() === 'python' ? 'main.py' : 'script';
    setTerminalLines([
      { type: 'command', text: `${detectedLang.toLowerCase()} ${cmdExt}` },
    ]);

    try {
      const res = await runCodeSnippet(code, detectedLang, handleInputPrompt);
      setExecutionTime(res.executionTimeMs);
      if (res.compilerName) setCompilerName(res.compilerName);
      if (res.compilerOutput) setCompilerOutput(res.compilerOutput);

      if (res.isError) {
        setTerminalLines((prev) => [
          ...prev,
          { type: 'error', text: res.output },
        ]);
      } else {
        setTerminalLines((prev) => [
          ...prev,
          { type: 'output', text: res.output },
          { type: 'system', text: `[Process exited with 0 in ${res.executionTimeMs}ms]` },
        ]);
      }
    } catch (err) {
      setTerminalLines((prev) => [
        ...prev,
        { type: 'error', text: `Error: ${err.message}` },
      ]);
    } finally {
      setIsRunning(false);
      setActivePrompt(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleKeyDownInTextarea = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const val = e.target.value;
      const updated = val.substring(0, start) + '    ' + val.substring(end);
      setCode(updated);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-stone-300 bg-[#f8f6f0] text-stone-900 font-mono text-xs md:text-sm shadow-xs font-sans">
      {/* Code Header Bar */}
      <div className="px-3.5 py-1.5 bg-[#eae5dc] border-b border-stone-300 flex items-center justify-between text-[11px] text-stone-600 font-sans">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-stone-700" />
          <span className="font-semibold text-stone-800">Code Snippet</span>
          <span className="px-2 py-0.5 rounded-full bg-stone-200/90 text-stone-700 font-bold text-[10px] uppercase tracking-wider">
            {detectedLang}
          </span>
          {isEditing && (
            <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-800 font-medium text-[10px]">
              Editing
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Toggle Edit Inline */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              isEditing
                ? 'bg-amber-600 text-white'
                : 'bg-stone-200/80 hover:bg-stone-300 text-stone-800'
            }`}
            title={isEditing ? 'View code' : 'Edit code directly on whiteboard'}
          >
            {isEditing ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            <span>{isEditing ? 'View' : 'Edit'}</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1 rounded text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Open in Code Lab */}
          {onOpenInCodeLab && (
            <button
              onClick={() => onOpenInCodeLab(code, detectedLang)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-medium text-[11px] transition-colors cursor-pointer"
              title="Open and edit this snippet in full Code Lab"
            >
              <span>Code Lab ↗</span>
            </button>
          )}

          {/* Run Code Button */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-[11px] transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Run Code in Whiteboard Terminal"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Run Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content: View Mode vs Edit Mode */}
      {isEditing ? (
        <div className="p-3 bg-[#1e1e1e] text-emerald-400">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDownInTextarea}
            rows={Math.max(4, code.split('\n').length + 1)}
            className="w-full bg-transparent text-stone-200 font-mono text-xs md:text-sm focus:outline-none resize-y leading-relaxed"
            placeholder="Type your code here..."
            spellCheck="false"
          />
        </div>
      ) : (
        <div className="p-4 overflow-x-auto leading-relaxed font-mono">
          <pre className="space-y-0.5">
            {code.split('\n').map((line, lineIdx) => (
              <div key={lineIdx} className="flex">
                <span className="w-8 select-none text-stone-400 text-right pr-3 shrink-0">
                  {lineIdx + 1}
                </span>
                <span className="text-stone-800">{line}</span>
              </div>
            ))}
          </pre>
        </div>
      )}

      {/* Interactive Terminal Panel on the Whiteboard Card */}
      {showTerminal && (
        <div className="h-44 border-t border-stone-800">
          <InteractiveTerminal
            lines={terminalLines}
            activePrompt={activePrompt}
            onInputSubmit={handleInputSubmit}
            onClear={() => {
              setTerminalLines([]);
              setShowTerminal(false);
            }}
            isRunning={isRunning}
            language={detectedLang}
            executionTimeMs={executionTime}
            compilerName={compilerName}
            compilerOutput={compilerOutput}
            files={[{ name: `main.${detectedLang.toLowerCase()}`, language: detectedLang, content: code }]}
            onRerun={handleRun}
          />
        </div>
      )}
    </div>
  );
}
