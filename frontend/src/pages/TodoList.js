/**
 * To-do list page - all authenticated users
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getTodos, createTodo, updateTodo, deleteTodo } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { CheckSquare, Square, Trash2, Plus, ListTodo } from 'lucide-react';

export default function TodoList({ token }) {
  const { t } = useLanguage();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTodos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await getTodos();
      setTodos(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.error || t('todo.errorLoad') || 'Failed to load todos');
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const title = (newTitle || '').trim();
    if (!title) return;
    setSubmitting(true);
    try {
      const todo = await createTodo({ title });
      setTodos((prev) => [...prev, todo]);
      setNewTitle('');
      toast.success(t('todo.added') || 'Added');
    } catch (err) {
      toast.error(err.response?.data?.error || t('todo.errorAdd') || 'Failed to add');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (todo) => {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed });
      setTodos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      toast.error(err.response?.data?.error || t('todo.errorUpdate') || 'Failed to update');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((p) => p.id !== id));
      toast.success(t('todo.deleted') || 'Deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || t('todo.errorDelete') || 'Failed to delete');
    }
  };

  const pending = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <ListTodo className="w-8 h-8 text-accent" aria-hidden />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('todo.title') || 'To-do list'}
        </h1>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={t('todo.placeholder') || 'What do you need to do?'}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
          maxLength={500}
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !newTitle.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          {t('todo.add') || 'Add'}
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading...'}</p>
      ) : (
        <div className="space-y-4">
          {pending.length === 0 && completed.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 py-8 text-center">
              {t('todo.empty') || 'No tasks yet. Add one above.'}
            </p>
          )}
          {pending.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <button
                type="button"
                onClick={() => handleToggle(todo)}
                className="p-1 rounded text-gray-500 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label={t('todo.markDone') || 'Mark done'}
              >
                <Square className="w-6 h-6" />
              </button>
              <span className="flex-1 text-gray-900 dark:text-gray-100">{todo.title}</span>
              <button
                type="button"
                onClick={() => handleDelete(todo.id)}
                className="p-1 rounded text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label={t('common.delete') || 'Delete'}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {completed.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-6 mb-2">
                {t('todo.completed') || 'Completed'}
              </h2>
              {completed.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 opacity-80"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(todo)}
                    className="p-1 rounded text-accent focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label={t('todo.markUndone') || 'Mark not done'}
                  >
                    <CheckSquare className="w-6 h-6" />
                  </button>
                  <span className="flex-1 text-gray-600 dark:text-gray-400 line-through">
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    className="p-1 rounded text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={t('common.delete') || 'Delete'}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
