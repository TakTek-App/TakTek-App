import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

interface Coords {
  latitude: number;
  longitude: number;
}

interface CoordsContextType {
  coords: Coords | null;
  setCoords: (coords: Coords | null) => Promise<void>;
  address: string | null;
  setAddress: (address: string | null) => Promise<void>;
  loading: boolean;
}

const CoordsContext = createContext<CoordsContextType | undefined>(undefined);

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

export const useCoords = () => {
  const context = useContext(CoordsContext);
  if (!context) {
    throw new Error("useCoords must be used within a CoordsProvider");
  }
  return context;
};

interface CoordsProviderProps {
  children: React.ReactNode;
}

export const CoordsProvider: React.FC<CoordsProviderProps> = ({ children }) => {
  const [coords, setCoordsState] = useState<Coords | null>(null);
  const [address, setAddressState] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log("Loading coordinates from storage...");
    const loadCoordsFromStorage = async () => {
      const storedCoords = await getStorageItem("coords_data");
      if (storedCoords) {
        setCoordsState(JSON.parse(storedCoords));
      }
      setLoading(false);
    };

    loadCoordsFromStorage();
  }, []);

  const setCoords = async (newCoords: Coords | null) => {
    setCoordsState(newCoords);
    await setStorageItem("coords_data", newCoords ? JSON.stringify(newCoords) : null);
  };

  const setAddress = async (newAddress: string | null) => {
    setAddressState(newAddress);
    await setStorageItem("address_data", newAddress ? JSON.stringify(newAddress) : null);
  };

  return (
    <CoordsContext.Provider value={{ coords, setCoords, address, setAddress, loading }}>
      {children}
    </CoordsContext.Provider>
  );
};

export default CoordsProvider;
