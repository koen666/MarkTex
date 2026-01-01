import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import 'katex/dist/katex.min.css';

interface VirtualFile {
  id: string;
  content: string;
  blob?: string;
}

interface PreviewProps {
  content: string;
  fileSystem?: Record<string, VirtualFile>;
}

export default function Preview({ content, fileSystem }: PreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Zoom state (panning uses native scroll)
  const [scale, setScale] = useState(1);

  // Constants
  const ZOOM_SENSITIVITY = 0.001; // precise, slower feel
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3.0;

  // Zoom (wheel) with cursor-focus
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // zoom to cursor
        e.preventDefault();
        e.stopPropagation();

        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        setScale(prev => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta)));
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, []);

  // 解析图片路径
  const resolveImagePath = useCallback((src: string) => {
    if (!src) return src;
    
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
      return src;
    }

    if (fileSystem) {
      let normalizedSrc = src.replace(/^\.\//g, '').replace(/^\//, '');
      
      try {
        normalizedSrc = decodeURIComponent(normalizedSrc);
      } catch (e) {}
      
      if (fileSystem[normalizedSrc]?.blob) {
        return fileSystem[normalizedSrc].blob;
      }
      
      const fileName = normalizedSrc.split('/').pop();
      if (fileName) {
        const assetPath = `assets/${fileName}`;
        if (fileSystem[assetPath]?.blob) {
          return fileSystem[assetPath].blob;
        }
        
        for (const key of Object.keys(fileSystem)) {
          const fileSystemFileName = key.split('/').pop();
          if (fileSystemFileName === fileName && fileSystem[key]?.blob) {
            return fileSystem[key].blob;
          }
        }
        
        const lowerFileName = fileName.toLowerCase();
        for (const key of Object.keys(fileSystem)) {
          const fileSystemFileName = key.split('/').pop()?.toLowerCase();
          if (fileSystemFileName === lowerFileName && fileSystem[key]?.blob) {
            return fileSystem[key].blob;
          }
        }
      }
    }

    return src;
  }, [fileSystem]);

  // 自定义图片组件
  const ImageComponent = useMemo(() => {
    return ({ src, alt, ...props }: any) => {
      const resolvedSrc = resolveImagePath(src);
      const [loadError, setLoadError] = useState(false);
      
      if (loadError) {
        return (
          <div 
            className="inline-flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-dashed border-red-300 rounded-lg text-red-600 text-sm"
            title={`原始路径: ${src}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>图片未找到: {alt || src}</span>
          </div>
        );
      }
      
      return (
        <img 
          src={resolvedSrc} 
          alt={alt} 
          {...props}
          onError={() => setLoadError(true)}
        />
      );
    };
  }, [resolveImagePath]);

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-auto"
      style={{ background: '#525659' }}
    >
      {/* Layer: Transformable content */}
      <div className="flex justify-center items-start px-8 py-8">
        <div
          style={{
            width: `calc(19cm * ${scale})`,
            minHeight: `calc(27cm * ${scale})`
          }}
        >
          <div
            ref={previewRef}
            className="preview-paper markdown-body"
            id="print-content"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              transition: 'transform 0.12s ease-out'
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex, rehypeSlug]}
              components={{
                img: ImageComponent,
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
      </div>
    </div>
  );
}
