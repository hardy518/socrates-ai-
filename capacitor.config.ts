import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.socrates.ai',
  appName: 'SocratesAI',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '230731687645-6v0uh2dpfdqb7khjtrg6urmh25k1fl6d.apps.googleusercontent.com',
      androidClientId: '230731687645-jltuslb50haai3fpk36tnc01g0ss9nm6.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
