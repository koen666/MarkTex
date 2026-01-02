import { useState, useRef } from 'react';
import { File, Folder, Image, ChevronRight, ChevronDown, Upload, Edit2, Trash2, Eye } from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  blob?: string;
  children?: FileNode[];
}

interface FileExplorerProps {
  currentFile: string;
  onFileSelect: (fileId: string, content: string) => void;
  onFileUpdate: (fileId: string, content: string) => void;
  files: FileNode[];
  onFilesChange: (files: FileNode[]) => void;
}

export default function FileExplorer({ currentFile, onFileSelect, onFileUpdate, files, onFilesChange }: FileExplorerProps) {
  const setFiles = (filesOrUpdater: FileNode[] | ((prev: FileNode[]) => FileNode[])) => {
    if (typeof filesOrUpdater === 'function') {
      onFilesChange(filesOrUpdater(files));
    } else {
      onFilesChange(filesOrUpdater);
    }
  };
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['assets']));
  const [dragOver, setDragOver] = useState(false);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'folder') {
      toggleFolder(file.id);
      return;
    }

    // 如果是图片，显示预览
    const isImage = file.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
    if (isImage && file.blob) {
      setImagePreview({ url: file.blob, name: file.name });
      return;
    }

    // Markdown 文件，切换到编辑器
    if (file.content !== undefined) {
      onFileSelect(file.id, file.content);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    await processFiles(selectedFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = async (droppedFiles: File[]) => {
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    const newFiles = [...files];
    const assetsFolder = newFiles.find(f => f.id === 'assets');

    if (!assetsFolder || !assetsFolder.children) return;

    for (const file of imageFiles) {
      const fileId = `assets/${file.name}`;
      const blobUrl = URL.createObjectURL(file);
      
      // 检查是否已存在
      const exists = assetsFolder.children.some(f => f.id === fileId);
      if (!exists) {
        assetsFolder.children.push({
          id: fileId,
          name: file.name,
          type: 'file',
          blob: blobUrl,
          content: blobUrl,
        });
        
        // 通知父组件更新文件系统
        onFileUpdate(fileId, blobUrl);
      }
    }

    setFiles(newFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    await processFiles(droppedFiles);
  };

  const startRename = (fileId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingFile(fileId);
    setNewFileName(fileName);
  };

  const handleRename = (fileId: string) => {
    if (!newFileName.trim() || newFileName === files.find(f => f.id === fileId)?.name) {
      setRenamingFile(null);
      return;
    }

    let renamedFileContent: string | undefined;
    let renamedFileBlob: string | undefined;

    const updateFilesRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === fileId) {
          const newId = node.id.includes('/') 
            ? node.id.substring(0, node.id.lastIndexOf('/') + 1) + newFileName
            : newFileName;

          // 保存内容与 blob 供外部同步
          renamedFileContent = node.content;
          renamedFileBlob = node.blob;

          return { ...node, name: newFileName, id: newId };
        }
        if (node.children) {
          return { ...node, children: updateFilesRecursive(node.children) };
        }
        return node;
      });
    };

    const nextFiles = updateFilesRecursive(files);
    setFiles(nextFiles);

    // 同步到上层虚拟文件系统，保持预览可用
    const newId = fileId.includes('/')
      ? fileId.substring(0, fileId.lastIndexOf('/') + 1) + newFileName
      : newFileName;
    const payload = renamedFileBlob ?? renamedFileContent ?? '';
    if (payload) {
      onFileUpdate(newId, payload);
    }

    setRenamingFile(null);
  };

  const deleteFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const deleteFromTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => node.id !== fileId).map(node => {
        if (node.children) {
          return { ...node, children: deleteFromTree(node.children) };
        }
        return node;
      });
    };

    setFiles(deleteFromTree(files));
  };

  const renderFileNode = (node: FileNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedFolders.has(node.id);
    const isActive = currentFile === node.id;
    const isRenaming = renamingFile === node.id;

    if (node.type === 'folder') {
      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-apple-gray-100 rounded-lg transition-colors group`}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
            onClick={() => toggleFolder(node.id)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-apple-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-apple-gray-500" />
            )}
            <Folder className="w-4 h-4 text-apple-blue" />
            {isRenaming ? (
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={() => handleRename(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(node.id);
                  if (e.key === 'Escape') setRenamingFile(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-1 py-0 text-sm border border-apple-blue rounded focus:outline-none"
                autoFocus
              />
            ) : (
              <>
                <span className="text-sm text-apple-gray-700 flex-1">{node.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => startRename(node.id, node.name, e)}
                    className="p-1 hover:bg-apple-gray-200 rounded"
                    title="重命名"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderFileNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isImage = node.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
    const Icon = isImage ? Image : File;

    return (
      <div
        key={node.id}
        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-lg transition-colors group ${
          isActive
            ? 'bg-apple-blue text-white'
            : 'hover:bg-apple-gray-100 text-apple-gray-700'
        }`}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
        onClick={() => handleFileClick(node)}
      >
        <Icon className="w-4 h-4" />
        {isRenaming ? (
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={() => handleRename(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename(node.id);
              if (e.key === 'Escape') setRenamingFile(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-1 py-0 text-sm border border-apple-blue rounded focus:outline-none text-apple-gray-900"
            autoFocus
          />
        ) : (
          <>
            <span className="text-sm truncate flex-1">{node.name}</span>
            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 ${isActive ? 'text-white' : ''}`}>
              {isImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileClick(node);
                  }}
                  className="p-1 hover:bg-apple-gray-200 rounded"
                  title="预览图片"
                >
                  <Eye className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={(e) => startRename(node.id, node.name, e)}
                className="p-1 hover:bg-apple-gray-200 rounded"
                title="重命名"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              {node.id !== 'main.md' && (
                <button
                  onClick={(e) => deleteFile(node.id, e)}
                  className="p-1 hover:bg-red-100 rounded"
                  title="删除"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`h-full flex flex-col bg-white border-b border-apple-gray-200 relative ${
          dragOver ? 'bg-apple-blue/5 border-apple-blue' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-apple-gray-200">
          <h3 className="text-xs font-semibold text-apple-gray-600 uppercase tracking-wide">
            文件浏览器
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleUploadClick}
              className="p-1 hover:bg-apple-gray-100 rounded transition-colors"
              title="上传图片"
            >
              <Upload className="w-3.5 h-3.5 text-apple-gray-500" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto py-2">
          {files.map(file => renderFileNode(file))}
        </div>

        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-apple-blue/10 border-2 border-dashed border-apple-blue rounded-lg pointer-events-none">
            <div className="text-center">
              <Upload className="w-8 h-8 text-apple-blue mx-auto mb-2" />
              <p className="text-sm font-medium text-apple-blue">拖放图片到这里</p>
            </div>
          </div>
        )}
      </div>

      {/* 图片预览模态框 */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setImagePreview(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-apple-gray-900">{imagePreview.name}</h3>
              <button
                onClick={() => setImagePreview(null)}
                className="p-2 hover:bg-apple-gray-100 rounded-lg transition-colors"
              >
                <span className="text-2xl leading-none text-apple-gray-600">&times;</span>
              </button>
            </div>
            <img
              src={imagePreview.url}
              alt={imagePreview.name}
              className="max-w-full max-h-[calc(90vh-8rem)] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
