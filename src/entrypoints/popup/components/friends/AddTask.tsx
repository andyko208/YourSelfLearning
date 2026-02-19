import { useState } from 'react';

interface AddTaskProps {
  onCreateTask: (title: string) => Promise<void> | void;
}

export const AddTask: React.FC<AddTaskProps> = ({ onCreateTask }) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = taskTitle.trim();
    if (!trimmedTitle) return;

    setIsLoading(true);
    try {
      await onCreateTask(trimmedTitle);
      setTaskTitle('');
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      width: '428px',
      display: 'grid',
      gridTemplateColumns: '1fr',
      backgroundColor: '#f5f5f5',
      border: '2px solid black',
      borderRadius: '12px',
      padding: '6px',
      boxSizing: 'border-box'
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          columnGap: '8px',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          placeholder="Add a task to tackle today"
          disabled={isLoading}
          style={{
            width: '100%',
            height: '36px',
            padding: '8px 12px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: 'white',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#666'}
          onBlur={(e) => e.target.style.borderColor = '#ddd'}
        />

        <button
          type="submit"
          disabled={!taskTitle.trim() || isLoading}
          style={{
            padding: '8px 16px',
            background: (!taskTitle.trim() || isLoading)
              ? '#ccc'
              : 'linear-gradient(90deg, #D66A36 0%, #70371C 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
            cursor: (!taskTitle.trim() || isLoading) ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.41px',
            lineHeight: 1.57,
            transition: 'opacity 0.2s',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            if (!(!taskTitle.trim() || isLoading)) {
              (e.target as HTMLButtonElement).style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.opacity = '1';
          }}
        >
          {isLoading ? 'Saving...' : 'Add'}
        </button>
      </form>
    </div>
  );
};




