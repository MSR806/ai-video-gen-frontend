export interface Shot {
  id: string;
  sceneId: string;
  collectionId?: string | null;
  orderIndex: number;
  title: string;
  description: string;
  cameraFraming: string;
  cameraMovement: string;
  mood: string;
  createdAt?: string;
  updatedAt?: string;
}
