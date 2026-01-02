import { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, Download, GripVertical, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { saveWorkspace, loadWorkspace, deserializeFiles } from './utils/storage';
import Editor from './components/Editor';
import Preview from './components/Preview';
import FileExplorer from './components/FileExplorer';
import DocumentOutline from './components/DocumentOutline';

const DEFAULT_CONTENT = `# 欢迎使用 MarkTeX

这是一个专注于数学公式渲染的 Markdown 编辑器。

## 数学公式示例

### 行内公式

爱因斯坦的质能方程：$E = mc^2$

### 块级公式

积分公式：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

矩阵表示：

$$
\\begin{bmatrix}
a & b \\\\
c & d
\\end{bmatrix}
$$

### 更多示例

二次方程求根公式：

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

欧拉公式：

$$
e^{i\\pi} + 1 = 0
$$

## Markdown 功能

### 列表

- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2

### 代码块

\`\`\`javascript
function hello() {
  console.log("Hello, MarkTeX!");
}
\`\`\`

### 引用

> 这是一段引用文本

### 表格

| 功能 | 状态 |
|------|------|
| Markdown | ✅ |
| KaTeX | ✅ |
| PDF导出 | ✅ |

开始编辑你的文档吧！
`;

// 虚拟文件系统接口
interface VirtualFile {
  id: string;
  content: string;
  blob?: string; // Blob URL for images
}

function App() {
  // 虚拟文件系统状态
  const [fileSystem, setFileSystem] = useState<Record<string, VirtualFile>>({
    'main.md': { id: 'main.md', content: DEFAULT_CONTENT }
  });
  const [files, setFiles] = useState<any[]>([
    { id: 'main.md', name: 'main.md', type: 'file', content: DEFAULT_CONTENT },
    { id: 'assets', name: 'assets', type: 'folder', children: [] },
  ]);
  const [currentFile, setCurrentFile] = useState('main.md');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [leftWidth, setLeftWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidth = 250;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarSplitHeight, setSidebarSplitHeight] = useState(50); // 侧边栏分割百分比
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // PDF 导出功能
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'MarkTeX-Document',
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          margin: 0;
          padding: 0;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
    print: async (printIframe: HTMLIFrameElement) => {
      const document = printIframe.contentDocument;
      if (document) {
        const html = document.getElementsByTagName('html')[0];
        // 移除所有页眉页脚
        html.style.margin = '0';
        html.style.padding = '0';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
      }
      printIframe.contentWindow?.print();
    },
  });

  // 分割线拖拽功能
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // 限制最小和最大宽度
      if (newLeftWidth >= 20 && newLeftWidth <= 80) {
        setLeftWidth(newLeftWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 添加和移除事件监听
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // 保存当前文件内容并切换文件
  const handleFileSelect = (fileId: string, fileContent: string) => {
    // 保存当前文件内容到文件系统
    if (currentFile) {
      setFileSystem(prev => ({
        ...prev,
        [currentFile]: { ...prev[currentFile], content }
      }));
    }
    
    // 切换到新文件
    setCurrentFile(fileId);
    setContent(fileContent);
  };

  // 更新文件系统中的文件内容
  const handleFileUpdate = (fileId: string, fileContent: string) => {
    setFileSystem(prev => ({
      ...prev,
      [fileId]: { 
        ...prev[fileId], 
        id: fileId, 
        content: fileContent,
        // 对于图片，content 即 Blob URL，将其同时写入 blob 字段
        blob: fileContent
      }
    }));
    
    if (fileId === currentFile) {
      setContent(fileContent);
    }
  };
  
  // 当编辑器内容改变时，实时更新文件系统
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setFileSystem(prev => ({
      ...prev,
      [currentFile]: { ...prev[currentFile], content: newContent }
    }));
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // 侧边栏垂直分割调整
  const handleSidebarResizeStart = useCallback(() => {
    setIsSidebarResizing(true);
  }, []);

  const handleSidebarResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isSidebarResizing || !sidebarRef.current) return;

      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newHeight = ((e.clientY - sidebarRect.top) / sidebarRect.height) * 100;

      // 限制最小和最大高度（20% - 80%）
      if (newHeight >= 20 && newHeight <= 80) {
        setSidebarSplitHeight(newHeight);
      }
    },
    [isSidebarResizing]
  );

  const handleSidebarResizeEnd = useCallback(() => {
    setIsSidebarResizing(false);
  }, []);

  // 添加和移除侧边栏调整事件监听
  useEffect(() => {
    if (isSidebarResizing) {
      window.addEventListener('mousemove', handleSidebarResizeMove);
      window.addEventListener('mouseup', handleSidebarResizeEnd);
    } else {
      window.removeEventListener('mousemove', handleSidebarResizeMove);
      window.removeEventListener('mouseup', handleSidebarResizeEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleSidebarResizeMove);
      window.removeEventListener('mouseup', handleSidebarResizeEnd);
    };
  }, [isSidebarResizing, handleSidebarResizeMove, handleSidebarResizeEnd]);

  // Hydrate workspace from IndexedDB on mount
  useEffect(() => {
    const hydrateWorkspace = async () => {
      try {
        const savedData = await loadWorkspace();
        if (savedData && savedData.files) {
          const { files: restoredFiles, fileSystem: restoredFileSystem } = 
            deserializeFiles(savedData.files);
          
          setFiles(restoredFiles);
          setFileSystem(restoredFileSystem);
          setCurrentFile(savedData.currentFile || 'main.md');
          
          // Set content from restored file system
          const restoredContent = restoredFileSystem[savedData.currentFile]?.content || DEFAULT_CONTENT;
          setContent(restoredContent);
          
          setLastSaved(new Date(savedData.timestamp));
        }
      } catch (error) {
        console.error('Failed to hydrate workspace:', error);
      } finally {
        setIsHydrated(true);
      }
    };

    hydrateWorkspace();
  }, []);

  // Auto-save with debouncing
  useEffect(() => {
    if (!isHydrated) return; // Don't save during initial hydration

    const saveTimer = setTimeout(async () => {
      try {
        setIsSaving(true);
        await saveWorkspace(files, fileSystem, currentFile);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Debounce: 1 second

    return () => clearTimeout(saveTimer);
  }, [files, fileSystem, currentFile, isHydrated]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-apple-gray-50 to-apple-gray-100">
      {/* 顶部导航栏 - 毛玻璃效果 */}
      <header className="glass-effect border-b border-apple-gray-200/50 px-6 py-4 flex items-center justify-between no-print shadow-apple z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
            title={isSidebarCollapsed ? '显示侧边栏' : '隐藏侧边栏'}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="w-5 h-5 text-apple-gray-600" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-apple-gray-600" />
            )}
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-apple-blue to-blue-500 rounded-apple flex items-center justify-center shadow-apple">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-apple-gray-900 tracking-tight">MarkTeX</h1>
            <p className="text-xs text-apple-gray-500">数学公式 Markdown 编辑器</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="btn-apple flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出 PDF
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 */}
        {!isSidebarCollapsed && (
          <div
            ref={sidebarRef}
            className="border-r border-apple-gray-200 bg-white flex flex-col no-print"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* 文件浏览器 */}
            <div 
              className="overflow-hidden"
              style={{ height: `${sidebarSplitHeight}%` }}
            >
              <FileExplorer
                currentFile={currentFile}
                onFileSelect={handleFileSelect}
                onFileUpdate={handleFileUpdate}
                files={files}
                onFilesChange={setFiles}
              />
            </div>

            {/* 垂直调整手柄 */}
            <div
              className="relative h-1 bg-apple-gray-200 cursor-row-resize hover:bg-apple-blue transition-colors duration-200 flex items-center justify-center group"
              onMouseDown={handleSidebarResizeStart}
            >
              <div className="w-12 h-1 bg-apple-gray-300 rounded-full group-hover:bg-apple-blue group-hover:h-1.5 transition-all" />
            </div>

            {/* 文档大纲 */}
            <div 
              className="overflow-hidden"
              style={{ height: `${100 - sidebarSplitHeight}%` }}
            >
              <DocumentOutline
                content={content}
              />
            </div>
          </div>
        )}

        {/* 右侧主编辑区 */}
        <div className="flex-1 flex overflow-hidden">
          <div
            ref={containerRef}
            className="flex-1 flex overflow-hidden relative"
          >
            {/* 左侧编辑器 */}
            <div
              className="overflow-hidden"
              style={{ width: `${leftWidth}%` }}
            >
              <div className="h-full p-4">
                <Editor value={content} onChange={handleContentChange} />
              </div>
            </div>

            {/* 分割线 */}
            <div
              className="resizer flex items-center justify-center no-print"
              onMouseDown={handleMouseDown}
            >
              <GripVertical className="w-4 h-4 text-apple-gray-400 pointer-events-none" />
            </div>

            {/* 右侧预览 */}
            <div
              className="overflow-auto"
              style={{ width: `${100 - leftWidth}%` }}
            >
              <div ref={printRef}>
                <Preview content={content} fileSystem={fileSystem} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部状态栏 - 毛玻璃效果 */}
      <footer className="glass-effect border-t border-apple-gray-200/50 px-6 py-2 flex items-center justify-between text-xs text-apple-gray-500 no-print">
        <div className="flex items-center gap-4">
          <span>字符数: {content.length}</span>
          <span>行数: {content.split('\n').length}</span>
        </div>
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="text-apple-blue">保存中...</span>
          ) : lastSaved ? (
            <span>已保存 {Math.floor((Date.now() - lastSaved.getTime()) / 1000)}秒前</span>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

export default App;
