function slugify(value) {
  return value.toLowerCase().replace(/\s+/g, '-');
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-status-${slugify(status)}`}>{status}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge badge-priority-${slugify(priority)}`}>{priority}</span>;
}
