import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TakTek for technicians",
  slug: "technician-client",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/Icon IOS 1024x1024.jpg",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.samuelgeeks5g.taktektechnicians",
    icon: "./assets/images/Icon IOS 1024x1024.jpg",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "This app needs access to your location to share it with other users.",
      NSMicrophoneUsageDescription:
        "This app needs access to your microphone to communicate with other users.",
      NSCameraUsageDescription:
        "This app needs access to your camera to take screenshots for your profile display.",
      ITSAppUsesNonExemptEncryption: false,
      NSAllowsArbitraryLoads: true,
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/Adaptive.jpg",
      backgroundColor: "#1D71BF",
    },
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    package: "com.samuelgeeks5g.technicianclient",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/Icon IOS 1024x1024.jpg",
        imageWidth: 200,
        resizeMode: "cover",
        backgroundColor: "#1D71BF",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    expoPublic: {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
      SIGNALING_SERVER: process.env.SIGNALING_SERVER,
      DB_SERVER: process.env.DB_SERVER,
    },
    eas: {
      projectId: "62a8e632-c130-4a7b-8020-ab03409c552e",
    },
  },
});
