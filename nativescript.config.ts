import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'com.singrdbeats',
  appPath: 'src',
  appResourcesPath: 'App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none',
    codeCache: true,
    enableScreenshots: true
  },
  ios: {
    discardUncaughtJsExceptions: true,
    enableScreenshots: true
  }
} as NativeScriptConfig;