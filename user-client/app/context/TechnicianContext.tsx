import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

interface Coords {
  latitude: number;
  longitude: number;
}

interface Technician {
  id: number,
  role: string;
  firstName: string;
  lastName: string;
  socketId: string;
  photo: string;
  location: Coords | null;
  available: boolean;
  companyId: string;
  company: string;
  rating: number;
  reviews: number;
  services: number[];
}

interface TechnicianContextType {
  technician: Technician | null;
  setTechnician: (technician: Technician | null) => Promise<void>;
  loading: boolean;
}

const TechnicianContext = createContext<TechnicianContextType | undefined>(undefined);

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

export const useTechnician = () => {
  const context = useContext(TechnicianContext);
  if (!context) {
    throw new Error("useTechnician must be used within a TechnicianProvider");
  }
  return context;
};

interface TechnicianProviderProps {
  children: React.ReactNode;
}

export const TechnicianProvider: React.FC<TechnicianProviderProps> = ({ children }) => {
  const [technician, setTechnicianState] = useState<Technician | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log("Loading technician data from storage...");
    const loadTechnicianFromStorage = async () => {
      const storedTechnician = await getStorageItem("technician_data");
      if (storedTechnician) {
        setTechnicianState(JSON.parse(storedTechnician));
      }
      setLoading(false);
    };

    loadTechnicianFromStorage();
  }, []);

  const setTechnician = async (newTechnician: Technician | null) => {
    setTechnicianState(newTechnician);
    await setStorageItem("technician_data", newTechnician ? JSON.stringify(newTechnician) : null);
  };

  return (
    <TechnicianContext.Provider value={{ technician, setTechnician, loading }}>
      {children}
    </TechnicianContext.Provider>
  );
};

export default TechnicianProvider;
