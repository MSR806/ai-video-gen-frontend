import { CreateTaskUseCase } from '@core/application/use-cases/create-task.use-case';
import { InMemoryTaskRepository } from '@infra/repositories/in-memory-task.repository';

// Composition Root (Simplified for this example)
// In a real app, you might use a DI container or a factory
const taskRepository = new InMemoryTaskRepository();
const createTaskUseCase = new CreateTaskUseCase(taskRepository);

export default async function Home() {
  // Demonstration of core logic execution
  const task = await createTaskUseCase.execute('Learn Clean Architecture');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 font-mono">
      <h1 className="text-4xl font-bold mb-8">Clean Architecture Demo</h1>
      <div className="bg-white/5 p-8 rounded-lg border border-white/10">
        <h2 className="text-2xl mb-4">Task Created via Use Case</h2>
        <pre className="bg-black/50 p-4 rounded text-sm text-green-400">
          {JSON.stringify(task, null, 2)}
        </pre>
      </div>
    </div>
  );
}
