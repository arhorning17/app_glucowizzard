import React, { createContext, useContext } from "react";
import useBLE from "./useBLE";
import { Device } from "react-native-ble-plx";

interface BLEContextType {
  requestPermissions: () => Promise<boolean>;
  scanForPeripherals: () => void;
  connectToDevice: (device: Device) => Promise<void>;   
  disconnectFromDevice: () => void;
  sendDataToDevice: (device: Device, sendString: string) => void;
  allDevices: Device[];                                 
  connectedDevice: Device | null;                       
  freqRate: string;
  startUnifiedListener: (device: Device) => Promise<void>;
}

const BLEContext = createContext<BLEContextType | null>(null);

export const BLEProvider = ({ children }: { children: React.ReactNode }) => {
  const ble = useBLE();

  return (
    <BLEContext.Provider value={ble}>
      {children}
    </BLEContext.Provider>
  );
};

export const useBLEContext = () => {
  const ctx = useContext(BLEContext);
  if (!ctx) {
    throw new Error("useBLEContext must be used inside BLEProvider");
  }
  return ctx;
};
