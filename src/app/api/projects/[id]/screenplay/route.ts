import { NextResponse } from 'next/server';
import { SyncScreenplayToScenesUseCase } from '@core/scene';
import { SceneRepositoryImpl } from '@infra/repositories';

// Instantiate dependencies
const sceneRepo = new SceneRepositoryImpl();
const syncScreenplayUseCase = new SyncScreenplayToScenesUseCase(sceneRepo);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    await syncScreenplayUseCase.execute(id, content);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing screenplay:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
