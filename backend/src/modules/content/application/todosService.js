import { Todo } from '../infrastructure/models.js';

export async function getTodos(userId) {
  return Todo.findAll({
    where: { userId },
    order: [
      ['completed', 'ASC'],
      ['order', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    attributes: ['id', 'title', 'completed', 'order', 'createdAt', 'updatedAt'],
  });
}

export async function createTodo(userId, { title, order }) {
  return Todo.create({
    userId,
    title: String(title).trim(),
    order: order ?? 0,
  });
}

export async function updateTodo(userId, todoId, { title, completed, order }) {
  const todo = await Todo.findOne({
    where: { id: todoId, userId },
  });
  if (!todo) return null;
  if (title !== undefined) todo.title = String(title).trim();
  if (completed !== undefined) todo.completed = Boolean(completed);
  if (order !== undefined) todo.order = Number(order);
  await todo.save();
  return todo;
}

export async function deleteTodo(userId, todoId) {
  return Todo.destroy({
    where: { id: todoId, userId },
  });
}

