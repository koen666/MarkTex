import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface HeadingNode {
  id: string;
  text: string;
  level: number;
  children: HeadingNode[];
  lineNumber: number;
}

interface DocumentOutlineProps {
  content: string;
}

export default function DocumentOutline({ content }: DocumentOutlineProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 解析 Markdown 标题，使用 rehype-slug 的 ID 生成规则
  const headings = useMemo(() => {
    const lines = content.split('\n');
    const headingList: HeadingNode[] = [];
    const stack: HeadingNode[] = [];
    const slugCounts: Record<string, number> = {};

    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        // 移除 # 语法，只保留文本内容
        const text = match[2].trim();
        
        // 生成 slug ID（与 rehype-slug 生成规则一致）
        let slug = text
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // 保留中文、字母、数字、空格和连字符
          .replace(/\s+/g, '-') // 空格转连字符
          .replace(/-+/g, '-') // 多个连字符合并
          .replace(/^-|-$/g, ''); // 移除首尾连字符

        // 处理重复 ID
        if (slugCounts[slug]) {
          slugCounts[slug]++;
          slug = `${slug}-${slugCounts[slug]}`;
        } else {
          slugCounts[slug] = 1;
        }

        const node: HeadingNode = {
          id: slug,
          text, // 纯文本，不包含 #
          level,
          children: [],
          lineNumber: index,
        };

        // 构建树状结构
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }

        if (stack.length === 0) {
          headingList.push(node);
        } else {
          stack[stack.length - 1].children.push(node);
        }

        stack.push(node);
      }
    });

    return headingList;
  }, [content]);

  // 默认展开所有节点
  useEffect(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: HeadingNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(headings);
    setExpandedNodes(allIds);
  }, [headings]);

  const toggleNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleHeadingClick = (headingId: string) => {
    // 在预览区查找对应的标题元素并滚动
    const previewElement = document.getElementById('print-content');
    if (previewElement) {
      const headingElement = previewElement.querySelector(`#${headingId}`);
      if (headingElement) {
        headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // 添加高亮效果
        headingElement.classList.add('outline-highlight');
        setTimeout(() => {
          headingElement.classList.remove('outline-highlight');
        }, 2000);
      }
    }
  };

  const renderHeading = (node: HeadingNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-apple-gray-100 rounded-lg transition-colors group"
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => handleHeadingClick(node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => toggleNode(node.id, e)}
              className="flex-shrink-0 hover:bg-apple-gray-200 rounded p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-apple-gray-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-apple-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          
          <span
            className={`text-sm truncate transition-colors ${
              node.level === 1
                ? 'font-bold text-apple-gray-900'
                : node.level === 2
                ? 'font-semibold text-apple-gray-800'
                : 'font-normal text-apple-gray-600'
            }`}
            title={node.text}
          >
            {node.text}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderHeading(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-apple-gray-200">
        <h3 className="text-xs font-semibold text-apple-gray-600 uppercase tracking-wide">
          文档大纲
        </h3>
        <span className="text-xs text-apple-gray-400">
          {headings.length} 项
        </span>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {headings.length > 0 ? (
          headings.map(heading => renderHeading(heading))
        ) : (
          <div className="flex items-center justify-center h-full text-apple-gray-400 text-sm">
            暂无标题
          </div>
        )}
      </div>
    </div>
  );
}
