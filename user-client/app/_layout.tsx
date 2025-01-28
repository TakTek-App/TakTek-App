import React, { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "./context/AuthContext";
import { CoordsProvider } from "./context/CoordsContext";
import { TechnicianProvider } from "./context/TechnicianContext";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  return (
    <AuthProvider>
      <CoordsProvider>
        <TechnicianProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </TechnicianProvider>
      </CoordsProvider>
    </AuthProvider>
  );
}