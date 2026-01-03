/**
 * Use Cases
 *
 * Business logic that orchestrates domain entities and ports.
 * Each use case represents a specific user action.
 *
 * Example:
 * export class CreateTaskUseCase {
 *   constructor(private taskRepository: TaskRepository) {}
 *
 *   async execute(title: string): Promise<Task> {
 *     const task = { id: generateId(), title, completed: false, createdAt: new Date() };
 *     return this.taskRepository.create(task);
 *   }
 * }
 */

export {};
