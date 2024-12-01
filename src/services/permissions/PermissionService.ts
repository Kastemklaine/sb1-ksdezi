import { Audio } from '@nativescript/audio';
import { requestPermissions as requestNativePermissions } from '@nativescript/core';

type PermissionType = 'microphone' | 'storage';

export async function requestPermissions(permissions: PermissionType[]): Promise<boolean> {
  try {
    const permissionResults = await Promise.all(
      permissions.map(async (permission) => {
        switch (permission) {
          case 'microphone':
            return await Audio.requestPermissions();
          case 'storage':
            return await requestNativePermissions(['storage']);
          default:
            return false;
        }
      })
    );

    return permissionResults.every(result => result === true);
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}