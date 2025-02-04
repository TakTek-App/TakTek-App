import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

interface Service {
  id: number;
  name: string;
  categoryId: number;
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
  jobId: number;
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
  technicianReview: Review;
}

interface Call {
  id: number;
  date: string;
  userId: number;
  technicianId: number;
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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUpUser: (firstName: string, lastName: string, email: string, phone: string, password: string) => Promise<void>;
  signInUser: (email: string, password: string) => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => Promise<void>;
  logOutUser: () => Promise<void>;
  fetchUserInfo: (userId: number) => Promise<Job | null>;
  createCall: (userId: number, technicianId: number) => Promise<void>;
  review: (technicianId: number, jobId: number, rating: number) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log("Checking if user is stored in storage");
    const loadUserFromStorage = async () => {
      const storedUser = await getStorageItem("auth_user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };

    loadUserFromStorage();
  }, []);

  const signUpUser = async (firstName: string, lastName: string, email: string, phone: string, password: string) => {
    try {
      const response = await fetch(`${Constants.expoConfig?.extra?.expoPublic?.DB_SERVER}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName, email, phone, password }),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const data = await response.json();
      setTimeout(() => {
        setUser(data);
      }, 1500);
      await setStorageItem("auth_user", JSON.stringify(data));
    } catch (error) {
      console.error("Error during registration:", error);
      throw error;
    }
  };

  const signInUser = async (email: string, password: string) => {
    try {
      const response = await fetch(`${Constants.expoConfig?.extra?.expoPublic?.DB_SERVER}/users/login`, {
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
      setUser(data);
      await setStorageItem("auth_user", JSON.stringify(data));
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  };

  const updateUser = async (updatedUser: Partial<User>) => {
    if (!user) return;

    try {
      const response = await fetch(`${Constants.expoConfig?.extra?.expoPublic?.DB_SERVER}/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedUser),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      const data = await response.json();
      const newUser = { ...user, ...data };
      setUser(newUser);
      await setStorageItem("auth_user", JSON.stringify(newUser));
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };

  const logOutUser = async () => {
    setUser(null);
    await setStorageItem("auth_user", null);
  };

  const fetchUserInfo = async (userId: number) => {
    try {
      const response = await fetch(`${Constants.expoConfig?.extra?.expoPublic?.DB_SERVER}/users/${userId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
          throw new Error("Failed to fetch user information");
      }

      const user = await response.json();
      setUser(user);
      const latestJob = user.jobs?.[user.jobs.length - 1];

      if (latestJob) {
        console.log("User's latest job:", latestJob);
        return latestJob;
      } else {
        console.warn("User has no jobs");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw error;
    }
  };

  const createCall = async (userId: number, technicianId: number) => {
    try {
      const response = await fetch(`${Constants.expoConfig?.extra?.expoPublic?.DB_SERVER}/users/create-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, technicianId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create a call");
      }

      console.log("Call created successfully");
      const user = await response.json();
      setUser(user);
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw error;
    }
  };

  const review = async (technicianId: number, jobId: number, rating: number) => {
    try {
      const response = await fetch(`${Constants.expoConfig?.extra?.expoPublic?.DB_SERVER}/users/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ technicianId, jobId, rating }),
      });

      if (!response.ok) {
        throw new Error("Failed to review");
      }

      const data = await response.json();
      console.log("Review submitted successfully:", data);
    } catch (error) {
      console.error("Error creating a review", error);
      throw error;
    }
  };

  const setStorageKey = async (key: string, value: string | null) => {
    await setStorageItem(key, value);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUpUser,
        signInUser,
        updateUser,
        logOutUser,
        fetchUserInfo,
        createCall,
        review,
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