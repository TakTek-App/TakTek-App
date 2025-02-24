import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import Constants from "expo-constants";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  useEffect(() => {
    if (!socketRef.current) {
      const newSocket = io(
        Constants.expoConfig?.extra?.expoPublic?.SIGNALING_SERVER,
        {
          transports: ["websocket"],
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
        }
      );

      // const newSocket = io("http://192.168.2.11:3002", {
      //   transports: ["websocket"],
      //   reconnectionAttempts: 5,
      //   reconnectionDelay: 3000,
      // });

      socketRef.current = newSocket;

      newSocket.on("connect", () => {
        setIsConnected(true);
        setIsReconnecting(false);
        console.log("✅ Connected to Socket.IO server");
      });

      newSocket.on("disconnect", (reason) => {
        setIsConnected(false);
        console.warn(
          `❌ Disconnected from Socket.IO server. Reason: ${reason}`
        );
        attemptReconnection();
      });

      newSocket.on("connect_error", (error) => {
        console.error("⚠️ Connection Error:", error.message);
        setIsConnected(false);
        setIsReconnecting(true);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const attemptReconnection = () => {
    if (!socketRef.current) return;
    setIsReconnecting(true);

    const interval = setInterval(() => {
      if (socketRef.current?.connected) {
        console.log("🔄 Reconnected successfully");
        setIsReconnecting(false);
        clearInterval(interval);
      } else {
        console.log("🔁 Attempting to reconnect...");
        socketRef.current?.connect();
      }
    }, 5000); // Retry every 5 seconds
  };

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, isConnected, isReconnecting }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export default SocketProvider;
