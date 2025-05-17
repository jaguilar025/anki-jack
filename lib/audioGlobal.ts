// lib/audioGlobal.ts
class AudioGlobal {
    private static instance: AudioGlobal;
    private currentAudio: HTMLAudioElement | null = null;
  
    private constructor() {}
  
    public static getInstance(): AudioGlobal {
      if (!AudioGlobal.instance) {
        AudioGlobal.instance = new AudioGlobal();
      }
      return AudioGlobal.instance;
    }
  
    public play(src: string | Blob): Promise<void> {
      this.stop(); // Siempre detener el audio previo
  
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        this.currentAudio = audio;
  
        if (typeof src === 'string') {
          audio.src = src;
        } else {
          audio.src = URL.createObjectURL(src);
        }
  
        audio.onended = () => {
          this.cleanup();
          resolve();
        };
  
        audio.onerror = () => {
          this.cleanup();
          reject(new Error('Error al reproducir audio'));
        };
  
        audio.play().catch(reject);
      });
    }
  
    public stop(): void {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.cleanup();
      }
    }
  
    private cleanup(): void {
      if (this.currentAudio) {
        if (this.currentAudio.src.startsWith('blob:')) {
          URL.revokeObjectURL(this.currentAudio.src);
        }
        this.currentAudio = null;
      }
    }
  }
  
  export const audioGlobal = AudioGlobal.getInstance();