import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { ContentNode } from '@dorkroom/logic';

import { cn } from '../../lib/cn';

interface SidebarNavigationProps {
  tree: ContentNode[];
  className?: string;
  expandedNodes?: Set<string>;
  onToggleNode?: (slug: string) => void;
}

export function SidebarNavigation({
  tree,
  className,
  expandedNodes,
  onToggleNode,
}: SidebarNavigationProps) {
  return (
    <nav
      className={cn('space-y-1', className)}
      aria-label="Infobase navigation"
    >
      {tree.map((node) => (
        <TreeNode
          key={node.slug}
          node={node}
          level={0}
          expandedNodes={expandedNodes}
          onToggleNode={onToggleNode}
        />
      ))}
    </nav>
  );
}

interface TreeNodeProps {
  node: ContentNode;
  level: number;
  expandedNodes?: Set<string>;
  onToggleNode?: (slug: string) => void;
}

function TreeNode({ node, level, expandedNodes, onToggleNode }: TreeNodeProps) {
  // Use local state if expandedNodes not provided, otherwise use external state
  const [localExpanded, setLocalExpanded] = useState(true);
  const isExpanded =
    expandedNodes !== undefined ? expandedNodes.has(node.slug) : localExpanded;

  const handleToggle = () => {
    if (onToggleNode) {
      onToggleNode(node.slug);
    } else {
      setLocalExpanded(!localExpanded);
    }
  };
  const location = useLocation();
  const normalizePath = (path: string) => path.replace(/\/index$/, '');
  const isActive =
    normalizePath(location.pathname) === normalizePath(node.path);

  // Database nodes are rendered as links (like files)
  if (node.type === 'database') {
    return (
      <Link
        to={node.path}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
          'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface)]',
          'hover:text-[color:var(--color-text-primary)]',
          isActive &&
            'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)]'
        )}
        style={{ paddingLeft: `${0.75 + level * 0.75}rem` }}
        aria-current={isActive ? 'page' : undefined}
      >
        {node.icon ? (
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-base leading-none">
            {node.icon}
          </span>
        ) : (
          <FileText className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="flex-1 truncate">{node.name}</span>
      </Link>
    );
  }

  if (node.type === 'folder') {
    return (
      <div>
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
            'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface)]',
            'hover:text-[color:var(--color-text-primary)]'
          )}
          style={{ paddingLeft: `${0.75 + level * 0.75}rem` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
          {node.icon ? (
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-base leading-none">
              {node.icon}
            </span>
          ) : (
            <Folder className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="flex-1 truncate text-left">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div className="mt-1">
            {node.children.map((child) => (
              <TreeNode
                key={child.slug}
                node={child}
                level={level + 1}
                expandedNodes={expandedNodes}
                onToggleNode={onToggleNode}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={node.path}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
        'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface)]',
        'hover:text-[color:var(--color-text-primary)]',
        isActive &&
          'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)]'
      )}
      style={{ paddingLeft: `${0.75 + level * 0.75}rem` }}
      aria-current={isActive ? 'page' : undefined}
    >
      {node.icon ? (
        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-base leading-none">
          {node.icon}
        </span>
      ) : (
        <FileText className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="flex-1 truncate">{node.name}</span>
    </Link>
  );
}
