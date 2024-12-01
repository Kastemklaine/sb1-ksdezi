import { BackgroundHttp } from '@nativescript/background-http';
import { File } from '@nativescript/core';

export class UploadService {
  private session: BackgroundHttp.Session;

  constructor() {
    this.session = BackgroundHttp.session('recording-upload');
  }

  async uploadRecording(filePath: string, url: string): Promise<boolean> {
    try {
      const request = {
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'audio/m4a'
        }
      };

      const params = [{
        name: 'recording',
        filename: filePath,
        mimeType: 'audio/m4a'
      }];

      const task = this.session.multipartUpload(params, request);

      return new Promise((resolve, reject) => {
        task.on('complete', () => resolve(true));
        task.on('error', (error) => {
          console.error('Upload failed:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to start upload:', error);
      return false;
    }
  }
}