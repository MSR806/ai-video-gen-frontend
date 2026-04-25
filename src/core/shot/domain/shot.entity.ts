export interface Shot {
  id: string;
  sceneId: string;
  orderIndex: number;
  title: string;
  description: string;
  cameraFraming: string;
  cameraMovement: string;
  mood: string;
  createdAt?: string;
  updatedAt?: string;
}
