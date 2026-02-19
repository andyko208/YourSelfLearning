import { supabase } from './supabase-client';
import type { TodoItem } from '../../../utils/storage';

export interface SupabaseTodo {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export class TodoService {
  private static instance: TodoService;
  private currentUserId: string | null = null;

  private constructor() {}

  static getInstance(): TodoService {
    if (!TodoService.instance) {
      TodoService.instance = new TodoService();
    }
    return TodoService.instance;
  }

  /**
   * Set the current user ID for todo operations
   */
  setUserId(userId: string) {
    this.currentUserId = userId;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Sync a completed todo to Supabase
   */
  async syncCompletedTodo(todo: TodoItem): Promise<boolean> {
    if (!supabase || !this.currentUserId) {
      console.warn('Supabase not available or user not authenticated');
      return false;
    }

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('todos')
        .upsert({
          user_id: this.currentUserId,
          title: todo.title,
          completed: true,
          completed_at: now,
          updated_at: now
        }, {
          onConflict: 'user_id,title'
        });

      if (error) {
        console.error('Error syncing completed todo to Supabase:', error);
        return false;
      }

      console.log(`Synced completed todo: ${todo.title}`);
      return true;
    } catch (error) {
      console.error('Failed to sync completed todo:', error);
      return false;
    }
  }

  /**
   * Get all todos for the current user from Supabase
   */
  async getTodosFromSupabase(): Promise<TodoItem[]> {
    if (!supabase || !this.currentUserId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching todos from Supabase:', error);
        return [];
      }

      return data.map((todo: SupabaseTodo) => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        createdAt: new Date(todo.created_at).getTime()
      }));
    } catch (error) {
      console.error('Failed to fetch todos from Supabase:', error);
      return [];
    }
  }

  /**
   * Check if a todo should be shown in interventions (not completed)
   */
  async getUncompletedTodos(): Promise<TodoItem[]> {
    if (!supabase || !this.currentUserId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(3); // Only get the first 3 for the overlay

      if (error) {
        console.error('Error fetching uncompleted todos from Supabase:', error);
        return [];
      }

      return data.map((todo: SupabaseTodo) => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        createdAt: new Date(todo.created_at).getTime()
      }));
    } catch (error) {
      console.error('Failed to fetch uncompleted todos from Supabase:', error);
      return [];
    }
  }

  /**
   * Mark a todo as completed in Supabase
   */
  async markTodoCompleted(todoId: string): Promise<boolean> {
    if (!supabase || !this.currentUserId) {
      return false;
    }

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('todos')
        .update({
          completed: true,
          completed_at: now,
          updated_at: now
        })
        .eq('id', todoId)
        .eq('user_id', this.currentUserId);

      if (error) {
        console.error('Error marking todo as completed in Supabase:', error);
        return false;
      }

      console.log(`Marked todo as completed: ${todoId}`);
      return true;
    } catch (error) {
      console.error('Failed to mark todo as completed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const todoService = TodoService.getInstance();


