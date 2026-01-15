import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform, Alert } from "react-native";
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
} from "react-native-ble-plx";
import * as ExpoDevice from "expo-device";
import { saveDataToDB } from "./src/database";
import base64 from "react-native-base64";

const GLUCOWIZZARD_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const GLUCOWIZZARD_READ_CHARACTERISTIC =
  "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const GLUCOWIZZARD_WRITE_CHARACTERISTIC =
  "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";

interface BluetoothLowEnergyApi {
  requestPermissions(): Promise<boolean>;
  scanForPeripherals(): void;
  connectToDevice: (device: Device) => Promise<void>;
  disconnectFromDevice: () => void;
  connectedDevice: Device | null;
  allDevices: Device[];
  freqRate: string;
  sendDataToDevice: (device: Device, sendString: string) => void;
  startUnifiedListener: (device: Device) => Promise<void>;
}

function useBLE(): BluetoothLowEnergyApi {
  const bleManager = useMemo(() => new BleManager(), []);

  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [freqRate, setFreqRate] = useState<string>("0/0/0/0");

  // ------------------------------------------------------------
  // PERMISSIONS
  // ------------------------------------------------------------

  const requestAndroid31Permissions = async () => {
    const scan = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
    );
    const connect = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
    );
    const location = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    return scan === "granted" && connect === "granted" && location === "granted";
  };

  const requestPermissions = async () => {
    if (Platform.OS !== "android") return true;

    if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      return await requestAndroid31Permissions();
    }
  };

  // ------------------------------------------------------------
  // SCANNING
  // ------------------------------------------------------------

  const scanForPeripherals = () => {
    console.log("Scanning...");
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("Scan error:", error);
        return;
      }

      if (device && device.name?.includes("Gluco")) {
        setAllDevices(prev =>
          prev.find(d => d.id === device.id) ? prev : [...prev, device]
        );
      }
    });
  };

  // ------------------------------------------------------------
  // PACKET HANDLERS
  // ------------------------------------------------------------

  //
  // LIVE PACKET: timestamp / glucose / battery  (3 fields)
  //
  const handleLivePacket = (packet: string) => {
    const parts = packet.trim().split("/");
    if (parts.length !== 3) return;

    const [timestampStr, glucoseStr, batteryStr] = parts;

    const ts = Number(timestampStr);
    const glucose = Number(glucoseStr);
    const battery = Number(batteryStr);

    if (isNaN(glucose)) return;

    saveDataToDB({
      time: new Date(ts * 1000).toISOString(),
      glucoseLevel: glucose,
      batteryLevel: battery.toString(),
    });
  };


  //
  // FILE DATA PACKET: timestamp , glucose  (2 fields)
  //
  const handleFileDataPacket = (packet: string) => {
    const parts = packet.split(",");
    if (parts.length !== 2) return;

    const ts = Number(parts[0]);
    const glucose = Number(parts[1]);

    if (isNaN(ts) || isNaN(glucose)) {
      console.warn("Invalid file data:", packet);
      return;
    }

    saveDataToDB({
      time: new Date(ts * 1000).toISOString(),
      glucoseLevel: glucose,
      batteryLevel: "",
    });
  };

  //
  // FREQUENCY PACKETS (optional)
  // Format: timestamp,freq
  //
  const handleFreqPacket = (packet: string) => {
    const parts = packet.split(",");
    if (parts.length !== 2) return;

    const value = Number(parts[1]);
    if (isNaN(value)) return;

    // frequency readings ~200–2000
    if (value > 50 && value < 5000) {
      setFreqRate(packet);
    }
  };

  // ------------------------------------------------------------
  // UNIFIED LISTENER
  // ------------------------------------------------------------

  const startUnifiedListener = async (device: Device) => {
    try {
      console.log("Starting unified BLE listener...");

      await device.monitorCharacteristicForService(
        GLUCOWIZZARD_UUID,
        GLUCOWIZZARD_READ_CHARACTERISTIC,
        (error, characteristic) => {

          if (error || !characteristic?.value) return;

          const decoded = base64.decode(characteristic.value);
          //console.warn("Packet:", decoded);

          const slashParts = decoded.split("/");
          const commaParts = decoded.split(",");

          // ========== FILE HEADER ==========
          if (slashParts.length === 4 && Number(slashParts[3]) === 1) {
            console.log("File header received:", decoded);
            return;
          }

          // ========== FILE END ==========
          else if (slashParts.length === 4 && Number(slashParts[3]) === 0) {
            console.log("End of file eceived:", decoded);
            return;
          }

          // ========== LIVE GLUCOSE (timestamp/glucose/battery) ==========
          else if (slashParts.length === 3) {
            handleLivePacket(decoded);
            return;
          }

          // ========== FILE DATA (timestamp,glucose) ==========
          else if (commaParts.length === 2) {
            handleFileDataPacket(decoded);
            return;
          }

          console.warn("Unknown packet format:", decoded);
        }
      );

    } catch (e) {
      console.error("Unified listener failed:", e);
    }
  };

  // ------------------------------------------------------------
  // CONNECT / SEND / DISCONNECT
  // ------------------------------------------------------------

  const connectToDevice = async (device: Device) => {
    try {
      console.log("🔗 Connecting to", device.name);

      const deviceConnection = await bleManager.connectToDevice(device.id);
      console.log("Connected to device");

      await deviceConnection.discoverAllServicesAndCharacteristics();
      console.log("Services discovered");

      try {
        await deviceConnection.requestMTU(185);
        console.log("MTU updated to:", deviceConnection.mtu);
      } catch {
        console.log("MTU request failed → device likely fixed at 23");
      }

      bleManager.stopDeviceScan();
      setConnectedDevice(deviceConnection);

      // Start listener for ALL packet types
      startUnifiedListener(deviceConnection);

      // Stop alignment
      sendDataToDevice(
        deviceConnection,
        "1113/" + new Date().toISOString()
      );

      await new Promise((res) => setTimeout(res, 500));

      // Request file dump
      console.log("Sending 1116 to request file...");
      sendDataToDevice(deviceConnection, "1116");
    } catch (e) {
      console.log("FAILED TO CONNECT:", e);
    }
  };

  //
  // SEND COMMAND
  //
  const sendDataToDevice = async (device: Device, sendString: string) => {
    if (!device) return;

    try {
      const encoded = base64.encode(sendString);
      console.log("Sending:", sendString, "→", encoded);

      await bleManager.writeCharacteristicWithoutResponseForDevice(
        device.id,
        GLUCOWIZZARD_UUID,
        GLUCOWIZZARD_WRITE_CHARACTERISTIC,
        encoded
      );

      console.log("Command sent successfully!");
    } catch (error) {
      console.log("Error sending data:", error);
    }
  };

  //
  // DISCONNECT
  //
  const disconnectFromDevice = () => {
    if (connectedDevice) {
      bleManager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      setFreqRate("0/0/0/0");
    }
  };

  // ------------------------------------------------------------
  // RETURN API
  // ------------------------------------------------------------

  return {
    scanForPeripherals,
    requestPermissions,
    connectToDevice,
    allDevices,
    connectedDevice,
    disconnectFromDevice,
    freqRate,
    sendDataToDevice,
    startUnifiedListener,
  };
}

export default useBLE;
