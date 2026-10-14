import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

/**
 * MonacoCodeEditor - Industry-standard VS Code Editor powered by Microsoft Monaco
 * Features:
 * - Real VS Code syntax highlighting, themes, and IntelliSense
 * - Keyboard shortcuts: Ctrl+Enter / Cmd+Enter to Run, Ctrl+S / Cmd+S to Format & Save
 * - Configurable Font Size and Theme (vs-dark / light)
 * - Auto-closing brackets, quotes, and HTML tags
 * - Multi-language support: Python, JavaScript, TypeScript, HTML, CSS, Rust, C, C++, Java, etc.
 */
export function MonacoCodeEditor({
  value = '',
  language = 'python',
  onChange,
  onRunCode,
  onMount: parentOnMount,
  theme = 'vs-dark',
  fontSize = 13,
  readOnly = false,
}) {
  const editorRef = useRef(null);

  // Normalize language for Monaco Editor
  const getMonacoLanguage = (lang) => {
    const l = (lang || '').toLowerCase().trim();
    if (l === 'js' || l === 'javascript') return 'javascript';
    if (l === 'ts' || l === 'typescript') return 'typescript';
    if (l === 'py' || l === 'python') return 'python';
    if (l === 'c') return 'c';
    if (l === 'c++' || l === 'cpp') return 'cpp';
    if (l === 'java') return 'java';
    if (l === 'c#' || l === 'csharp' || l === 'cs') return 'csharp';
    if (l === 'rust' || l === 'rs') return 'rust';
    if (l === 'go' || l === 'golang') return 'go';
    if (l === 'php') return 'php';
    if (l === 'sql') return 'sql';
    if (l === 'bash' || l === 'sh' || l === 'shell') return 'shell';
    if (l === 'html' || l === 'htm') return 'html';
    if (l === 'css') return 'css';
    if (l === 'json') return 'json';
    if (l === 'markdown' || l === 'md') return 'markdown';
    return 'plaintext';
  };

  const monacoLanguage = getMonacoLanguage(language);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Keyboard Shortcut 1: Ctrl+Enter / Cmd+Enter to Run Code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRunCode) {
        onRunCode();
      }
    });

    // Keyboard Shortcut 2: Ctrl+S / Cmd+S to Format Code without browser save prompt
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const formatAction = editor.getAction('editor.action.formatDocument');
      if (formatAction) {
        formatAction.run();
      }
    });

    if (parentOnMount) {
      parentOnMount(editor, monaco);
    }
  };

  return (
    <div className="w-full h-full bg-[#1e1e1e] overflow-hidden" data-testid="monaco-code-editor">
      <Editor
        height="100%"
        language={monacoLanguage}
        value={value}
        theme={theme}
        onChange={(val) => onChange && onChange(val || '')}
        onMount={handleEditorDidMount}
        options={{
          selectOnLineNumbers: true,
          readOnly,
          fontSize,
          lineHeight: Math.round(fontSize * 1.55),
          tabSize: 4,
          insertSpaces: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          formatOnType: true,
          formatOnPaste: true,
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true },
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full text-stone-400 gap-2 font-sans text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>Loading VS Code Engine...</span>
          </div>
        }
      />
    </div>
  );
}
