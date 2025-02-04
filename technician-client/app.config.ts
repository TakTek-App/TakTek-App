import { ConfigContext, ExpoConfig } from "expo/config"

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  "name": "TakTek for technicians",
  "slug": "technician-client",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/images/Icon IOS 1024x1024.png",
  "scheme": "myapp",
  "userInterfaceStyle": "automatic",
  "newArchEnabled": true,
  "ios": {
    "supportsTablet": true,
    "icon": "./assets/images/Icon IOS 1024x1024.png",
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "This app needs access to your location.",
      "NSMicrophoneUsageDescription": "This app needs access to your microphone."
    }
  },
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/images/Adaptive.png",
      "backgroundColor": "#fff"
    },
    "config": {
      "googleMaps": {
        "apiKey": process.env.GOOGLE_MAPS_API_KEY
      }
    },
    "package": "com.samuelgeeks5g.technicianclient",
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
        "resizeMode": "cover",
        "backgroundColor": "#fff"
      }
    ]
  ],
  "experiments": {
    "typedRoutes": true
  },
  "extra": {
    "expoPublic": {
      "GOOGLE_MAPS_API_KEY": process.env.GOOGLE_MAPS_API_KEY,
      "SIGNALING_SERVER": process.env.SIGNALING_SERVER,
      "DB_SERVER": process.env.DB_SERVER
    }
  },
})