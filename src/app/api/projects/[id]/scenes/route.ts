import { NextResponse } from 'next/server';
import { SyncScenesUseCase, type SceneInput } from '@core/scene';
import { SceneRepositoryImpl } from '@infra/repositories';

const sceneRepo = new SceneRepositoryImpl();
const syncScenesUseCase = new SyncScenesUseCase(sceneRepo);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const scenes = body?.scenes;

    if (!Array.isArray(scenes)) {
      return NextResponse.json({ error: 'Missing or invalid scenes payload' }, { status: 400 });
    }

    await syncScenesUseCase.execute(id, scenes as SceneInput[]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing scenes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
