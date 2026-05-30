import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.metadatafinder.metascrub',
  appName: 'MetaScrub',
  webDir: 'dist',
  plugins: {
    Filesystem: {},
    Share: {},
    Preferences: {},
  },
  ios: {
    scheme: 'metascrub',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
