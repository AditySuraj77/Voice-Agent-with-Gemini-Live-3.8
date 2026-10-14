import React, { useRef, useEffect, useState } from 'react';
import { Terminal as TerminalIcon, Trash2, Copy, Check, Play, Sparkles, AlertCircle, Wrench, ShieldAlert } from 'lucide-react';

/**
 * InteractiveTerminal Component
 * Full VS Code-style interactive developer terminal emulator.
 * Features:
 * - Multi-session tabs: [Terminal (I/O)] and [Compiler & Build Output]
 * - Direct inline typing with cursor for standard input (stdin) and interactive shell ($ )
 * - Interactive CLI Shell: supports 'run', 'clear', 'ls', 'cat <file>', 'help', 'echo', 'date'
 * - Clickable error line numbers: clicking an error jumps the Monaco editor cursor to that exact line!
 * - Command history with Up / Down arrows (↑ / ↓)
 * - "Explain Error with AI" one-click helper
 */
export function InteractiveTerminal({
  lines = [],
  activePrompt = null, // { promptText, resolve }
  onInputSubmit,
  onClear,
  isRunning = false,
  language = 'python',
  executionTimeMs = null,
  compilerName = null,
  compilerOutput = null,
  files = [],
  onRerun = null,
  onExplainError = null,
  onErrorLineClick = null,
}) {
  const [currentInput, setCurrentInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeTerminalTab, setActiveTerminalTab] = useState('io'); // 'io' | 'build'
  const [localLines, setLocalLines] = useState([]);

  const terminalEndRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const containerRef = useRef(null);

  // Combine parent lines with any local shell command outputs
  const allLines = [...lines, ...localLines];

  // Auto-scroll to bottom whenever lines change or prompt/input updates
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allLines, activePrompt, currentInput, activeTerminalTab]);

  // Keep terminal focused
  useEffect(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [activePrompt, isRunning]);

  const handleContainerClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = currentInput;

      // 1. If currently waiting for program stdin input
      if (activePrompt && onInputSubmit) {
        if (val.trim()) {
          setHistory((prev) => [...prev, val]);
        }
        setHistoryIndex(-1);
        setCurrentInput('');
        onInputSubmit(val);
        return;
      }

      // 2. If idle CLI shell command
      const rawCmd = val.trim();
      if (rawCmd) {
        setHistory((prev) => [...prev, rawCmd]);
      }
      setHistoryIndex(-1);
      setCurrentInput('');

      if (!rawCmd) return;

      // Log the typed command line
      const newLogs = [{ type: 'command', text: rawCmd }];

      const parts = rawCmd.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ');

      if (cmd === 'clear') {
        setLocalLines([]);
        if (onClear) onClear();
        return;
      }

      if (cmd === 'run' || cmd === './a.out' || cmd === 'python' || cmd === 'node' || cmd === 'go' || cmd === 'cargo') {
        setLocalLines([]);
        if (onRerun) onRerun();
        return;
      }

      if (cmd === 'ls') {
        const fileList = files && files.length > 0
          ? files.map((f) => `  ${f.name.padEnd(16)} ${(f.content || '').length} bytes (${f.language})`).join('\n')
          : '  main.py          140 bytes (python)';
        newLogs.push({
          type: 'output',
          text: `Workspace Files:\n${fileList}`,
        });
      } else if (cmd === 'cat') {
        if (!arg) {
          newLogs.push({ type: 'error', text: 'Usage: cat <filename>' });
        } else {
          const target = files.find((f) => f.name.toLowerCase() === arg.toLowerCase());
          if (target) {
            newLogs.push({ type: 'output', text: target.content });
          } else {
            newLogs.push({ type: 'error', text: `cat: ${arg}: No such file` });
          }
        }
      } else if (cmd === 'help') {
        newLogs.push({
          type: 'system',
          text: `Available Terminal Commands:
  run                  Compile and execute current workspace code
  clear                Clear the terminal screen
  ls                   List all workspace files
  cat <filename>       Print file content to terminal
  echo <text>          Print text to terminal
  date                 Display current date and time
  help                 Display this command help menu`,
        });
      } else if (cmd === 'date') {
        newLogs.push({ type: 'system', text: new Date().toString() });
      } else if (cmd === 'echo') {
        newLogs.push({ type: 'output', text: arg });
      } else {
        newLogs.push({
          type: 'error',
          text: `bash: ${cmd}: command not found. Type "help" for a list of available commands.`,
        });
      }

      setLocalLines((prev) => [...prev, ...newLogs]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCurrentInput(history[nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < history.length) {
          setHistoryIndex(nextIdx);
          setCurrentInput(history[nextIdx] || '');
        } else {
          setHistoryIndex(-1);
          setCurrentInput('');
        }
      }
    }
  };

  const handleCopy = () => {
    const textToCopy =
      activeTerminalTab === 'build'
        ? compilerOutput || 'No build logs recorded.'
        : allLines.map((l) => (typeof l === 'string' ? l : l.text)).join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Find latest error text if any
  const latestError = [...allLines].reverse().find((l) => (typeof l === 'object' ? l.type === 'error' : false));

  // Parses error lines to extract line number for click-to-jump
  const renderErrorLine = (text) => {
    // Matches patterns like "line 12", "main.cpp:12:5", "Main.java:15"
    const match = text.match(/(?:line\s+|:)(\d+)(?::(\d+))?/i);
    const lineNum = match ? parseInt(match[1], 10) : null;

    return (
      <div className="flex items-start gap-1.5 text-rose-400 whitespace-pre-wrap font-mono">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
        <div className="flex-1">
          <span>{text}</span>
          {lineNum && onErrorLineClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onErrorLineClick(lineNum);
              }}
              className="ml-2 px-1.5 py-0.2 rounded bg-rose-950 border border-rose-700/60 text-rose-300 hover:text-white text-[10px] font-sans inline-flex items-center gap-1 cursor-pointer transition-colors"
              title={`Jump to line ${lineNum} in editor`}
            >
              <span>Jump to Line {lineNum} →</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="flex flex-col h-full bg-[#0a0a0c] text-stone-200 font-mono text-xs select-text cursor-text relative overflow-hidden"
      data-testid="interactive-terminal"
    >
      {/* Terminal Title Bar & Session Tabs */}
      <div className="px-2.5 py-1.5 bg-[#141418] border-b border-stone-800 flex items-center justify-between text-[11px] font-sans select-none shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {/* Tab 1: Terminal I/O */}
          <button
            onClick={() => setActiveTerminalTab('io')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
              activeTerminalTab === 'io'
                ? 'bg-stone-800 text-emerald-400 font-semibold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Terminal (I/O)</span>
          </button>

          {/* Tab 2: Compiler & Build Output */}
          <button
            onClick={() => setActiveTerminalTab('build')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
              activeTerminalTab === 'build'
                ? 'bg-stone-800 text-cyan-400 font-semibold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Build Logs</span>
            {compilerName && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-stone-900 text-stone-400 font-mono">
                {compilerName}
              </span>
            )}
          </button>

          {/* Compiler Status Pill */}
          {isRunning ? (
            <span className="flex items-center gap-1 text-amber-400 text-[10px] pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Building & Executing...
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-500 text-[10px] pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ready
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Ask AI Teacher to Explain Error Button */}
          {latestError && onExplainError && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExplainError(latestError.text);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] transition-colors cursor-pointer"
              title="Ask AI Teacher to explain what went wrong and how to fix it"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Explain Error with AI</span>
            </button>
          )}

          {executionTimeMs !== null && (
            <span className="text-stone-500 text-[10px] font-mono">{executionTimeMs}ms</span>
          )}

          {onRerun && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLocalLines([]);
                onRerun();
              }}
              disabled={isRunning}
              className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-40"
              title="Rerun (Ctrl+Enter)"
            >
              <Play className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Copy Terminal Output"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLocalLines([]);
              if (onClear) onClear();
            }}
            className="p-1 rounded text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors cursor-pointer"
            title="Clear Terminal (or type 'clear')"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tab 1: Terminal I/O & Interactive Shell */}
      {activeTerminalTab === 'io' && (
        <div className="flex-1 p-3.5 overflow-y-auto leading-relaxed space-y-1">
          {allLines.length === 0 && !activePrompt && (
            <div className="text-stone-500 italic select-none">
              Interactive Terminal ready. Press "Run" (or Ctrl+Enter) to compile & execute. Type "help" for shell commands.
            </div>
          )}

          {allLines.map((line, idx) => {
            const text = typeof line === 'string' ? line : line.text;
            const type = typeof line === 'object' ? line.type : 'output';

            if (type === 'command') {
              return (
                <div key={idx} className="text-cyan-400 font-semibold flex items-center gap-1.5">
                  <span className="text-emerald-500 select-none">$</span>
                  <span>{text}</span>
                </div>
              );
            }

            if (type === 'error') {
              return <div key={idx}>{renderErrorLine(text)}</div>;
            }

            if (type === 'system') {
              return (
                <div key={idx} className="text-stone-500 italic text-[11px]">
                  {text}
                </div>
              );
            }

            if (type === 'input') {
              return (
                <div key={idx} className="text-amber-300 font-medium">
                  {text}
                </div>
              );
            }

            return (
              <div key={idx} className="text-emerald-300 whitespace-pre-wrap">
                {text}
              </div>
            );
          })}

          {/* Active Inline Stdin Prompt or CLI Shell Prompt */}
          {(activePrompt || !isRunning) && (
            <div className="flex items-baseline text-white font-mono flex-wrap pt-0.5">
              <span className="text-emerald-400 font-medium select-none pr-1">
                {activePrompt ? (activePrompt.promptText || '› ') : '$ '}
              </span>
              <span className="text-amber-300 font-semibold">{currentInput}</span>
              <span className="inline-block w-2 h-4 bg-amber-400 ml-0.5 animate-pulse align-middle" />
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>
      )}

      {/* Tab 2: Compiler & Build Output (Real GCC / OpenJDK / Rustc Logs) */}
      {activeTerminalTab === 'build' && (
        <div className="flex-1 p-3.5 overflow-y-auto leading-relaxed font-mono text-xs text-stone-300 space-y-2 bg-[#08080a]">
          <div className="text-stone-400 text-[11px] pb-1 border-b border-stone-800 flex items-center justify-between">
            <span>Compiler Engine: <strong className="text-cyan-300">{compilerName || 'Standard Toolchain'}</strong></span>
            <span>Target: x86_64-linux-gnu</span>
          </div>
          <pre className="text-stone-300 whitespace-pre-wrap leading-relaxed">
            {compilerOutput || '$ compilation check\nNo compile errors or warnings. Ready to build.'}
          </pre>
        </div>
      )}

      {/* Hidden Focus Input for Keyboard Capture */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={currentInput}
        onChange={(e) => setCurrentInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        autoFocus
      />
    </div>
  );
}
