type PannellumViewer = {
  destroy(): void;
  getYaw(): number;
  setYaw(yaw: number): void;
  loadScene(sceneId: string): void;
};

type PannellumConfig = Record<string, unknown>;

declare global {
  interface Window {
    pannellum?: {
      viewer(element: HTMLElement | string, config: PannellumConfig): PannellumViewer;
    };
  }
}

export {};
