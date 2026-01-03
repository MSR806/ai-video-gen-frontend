/**
 * Ports (Repository Interfaces)
 *
 * Interfaces defining WHAT data is needed, but not HOW to get it.
 * These are implemented by Infrastructure adapters.
 *
 * Example:
 * export interface TaskRepository {
 *   getAll(): Promise<Task[]>;
 *   getById(id: string): Promise<Task | null>;
 *   create(task: Task): Promise<Task>;
 *   update(task: Task): Promise<Task>;
 *   delete(id: string): Promise<void>;
 * }
 */

export {};
