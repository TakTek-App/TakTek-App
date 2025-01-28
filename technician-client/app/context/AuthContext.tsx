import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

interface Service {
  id: number;
  name: string;
  categoryId: number;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  photo: string;
  reviews: Review[];
  jobs: Job[];
  calls: Call[];
}

interface Company {
  id: string;
  name: string;
  email: string;
  password: string;
  address: string;
  city: string;
  zipCode: string;
  businessReg: string;
  driverLicense: string;
  driverLicenseExpDate: string;
  insurance: string;
  insuranceExpDate: string;
  license: string;
  amountDue: number;
  services: Service[];
}

interface Review {
  id: number;
  description: string;
  rating: number;
  technicianId: number;
}

interface Job {
  id: number;
  date: string;
  completed: boolean;
  userId: number;
  technicianId: number;
  serviceId: number;
  user: User;
  technician: Technician;
  service: Service;
}

interface Call {
  id: number;
  date: string;
  userId: number;
  technicianId: number;
}

interface Technician {
  id: number;
  verified: boolean;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  photo: string;
  companyId: string;
  available: boolean;
  license: string;
  licenseExpDate: string;
  rating: number;
  services: Service[];
  company: Company;
  reviews: Review[];
  jobs: Job[];
  calls: Call[];
}

interface AuthContextType {
  technician: Technician | null;
  loading: boolean;
  signUpTechnician: (firstName: string, lastName: string, email: string, companyId: string, password: string) => Promise<void>;
  signInTechnician: (email: string, password: string) => Promise<void>;
  updateTechnician: (updatedTechnician: Partial<Technician>, updatedServices: number[]) => Promise<void>;
  logOutTechnician: () => Promise<void>;
  setStorageKey: (key: string, value: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log("Checking if technician is stored in storage");
    const loadTechnicianFromStorage = async () => {
      const storedTechnician = await getStorageItem("auth_technician");
      if (storedTechnician) {
        setTechnician(JSON.parse(storedTechnician));
      }
      setLoading(false);
    };

    loadTechnicianFromStorage();
  }, []);

  const signUpTechnician = async (firstName: string, lastName: string, email: string, companyId: string, password: string) => {
    try {
      const response = await fetch("http://10.0.2.2:3000/technicians", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName, email, companyId, password, services:[] }),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const data = await response.json();
      setTimeout(() => {
        setTechnician(data);
      }, 1500);
      await setStorageItem("auth_technician", JSON.stringify(data));
    } catch (error) {
      console.error("Error during registration:", error);
      throw error;
    }
  };

  const signInTechnician = async (email: string, password: string) => {
    try {
      const response = await fetch("http://10.0.2.2:3000/technicians/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid email or password");
      }

      const data = await response.json();
      setTechnician(data);
      await setStorageItem("auth_technician", JSON.stringify(data));
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  };

  const updateTechnician = async (updatedTechnician: Partial<Technician>, updatedServices: number[]) => {
    if (!technician) return;
  
    try {
      const response = await fetch(`http://10.0.2.2:3000/technicians/${technician.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...updatedTechnician,
          services: updatedServices,
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to update Technician");
      }
  
      const data = await response.json();
      const newTechnician = { ...technician, ...data, services: updatedServices };
      setTechnician(newTechnician);
      await setStorageItem("auth_Technician", JSON.stringify(newTechnician));
    } catch (error) {
      console.error("Error updating technician:", error);
      throw error;
    }
  };

  const logOutTechnician = async () => {
    setTechnician(null);
    await setStorageItem("auth_technician", null);
  };

  const setStorageKey = async (key: string, value: string | null) => {
    await setStorageItem(key, value);
  };

  return (
    <AuthContext.Provider
      value={{
        technician,
        loading,
        signUpTechnician,
        signInTechnician,
        updateTechnician,
        logOutTechnician,
        setStorageKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthProvider;