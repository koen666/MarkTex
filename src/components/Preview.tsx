import { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface PreviewProps {
  content: string;
}

export default function Preview({ content }: PreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-full px-8 py-4 bg-apple-gray-100">
      <div 
        ref={previewRef}
        className="preview-paper markdown-body"
        id="print-content"
      >
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            // 自定义代码块渲染
            code({ inline, className, children, ...props }: any) {
              return inline ? (
                <code className={className} {...props}>
                  {children}
                </code>
              ) : (
                <pre className={className}>
                  <code {...props}>{children}</code>
                </pre>
              );
            },
            // 优化表格渲染
            table({ children }) {
              return (
                <div className="overflow-x-auto">
                  <table>{children}</table>
                </div>
              );
            },
          }}
        >
          {content || '# 欢迎使用 MarkTeX\n\n在左侧编辑器中输入 Markdown 和 LaTeX 公式，右侧将实时预览。\n\n## 数学公式示例\n\n行内公式：$E = mc^2$\n\n块级公式：\n\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n$$\n\n## 支持的功能\n\n- ✨ 实时 Markdown 预览\n- 📐 KaTeX 数学公式渲染\n- 📄 PDF 导出\n- 🎨 Apple 风格设计\n\n开始创作你的文档吧！'}
        </ReactMarkdown>
      </div>
    </div>
  );
}
