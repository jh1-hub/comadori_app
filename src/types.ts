export interface FrameItem {
  id: number;
  order: number;
  blob: Blob;
  url: string;
  createdAt: number;
}

export interface ProjectMeta {
  frameRate: number;
  lastUpdated: number;
  title: string;
}

export type ActiveTab = 'camera' | 'edit' | 'playback' | 'export';
