declare module 'gifshot' {
  export interface CreateGIFOptions {
    images?: string[];
    gifWidth?: number;
    gifHeight?: number;
    interval?: number;
    numFrames?: number;
    frameDuration?: number;
    keepCameraOn?: boolean;
    cameraStream?: any;
  }

  export function createGIF(
    options: CreateGIFOptions,
    callback: (obj: { error: boolean; errorCode: string; errorMsg: string; image: string }) => void
  ): void;
}
