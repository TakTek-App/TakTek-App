import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

interface Coords {
  latitude: number;
  longitude: number;
}

interface Client {
  id: number;
  role: string;
  firstName: string;
  lastName: string;
  socketId: string;
  photo: string;
  address: string;
  location: Coords | null;
  serviceName: string;
}

interface ClientContextType {
  client: Client | null;
  setClient: (client: Client | null) => Promise<void>;
  loading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

// Utility functions for storage handling
async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error("Local storage is unavailable:", e);
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

async function setStorageItem(key: string, value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error("Local storage is unavailable:", e);
    }
  } else {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }
}

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
};

interface ClientProviderProps {
  children: React.ReactNode;
}

export const ClientProvider: React.FC<ClientProviderProps> = ({ children }) => {
  const [client, setClientState] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log("Loading client data from storage...");
    const loadClientFromStorage = async () => {
      const storedClient = await getStorageItem("client_data");
      if (storedClient) {
        setClientState(JSON.parse(storedClient));
      }
      setLoading(false);
    };

    loadClientFromStorage();
  }, []);

  const setClient = async (newClient: Client | null) => {
    setClientState(newClient);
    await setStorageItem("client_data", newClient ? JSON.stringify(newClient) : null);
  };

  return (
    <ClientContext.Provider value={{ client, setClient, loading }}>
      {children}
    </ClientContext.Provider>
  );
};

export default ClientProvider;