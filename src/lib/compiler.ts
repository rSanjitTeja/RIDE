export interface ExecutionResult {
  stdout: string;
  stderr: string;
  output: string;
  code: number;
  language: string;
}

// --- JavaScript / TypeScript Executor ---
// Runs JS natively in the browser by hijacking console.log
function runJavaScript(code: string): ExecutionResult {
  const logs: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  // Override console methods to capture output
  console.log = (...args: any[]) => logs.push(args.map(String).join(' '));
  console.error = (...args: any[]) => errors.push(args.map(String).join(' '));
  console.warn = (...args: any[]) => logs.push('[warn] ' + args.map(String).join(' '));
  console.info = (...args: any[]) => logs.push('[info] ' + args.map(String).join(' '));

  let exitCode = 0;
  try {
    // Use Function constructor for slightly safer eval scope
    const fn = new Function(code);
    const result = fn();
    // If the code returns a value (last expression), show it
    if (result !== undefined) {
      logs.push(String(result));
    }
  } catch (e: any) {
    errors.push(e.toString());
    exitCode = 1;
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.info = originalInfo;
  }

  const stdout = logs.join('\n');
  const stderr = errors.join('\n');
  return {
    stdout,
    stderr,
    output: stderr ? stderr + (stdout ? '\n' + stdout : '') : stdout,
    code: exitCode,
    language: 'javascript',
  };
}

// --- Python Executor via Pyodide (WebAssembly) ---
declare global {
  interface Window {
    loadPyodide: (config?: any) => Promise<any>;
    _pyodideInstance: any;
  }
}

let pyodideLoading: Promise<any> | null = null;

async function getPyodide() {
  if (window._pyodideInstance) return window._pyodideInstance;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    // Dynamically inject the Pyodide script if not already present
    if (!document.getElementById('pyodide-script')) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'pyodide-script';
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide runtime'));
        document.head.appendChild(script);
      });
    }

    // Wait for loadPyodide to be available
    let retries = 0;
    while (typeof window.loadPyodide === 'undefined' && retries < 20) {
      await new Promise(r => setTimeout(r, 300));
      retries++;
    }
    if (typeof window.loadPyodide === 'undefined') {
      throw new Error('Pyodide failed to initialize.');
    }

    window._pyodideInstance = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
    });
    return window._pyodideInstance;
  })();

  return pyodideLoading;
}

async function runPython(code: string): Promise<ExecutionResult> {
  const pyodide = await getPyodide();

  let stdout = '';
  let stderr = '';

  // Redirect stdout/stderr from Python to our JS strings
  pyodide.setStdout({ batched: (msg: string) => { stdout += msg + '\n'; } });
  pyodide.setStderr({ batched: (msg: string) => { stderr += msg + '\n'; } });

  let exitCode = 0;
  try {
    await pyodide.runPythonAsync(code);
  } catch (e: any) {
    stderr += e.message || String(e);
    exitCode = 1;
  }

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    output: stderr.trim() ? stderr.trim() + (stdout.trim() ? '\n' + stdout.trim() : '') : stdout.trim(),
    code: exitCode,
    language: 'python',
  };
}

// --- Main Entry Point ---
export async function executeCode(language: string, content: string): Promise<ExecutionResult> {
  const lang = language.toLowerCase();

  switch (lang) {
    case 'javascript':
    case 'typescript': // Run TS as JS (type annotations are stripped at runtime in most simple cases)
      return runJavaScript(content);

    case 'python':
      return runPython(content);

    default:
      return {
        stdout: '',
        stderr: '',
        output: `⚠️ Language "${language}" is not yet supported for in-browser execution.\n\nCurrently supported: JavaScript, TypeScript, Python.`,
        code: 1,
        language,
      };
  }
}
