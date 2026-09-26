import {
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconLock,
  IconTrash,
} from "@tabler/icons-react";
import type { CompositionNode } from "./composition";
export function Layer({
  node,
  selected,
  expanded,
  toggle,
  select,
  action,
  drop,
}: {
  node: CompositionNode;
  selected: string;
  expanded: Set<string>;
  toggle: (id: string) => void;
  select: (id: string) => void;
  action: (name: string, id: string) => void;
  drop: (source: string, target: string) => void;
}) {
  const open = expanded.has(node.id),
    hasChildren = node.children.length > 0;
  return (
    <div className="composer-layer">
      <div
        className={`composer-layer-row${selected === node.id ? " is-selected" : ""}`}
        draggable={!node.locked}
        onDragStart={(e) => e.dataTransfer.setData("text/cms-node", node.id)}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => {
          if (!node.locked) e.currentTarget.dataset.dropTarget = "true";
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            delete e.currentTarget.dataset.dropTarget;
        }}
        onDrop={(e) => {
          e.preventDefault();
          delete e.currentTarget.dataset.dropTarget;
          drop(e.dataTransfer.getData("text/cms-node"), node.id);
        }}
      >
        <button
          className="composer-layer-expand"
          aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
          aria-expanded={open}
          disabled={!hasChildren}
          onClick={() => toggle(node.id)}
        >
          {hasChildren ? (
            open ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )
          ) : (
            <span />
          )}
        </button>
        <button className="composer-layer-name" onClick={() => select(node.id)}>
          {node.locked && <IconLock size={13} />}
          <span>{node.name}</span>
          <small>{node.type}</small>
        </button>
        <button
          title={node.visible ? "Hide" : "Show"}
          onClick={() => action("visibility", node.id)}
        >
          {node.visible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
        </button>
        <button
          title="Duplicate"
          disabled={node.locked}
          onClick={() => action("duplicate", node.id)}
        >
          <IconCopy size={14} />
        </button>
        <button
          title="Delete"
          disabled={node.locked}
          onClick={() => action("delete", node.id)}
        >
          <IconTrash size={14} />
        </button>
      </div>
      {open && (
        <div className="composer-layer-children">
          {node.children.map((child) => (
            <Layer
              key={child.id}
              {...{
                node: child,
                selected,
                expanded,
                toggle,
                select,
                action,
                drop,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
