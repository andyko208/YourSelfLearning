import type { CSSProperties } from 'react';
import type { TodoItem } from '../../../../utils/storage';

type SortMetric = 'createdAt' | 'title' | 'completed';

interface TaskListProps {
  tasks: TodoItem[];
  sortBy: SortMetric;
  sortOrder: 'asc' | 'desc';
  onSort: (metric: SortMetric) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const CARD_HEIGHT = 208;
const PANEL_WIDTH = 428;

const containerStyles: CSSProperties = {
  width: `${PANEL_WIDTH}px`,
  maxWidth: `${PANEL_WIDTH}px`,
  height: `${CARD_HEIGHT}px`,
  backgroundColor: '#f5f5f5',
  border: '2px solid black',
  borderRadius: '16px',
  padding: '16px',
  boxSizing: 'border-box',
  display: 'grid',
  gridTemplateRows: 'minmax(0, 1fr)',
  gap: '12px',
  overflow: 'hidden'
};

const listStyles: CSSProperties = {
  minHeight: 0,
  overflowY: 'auto',
  display: 'grid',
  rowGap: '8px',
  paddingRight: '6px'
};

const rowStyles: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '20px minmax(0, 1fr) auto auto',
  alignItems: 'center',
  columnGap: '12px',
  padding: '12px 14px',
  backgroundColor: 'rgba(255,255,255,0.9)',
  borderRadius: '12px',
  border: '1px solid rgba(0,0,0,0.06)',
  boxSizing: 'border-box'
};

const taskToggleStyles: CSSProperties = {
  width: '20px',
  height: '20px',
  borderRadius: '6px',
  border: '1px solid #9ca3af',
  display: 'grid',
  placeItems: 'center',
  backgroundColor: '#fff',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease, border-color 0.2s ease',
  padding: 0,
  lineHeight: 1,
  fontSize: '12px',
  overflow: 'hidden',
  outline: 'none'
};

const taskTitleStyles: CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#1f2933',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const createdTextStyles: CSSProperties = {
  fontSize: '12px',
  color: '#4b5563',
  fontWeight: 500,
  whiteSpace: 'nowrap'
};

const actionCellStyles: CSSProperties = {
  display: 'grid',
  justifyContent: 'end',
  alignItems: 'center'
};

const deleteButtonStyles: CSSProperties = {
  border: 'none',
  backgroundColor: 'transparent',
  color: '#b91c1c',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
};

const emptyStateStyles: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  fontSize: '13px',
  color: '#6b7280',
  fontStyle: 'italic',
  padding: '0 24px'
};

const formatCreated = (timestamp: number): string => {
  const createdDate = new Date(timestamp);
  const now = new Date();
  const sameDay = createdDate.toDateString() === now.toDateString();

  if (sameDay) {
    return createdDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (createdDate.toDateString() === yesterday.toDateString()) {
    return `Yesterday · ${createdDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  return createdDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    `${createdDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
};

export const FriendList: React.FC<TaskListProps> = ({
  tasks,
  sortBy: _sortBy,
  sortOrder: _sortOrder,
  onSort: _onSort,
  onToggle,
  onRemove
}) => {
  if (tasks.length === 0) {
    return (
      <div style={containerStyles}>
        <div style={emptyStateStyles}>
          Create your first task above to plan today’s focus.
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      <div style={listStyles}>
        {tasks.map((task) => (
          <div key={task.id} style={rowStyles}>
            <button
              type="button"
              onClick={() => onToggle(task.id)}
              aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
              style={{
                ...taskToggleStyles,
                backgroundColor: task.completed ? '#1f2933' : '#fff',
                borderColor: task.completed ? '#1f2933' : '#9ca3af',
                color: task.completed ? '#f9fafb' : 'transparent'
              }}
            >
              ✓
            </button>

            <span
              style={{
                ...taskTitleStyles,
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? '#6b7280' : '#1f2933'
              }}
              title={task.title}
            >
              {task.title}
            </span>

            <span style={createdTextStyles}>
              {formatCreated(task.createdAt)}
            </span>

            <div style={actionCellStyles}>
              <button
                type="button"
                onClick={() => onRemove(task.id)}
                style={deleteButtonStyles}
              >
                X
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
