import { useEffect, useMemo, useState } from 'react';
import { AddTask } from '../components/friends/AddTask';
import { FriendList } from '../components/friends/FriendList';
import { StorageUtils } from '../../content/storage-utils';
import { browser } from '../../../utils/browser-api';
import type { TodoItem } from '../../../utils/storage';

type SortMetric = 'createdAt' | 'title' | 'completed';

export const TodoPage: React.FC = () => {
  const [tasks, setTasks] = useState<TodoItem[]>([]);
  const [sortBy, setSortBy] = useState<SortMetric>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const load = async () => {
      const next = await StorageUtils.getTodos();
      setTasks(next);
    };

    load();
  }, []);

  useEffect(() => {
    const handleStorageChange = async (changes: Record<string, unknown>, areaName: string) => {
      if (areaName !== 'local') return;
      if (changes['xscroll-data']) {
        const next = await StorageUtils.getTodos();
        setTasks(next);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleCreateTask = async (title: string) => {
    try {
      const next = await StorageUtils.addTodo(title);
      setTasks(next);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleToggleTask = async (id: string) => {
    try {
      const next = await StorageUtils.toggleTodo(id);
      setTasks(next);
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleRemoveTask = async (id: string) => {
    try {
      const next = await StorageUtils.removeTodo(id);
      setTasks(next);
    } catch (error) {
      console.error('Failed to remove task:', error);
    }
  };

  const handleSort = (metric: SortMetric) => {
    if (sortBy === metric) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(metric);
      setSortOrder(metric === 'title' ? 'asc' : metric === 'completed' ? 'asc' : 'desc');
    }
  };

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
          break;
        case 'completed':
          comparison = Number(a.completed) - Number(b.completed);
          break;
        case 'createdAt':
        default:
          comparison = a.createdAt - b.createdAt;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return copy;
  }, [tasks, sortBy, sortOrder]);

  return (
    <div style={{
      display: 'grid',
      justifyItems: 'center',
      width: '428px',
      margin: '0 auto',
      minHeight: '100%',
      rowGap: '12px'
    }}>
      <div style={{ width: '428px', display: 'grid', justifyItems: 'center', boxSizing: 'border-box' }}>
        <AddTask onCreateTask={handleCreateTask} />
      </div>

      <div style={{ width: '428px', display: 'grid', justifyItems: 'center', boxSizing: 'border-box' }}>
        <FriendList
          tasks={sortedTasks}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onToggle={handleToggleTask}
          onRemove={handleRemoveTask}
        />
      </div>
    </div>
  );
};




