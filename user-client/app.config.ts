import { ConfigContext, ExpoConfig } from "expo/config"

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  "name": "TakTek",
  "slug": "user-client",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/images/Icon IOS 1024x1024.png",
  "scheme": "myapp",
  "userInterfaceStyle": "automatic",
  "newArchEnabled": true,
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "com.anonymous.userclient",
    "icon": "./assets/images/Icon IOS 1024x1024.png",
    "infoPlist": {
      NSLocationWhenInUseUsageDescription: "This app needs access to your location.",
      NSMicrophoneUsageDescription: "This app needs access to your microphone.",
      NSCameraUsageDescription: "This app needs access to your camera to take screenshots for your profil display."
    }
  },
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/images/Adaptive.png",
      "backgroundColor": "#fff"
    },
    "config": {
      "googleMaps": {
        "apiKey": process.env.GOOGLE_MAPS_API_KEY,
      }
    },
    "package": "com.anonymous.userclient",
  },
  "web": {
    "bundler": "metro",
    "output": "static",
    "favicon": "./assets/images/icon.png"
  },
  "plugins": [
    "expo-router",
    [
      "expo-splash-screen",
      {
        "image": "./assets/images/Icon IOS 1024x1024.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#fff"
      }
    ],
    "expo-secure-store"
  ],
  "experiments": {
    "typedRoutes": true
  },
  "extra": {
    "router": {
      "origin": false
    },
    "eas": {
      "projectId": "4036a0b9-80b8-4e81-bed2-c2cc6574358f"
    },
    "expoPublic": {
      "GOOGLE_MAPS_API_KEY": process.env.GOOGLE_MAPS_API_KEY,
      "SIGNALING_SERVER": process.env.SIGNALING_SERVER,
      "DB_SERVER": process.env.DB_SERVER,
      "USER_SERVER": process.env.USER_SERVER
    }
  },
  "owner": "samuelgeeks5g"
})
