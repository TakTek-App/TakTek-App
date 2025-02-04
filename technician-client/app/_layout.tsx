import React, { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "./context/AuthContext";
import { CoordsProvider } from "./context/CoordsContext";
import { ClientProvider } from "./context/ClientContext";
// import { startBackgroundLocationTracking } from './utils/backgroundLocation';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  // useEffect(() => {
  //   startBackgroundLocationTracking();
  // }, []);

  if (!isReady) return null;

  return (
    <AuthProvider>
      <CoordsProvider>
        <ClientProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ClientProvider>
      </CoordsProvider>
    </AuthProvider>
  );
}