import { Audio } from '@nativescript/audio';
import { requestPermissions } from '@nativescript/core';

export async function checkAndRequestPermissions() {
  try {
    const audioPermission = await Audio.requestPermissions();
    const storagePermission = await requestPermissions(['storage']);
    
    if (!audioPermission || !storagePermission) {
      throw new Error('Required permissions not granted');
    }
    
    return true;
  } catch (error) {
    console.error('Permission request failed:', error);
    throw error;
  }
}