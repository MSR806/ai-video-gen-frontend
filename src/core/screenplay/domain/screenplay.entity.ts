export type ScreenplayBlockType =
  | 'slugline'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition';

export type ScreenplaySceneContent = string;

export interface ScreenplayScene {
  id: string;
  name: string;
  sceneNumber: number;
  content: ScreenplaySceneContent;
}

export interface Screenplay {
  id: string;
  projectId: string;
  title: string;
  scenes: ScreenplayScene[];
  createdAt?: string;
  updatedAt?: string;
}
