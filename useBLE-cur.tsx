import { useMemo, useState, useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
  BleManager,
  Device,
} from "react-native-ble-plx";
import * as ExpoDevice from "expo-device";
import * as FileSystem from "expo-file-system";
import base64 from "react-native-base64";
import { saveDataToDB } from "./src/database";

const GLUCOWIZZARD_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const GLUCOWIZZARD_READ_CHARACTERISTIC =
  "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const GLUCOWIZZARD_WRITE_CHARACTERISTIC =
  "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";

// ---------------------------------------------------------------------------
// CSV LOGGING
// ---------------------------------------------------------------------------
let csvBuffer = "";
const CSV_FLUSH_INTERVAL = 200;
let currentCsvPath: string | null = null;
let fileTransferStart: number | null = null;

async function startNewCsvFile() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  currentCsvPath = `${FileSystem.documentDirectory}log_${timestamp}.csv`;

  await FileSystem.writeAsStringAsync(
    currentCsvPath,
    "time,glucoseLevel,batteryLevel\n",
    { encoding: "utf8" }
  );

  console.log("📄 New CSV created:", currentCsvPath);
}

// Append to CSV buffer on a timer (fast)
async function flushCsvBuffer() {
  if (!currentCsvPath || csvBuffer.length === 0) return;

  await FileSystem.writeAsStringAsync(
    currentCsvPath,
    csvBuffer,
    { encoding: "utf8", append: true }
  );

  csvBuffer = "";
}

// Import CSV → SQLite
async function importCsvToDatabase(csvPath: string) {
  console.log("📥 Importing CSV into database:", csvPath);

  const content = await FileSystem.readAsStringAsync(csvPath, {
    encoding: "utf8",
  });

  const lines = content.trim().split("\n");

  // Skip the header row
  for (let i = 1; i < lines.length; i++) {
    const [time, glucoseLevel, batteryLevel] = lines[i].split(",");

    await saveDataToDB({
      time,
      glucoseLevel: Number(glucoseLevel),
      batteryLevel: batteryLevel || "",
    });
  }

  console.log("✅ CSV import complete");
}

// ---------------------------------------------------------------------------
// BLE HOOK
// ---------------------------------------------------------------------------
function useBLE() {
  const bleManager = useMemo(() => new BleManager(), []);

  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [freqRate, setFreqRate] = useState<string>("0/0/0/0");

  // CSV flush loop
  useEffect(() => {
    const interval = setInterval(() => {
      flushCsvBuffer();
    }, CSV_FLUSH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // PERMISSIONS
  // ---------------------------------------------------------------------------
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

    return (
      scan === "granted" &&
      connect === "granted" &&
      location === "granted"
    );
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

  // ---------------------------------------------------------------------------
  // SCANNING
  // ---------------------------------------------------------------------------
  const scanForPeripherals = () => {
    console.log("Scanning...");
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("Scan error:", error);
        return;
      }

      if (device && device.name?.includes("Gluco")) {
        setAllDevices((prev) =>
          prev.find((d) => d.id === device.id) ? prev : [...prev, device]
        );
      }
    });
  };

  // ---------------------------------------------------------------------------
  // PACKET HANDLERS → CSV BUFFER
  // ---------------------------------------------------------------------------
  const handleLivePacket = (packet: string) => {
    const [tsStr, glucoseStr, batteryStr] = packet.trim().split("/");

    const ts = Number(tsStr);
    const glucose = Number(glucoseStr);
    const battery = Number(batteryStr);

    if (isNaN(glucose)) return;

    csvBuffer += `${new Date(ts * 1000).toISOString()},${glucose},${battery}\n`;
  };

  const handleFileDataPacket = (packet: string) => {
    const parts = packet.split(",");
    if (parts.length !== 2) return;

    const ts = Number(parts[0]);
    const glucose = Number(parts[1]);

    if (isNaN(ts) || isNaN(glucose)) return;

    csvBuffer += `${new Date(ts * 1000).toISOString()},${glucose},\n`;
  };

  const handleFreqPacket = (packet: string) => {
    const parts = packet.split(",");
    if (parts.length !== 2) return;

    const value = Number(parts[1]);
    if (!isNaN(value) && value > 50 && value < 5000) {
      setFreqRate(packet);
    }
  };

  // ---------------------------------------------------------------------------
  // UNIFIED LISTENER
  // ---------------------------------------------------------------------------
  const startUnifiedListener = async (device: Device) => {
    try {
      console.log("Starting unified BLE listener...");

      await device.monitorCharacteristicForService(
        GLUCOWIZZARD_UUID,
        GLUCOWIZZARD_READ_CHARACTERISTIC,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;

          const decoded = base64.decode(characteristic.value);
          const slashParts = decoded.split("/");
          const commaParts = decoded.split(",");

          // FILE HEADER
          if (slashParts.length === 4 && Number(slashParts[3]) === 1) {
            fileTransferStart = Date.now();
            console.log("📁 File header:", decoded);
            return;
          }

          // FILE END
          if (slashParts.length === 4 && Number(slashParts[3]) === 0) {
            console.log("📁 End of file:", decoded);

            if (fileTransferStart) {
              const durationMs = Date.now() - fileTransferStart;
              const durationSec = (durationMs / 1000).toFixed(2);
              console.log(
                `📁 File transfer completed in ${durationSec} seconds`
              );
            }

            fileTransferStart = null;

            // Import CSV into database
            if (currentCsvPath) {
              importCsvToDatabase(currentCsvPath);
            }

            return;
          }

          // LIVE PACKET
          if (slashParts.length === 3) {
            handleLivePacket(decoded);
            return;
          }

          // FILE DATA PACKET
          if (commaParts.length === 2) {
            handleFileDataPacket(decoded);
            return;
          }

          console.warn("Unknown packet:", decoded);
        }
      );
    } catch (e) {
      console.error("Unified listener failed:", e);
    }
  };

  // ---------------------------------------------------------------------------
  // CONNECT / SEND / DISCONNECT
  // ---------------------------------------------------------------------------
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
        console.log("MTU request failed → MTU likely fixed at 23");
      }

      bleManager.stopDeviceScan();
      setConnectedDevice(deviceConnection);

      // Start CSV file
      await startNewCsvFile();

      // Start listener BEFORE sending commands
      startUnifiedListener(deviceConnection);

      // Stop alignment
      await sendDataToDevice(
        deviceConnection,
        "1113/" + new Date().toISOString()
      );

      await new Promise((res) => setTimeout(res, 500));

      // Request file dump
      console.log("Sending 1116 for file dump...");
      await sendDataToDevice(deviceConnection, "1116");
    } catch (e) {
      console.log("FAILED TO CONNECT:", e);
    }
  };

  const sendDataToDevice = async (device: Device, sendString: string) => {
    if (!device) return;

    try {
      const encoded = base64.encode(sendString);
      console.log("Sending:", sendString);

      await bleManager.writeCharacteristicWithoutResponseForDevice(
        device.id,
        GLUCOWIZZARD_UUID,
        GLUCOWIZZARD_WRITE_CHARACTERISTIC,
        encoded
      );
    } catch (error) {
      console.log("Error sending data:", error);
    }
  };

  const disconnectFromDevice = () => {
    if (connectedDevice) {
      bleManager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      setFreqRate("0/0/0/0");
    }
  };

  // ---------------------------------------------------------------------------
  // RETURN API
  // ---------------------------------------------------------------------------
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
