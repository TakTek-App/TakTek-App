// app/index/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import Header from '../../components/Header';
import { SocketProvider } from '@/app/context/SocketContext';

export default function IndexLayout() {
  return (
    <>
      <Header />
      <SocketProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </SocketProvider>
    </>
  );
}