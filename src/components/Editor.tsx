import { Editor as MonacoEditor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

// LaTeX 命令补全列表
const latexCompletions = [
  // 希腊字母
  { label: '\\alpha', insertText: '\\alpha', documentation: '希腊字母 α' },
  { label: '\\beta', insertText: '\\beta', documentation: '希腊字母 β' },
  { label: '\\gamma', insertText: '\\gamma', documentation: '希腊字母 γ' },
  { label: '\\delta', insertText: '\\delta', documentation: '希腊字母 δ' },
  { label: '\\epsilon', insertText: '\\epsilon', documentation: '希腊字母 ε' },
  { label: '\\zeta', insertText: '\\zeta', documentation: '希腊字母 ζ' },
  { label: '\\eta', insertText: '\\eta', documentation: '希腊字母 η' },
  { label: '\\theta', insertText: '\\theta', documentation: '希腊字母 θ' },
  { label: '\\iota', insertText: '\\iota', documentation: '希腊字母 ι' },
  { label: '\\kappa', insertText: '\\kappa', documentation: '希腊字母 κ' },
  { label: '\\lambda', insertText: '\\lambda', documentation: '希腊字母 λ' },
  { label: '\\mu', insertText: '\\mu', documentation: '希腊字母 μ' },
  { label: '\\nu', insertText: '\\nu', documentation: '希腊字母 ν' },
  { label: '\\xi', insertText: '\\xi', documentation: '希腊字母 ξ' },
  { label: '\\pi', insertText: '\\pi', documentation: '希腊字母 π' },
  { label: '\\rho', insertText: '\\rho', documentation: '希腊字母 ρ' },
  { label: '\\sigma', insertText: '\\sigma', documentation: '希腊字母 σ' },
  { label: '\\tau', insertText: '\\tau', documentation: '希腊字母 τ' },
  { label: '\\upsilon', insertText: '\\upsilon', documentation: '希腊字母 υ' },
  { label: '\\phi', insertText: '\\phi', documentation: '希腊字母 φ' },
  { label: '\\chi', insertText: '\\chi', documentation: '希腊字母 χ' },
  { label: '\\psi', insertText: '\\psi', documentation: '希腊字母 ψ' },
  { label: '\\omega', insertText: '\\omega', documentation: '希腊字母 ω' },
  
  // 大写希腊字母
  { label: '\\Gamma', insertText: '\\Gamma', documentation: '大写希腊字母 Γ' },
  { label: '\\Delta', insertText: '\\Delta', documentation: '大写希腊字母 Δ' },
  { label: '\\Theta', insertText: '\\Theta', documentation: '大写希腊字母 Θ' },
  { label: '\\Lambda', insertText: '\\Lambda', documentation: '大写希腊字母 Λ' },
  { label: '\\Xi', insertText: '\\Xi', documentation: '大写希腊字母 Ξ' },
  { label: '\\Pi', insertText: '\\Pi', documentation: '大写希腊字母 Π' },
  { label: '\\Sigma', insertText: '\\Sigma', documentation: '大写希腊字母 Σ' },
  { label: '\\Upsilon', insertText: '\\Upsilon', documentation: '大写希腊字母 Υ' },
  { label: '\\Phi', insertText: '\\Phi', documentation: '大写希腊字母 Φ' },
  { label: '\\Psi', insertText: '\\Psi', documentation: '大写希腊字母 Ψ' },
  { label: '\\Omega', insertText: '\\Omega', documentation: '大写希腊字母 Ω' },

  // 数学运算符
  { label: '\\frac', insertText: '\\frac{${1:分子}}{${2:分母}}', documentation: '分数', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\sqrt', insertText: '\\sqrt{${1:表达式}}', documentation: '平方根', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\sum', insertText: '\\sum_{${1:i=1}}^{${2:n}}', documentation: '求和', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\int', insertText: '\\int_{${1:a}}^{${2:b}}', documentation: '积分', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\prod', insertText: '\\prod_{${1:i=1}}^{${2:n}}', documentation: '连乘', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\lim', insertText: '\\lim_{${1:x \\to \\infty}}', documentation: '极限', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  
  // 上下标
  { label: '^', insertText: '^{${1:上标}}', documentation: '上标', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '_', insertText: '_{${1:下标}}', documentation: '下标', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },

  // 关系运算符
  { label: '\\leq', insertText: '\\leq', documentation: '小于等于 ≤' },
  { label: '\\geq', insertText: '\\geq', documentation: '大于等于 ≥' },
  { label: '\\neq', insertText: '\\neq', documentation: '不等于 ≠' },
  { label: '\\approx', insertText: '\\approx', documentation: '约等于 ≈' },
  { label: '\\equiv', insertText: '\\equiv', documentation: '恒等于 ≡' },
  { label: '\\sim', insertText: '\\sim', documentation: '相似 ∼' },
  { label: '\\propto', insertText: '\\propto', documentation: '正比于 ∝' },

  // 箭头
  { label: '\\rightarrow', insertText: '\\rightarrow', documentation: '右箭头 →' },
  { label: '\\leftarrow', insertText: '\\leftarrow', documentation: '左箭头 ←' },
  { label: '\\Rightarrow', insertText: '\\Rightarrow', documentation: '双线右箭头 ⇒' },
  { label: '\\Leftarrow', insertText: '\\Leftarrow', documentation: '双线左箭头 ⇐' },
  { label: '\\leftrightarrow', insertText: '\\leftrightarrow', documentation: '双向箭头 ↔' },
  { label: '\\Leftrightarrow', insertText: '\\Leftrightarrow', documentation: '双线双向箭头 ⇔' },

  // 特殊符号
  { label: '\\infty', insertText: '\\infty', documentation: '无穷大 ∞' },
  { label: '\\partial', insertText: '\\partial', documentation: '偏导数 ∂' },
  { label: '\\nabla', insertText: '\\nabla', documentation: '梯度算子 ∇' },
  { label: '\\pm', insertText: '\\pm', documentation: '正负号 ±' },
  { label: '\\mp', insertText: '\\mp', documentation: '负正号 ∓' },
  { label: '\\times', insertText: '\\times', documentation: '乘号 ×' },
  { label: '\\div', insertText: '\\div', documentation: '除号 ÷' },
  { label: '\\cdot', insertText: '\\cdot', documentation: '点乘 ·' },
  { label: '\\circ', insertText: '\\circ', documentation: '圆圈 ∘' },

  // 集合符号
  { label: '\\in', insertText: '\\in', documentation: '属于 ∈' },
  { label: '\\notin', insertText: '\\notin', documentation: '不属于 ∉' },
  { label: '\\subset', insertText: '\\subset', documentation: '真子集 ⊂' },
  { label: '\\subseteq', insertText: '\\subseteq', documentation: '子集 ⊆' },
  { label: '\\supset', insertText: '\\supset', documentation: '真超集 ⊃' },
  { label: '\\supseteq', insertText: '\\supseteq', documentation: '超集 ⊇' },
  { label: '\\cup', insertText: '\\cup', documentation: '并集 ∪' },
  { label: '\\cap', insertText: '\\cap', documentation: '交集 ∩' },
  { label: '\\emptyset', insertText: '\\emptyset', documentation: '空集 ∅' },
  { label: '\\mathbb{R}', insertText: '\\mathbb{R}', documentation: '实数集 ℝ' },
  { label: '\\mathbb{N}', insertText: '\\mathbb{N}', documentation: '自然数集 ℕ' },
  { label: '\\mathbb{Z}', insertText: '\\mathbb{Z}', documentation: '整数集 ℤ' },
  { label: '\\mathbb{Q}', insertText: '\\mathbb{Q}', documentation: '有理数集 ℚ' },
  { label: '\\mathbb{C}', insertText: '\\mathbb{C}', documentation: '复数集 ℂ' },

  // 逻辑符号
  { label: '\\forall', insertText: '\\forall', documentation: '对于所有 ∀' },
  { label: '\\exists', insertText: '\\exists', documentation: '存在 ∃' },
  { label: '\\neg', insertText: '\\neg', documentation: '非 ¬' },
  { label: '\\land', insertText: '\\land', documentation: '与 ∧' },
  { label: '\\lor', insertText: '\\lor', documentation: '或 ∨' },

  // 括号
  { label: '\\left(\\right)', insertText: '\\left(${1:表达式}\\right)', documentation: '自适应圆括号', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\left[\\right]', insertText: '\\left[${1:表达式}\\right]', documentation: '自适应方括号', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\left{\\right}', insertText: '\\left\\{${1:表达式}\\right\\}', documentation: '自适应花括号', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },

  // 矩阵
  { label: '\\begin{matrix}', insertText: '\\begin{matrix}\n${1:a} & ${2:b} \\\\\\\n${3:c} & ${4:d}\n\\end{matrix}', documentation: '矩阵（无括号）', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\begin{pmatrix}', insertText: '\\begin{pmatrix}\n${1:a} & ${2:b} \\\\\\\n${3:c} & ${4:d}\n\\end{pmatrix}', documentation: '圆括号矩阵', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\begin{bmatrix}', insertText: '\\begin{bmatrix}\n${1:a} & ${2:b} \\\\\\\n${3:c} & ${4:d}\n\\end{bmatrix}', documentation: '方括号矩阵', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\begin{vmatrix}', insertText: '\\begin{vmatrix}\n${1:a} & ${2:b} \\\\\\\n${3:c} & ${4:d}\n\\end{vmatrix}', documentation: '行列式', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },

  // 三角函数
  { label: '\\sin', insertText: '\\sin', documentation: '正弦' },
  { label: '\\cos', insertText: '\\cos', documentation: '余弦' },
  { label: '\\tan', insertText: '\\tan', documentation: '正切' },
  { label: '\\cot', insertText: '\\cot', documentation: '余切' },
  { label: '\\sec', insertText: '\\sec', documentation: '正割' },
  { label: '\\csc', insertText: '\\csc', documentation: '余割' },
  { label: '\\arcsin', insertText: '\\arcsin', documentation: '反正弦' },
  { label: '\\arccos', insertText: '\\arccos', documentation: '反余弦' },
  { label: '\\arctan', insertText: '\\arctan', documentation: '反正切' },

  // 对数和指数
  { label: '\\ln', insertText: '\\ln', documentation: '自然对数' },
  { label: '\\log', insertText: '\\log', documentation: '对数' },
  { label: '\\exp', insertText: '\\exp', documentation: '指数函数' },

  // 文本和格式
  { label: '\\text', insertText: '\\text{${1:文本}}', documentation: '普通文本', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\mathbf', insertText: '\\mathbf{${1:粗体}}', documentation: '粗体', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\mathit', insertText: '\\mathit{${1:斜体}}', documentation: '斜体', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\mathcal', insertText: '\\mathcal{${1:花体}}', documentation: '花体字母', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },

  // 其他常用
  { label: '\\overline', insertText: '\\overline{${1:表达式}}', documentation: '上划线', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\underline', insertText: '\\underline{${1:表达式}}', documentation: '下划线', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\hat', insertText: '\\hat{${1:变量}}', documentation: '帽子符号 ^', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\bar', insertText: '\\bar{${1:变量}}', documentation: '横线', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\vec', insertText: '\\vec{${1:向量}}', documentation: '向量箭头', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\dot', insertText: '\\dot{${1:变量}}', documentation: '点', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
  { label: '\\ddot', insertText: '\\ddot{${1:变量}}', documentation: '双点', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
];

export default function Editor({ value, onChange }: EditorProps) {
  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  const handleEditorDidMount = (_editor: monaco.editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    // 注册 LaTeX 命令补全
    monaco.languages.registerCompletionItemProvider('markdown', {
      triggerCharacters: ['\\'],
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        
        // 查找最后一个反斜杠的位置
        const lastBackslashIndex = textBeforeCursor.lastIndexOf('\\');
        
        if (lastBackslashIndex === -1) {
          return { suggestions: [] };
        }
        
        // 设置 range 从反斜杠位置开始（注意：column 是从 1 开始的）
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: lastBackslashIndex + 1,  // +1 因为 column 从 1 开始
          endColumn: position.column,
        };

        const suggestions = latexCompletions.map(completion => ({
          label: completion.label,
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: completion.documentation,
          insertText: completion.insertText,
          insertTextRules: completion.insertTextRules,
          range: range,
        }));

        return { suggestions };
      },
    });
  };

  return (
    <div className="h-full editor-container">
      <MonacoEditor
        height="100%"
        defaultLanguage="markdown"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-light"
        options={{
          fontSize: 14,
          fontFamily: "'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace",
          lineNumbers: 'on',
          minimap: { enabled: false },
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          fontLigatures: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          automaticLayout: true,
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            verticalScrollbarSize: 0,
            horizontalScrollbarSize: 0,
            handleMouseWheel: true,
            useShadows: false,
          },
        }}
      />
    </div>
  );
}
