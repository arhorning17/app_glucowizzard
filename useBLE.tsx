import { useMemo, useRef, useState, useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import * as ExpoDevice from "expo-device";
import * as FileSystem from "expo-file-system";
import base64 from "react-native-base64";
import { saveDataToDB } from "./src/database";

const GLUCOWIZZARD_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const GLUCOWIZZARD_READ_CHARACTERISTIC =
  "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const GLUCOWIZZARD_WRITE_CHARACTERISTIC =
  "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";

// -------------------------------------------------------------------------------------
// FAST PIPELINE GOALS
// 1) Keep BLE notification handler as cheap as possible (no async, no disk, no DB, no ISO)
// 2) Buffer raw rows in memory: "ts,glucose,battery\n"
// 3) At EOF: write CSV once (single I/O) then import into DB (ideally bulk/transaction)
// -------------------------------------------------------------------------------------

const CSV_HEADER = "time,glucoseLevel,batteryLevel\n";

function makeCsvPath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${FileSystem.documentDirectory}log_${timestamp}.csv`;
}

// throttle UI updates so they don't contend with BLE stream
function shouldUpdate(now: number, last: number, intervalMs: number) {
  return now - last >= intervalMs;
}

async function writeCsvOnce(path: string, rows: string[]) {
  // Single disk write for best speed
  const content = CSV_HEADER + rows.join("");
  await FileSystem.writeAsStringAsync(path, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

async function importCsvToDatabase(csvPath: string) {
  // It runs AFTER transfer, so it won't slow BLE throughput.
  const content = await FileSystem.readAsStringAsync(csvPath, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const lines = content.split(/\r?\n/).filter(Boolean);
  for (let i = 1; i < lines.length; i++) {
    const [tsStr, glucoseStr, batteryStr = ""] = lines[i].split(",");
    const ts = Number(tsStr);
    const glucoseLevel = Number(glucoseStr);
    if (!Number.isFinite(ts) || !Number.isFinite(glucoseLevel)) continue;

    // Convert timestamp once here (post-transfer)
    const timeIso = new Date(ts * 1000).toISOString();

    await saveDataToDB({
      time: timeIso,
      glucoseLevel,
      batteryLevel: batteryStr,
    });
  }
}

// -------------------------------------------------------------------------------------
// BLE HOOK
// -------------------------------------------------------------------------------------
function useBLE() {
  const bleManager = useMemo(() => new BleManager(), []);

  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [freqRate, setFreqRate] = useState<string>("0/0/0/0");

  // Fast in-memory buffers / refs (no rerenders)
  const csvRowsRef = useRef<string[]>([]);
  const csvPathRef = useRef<string | null>(null);
  const transferStartRef = useRef<number | null>(null);
  const lastFreqUiUpdateRef = useRef<number>(0);

  // Keep a handle to the subscription so we can clean up if needed
  const monitorSubRef = useRef<ReturnType<
    Device["monitorCharacteristicForService"]
  > | null>(null);

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
  // PACKET PARSING (FAST PATH)
  // Row format buffered: "ts,glucose,battery\n"
  // ---------------------------------------------------------------------------
  const pushLiveRow = (decoded: string) => {
    // expected: "ts/glucose/battery"
    const first = decoded.indexOf("/");
    if (first < 0) return;
    const second = decoded.indexOf("/", first + 1);
    if (second < 0) return;

    const tsStr = decoded.slice(0, first).trim();
    const glucoseStr = decoded.slice(first + 1, second).trim();
    const batteryStr = decoded.slice(second + 1).trim();

    const ts = Number(tsStr);
    const glucose = Number(glucoseStr);

    if (!Number.isFinite(ts) || !Number.isFinite(glucose)) return;

    csvRowsRef.current.push(`${ts},${glucose},${batteryStr}\n`);
  };

  const pushFileRow = (decoded: string) => {
    // expected: "ts,glucose"
    const comma = decoded.indexOf(",");
    if (comma < 0) return;

    const tsStr = decoded.slice(0, comma).trim();
    const glucoseStr = decoded.slice(comma + 1).trim();

    const ts = Number(tsStr);
    const glucose = Number(glucoseStr);

    if (!Number.isFinite(ts) || !Number.isFinite(glucose)) return;

    csvRowsRef.current.push(`${ts},${glucose},\n`);
  };

  // Header/end detection: expected "a/b/c/flag"
  const parseSlash4Flag = (decoded: string) => {
    // Cheap: only split when we see at least 3 slashes
    let slashCount = 0;
    for (let i = 0; i < decoded.length; i++) {
      if (decoded.charCodeAt(i) === 47) slashCount++;
      if (slashCount >= 3) break;
    }
    if (slashCount < 3) return null;

    const parts = decoded.split("/");
    if (parts.length !== 4) return null;

    const flag = Number(parts[3]);
    if (!Number.isFinite(flag)) return null;

    return flag; // 1 header, 0 end
  };

  // ---------------------------------------------------------------------------
  // LISTENER
  // ---------------------------------------------------------------------------
  const startUnifiedListener = (device: Device) => {
    console.log("Starting unified BLE listener...");

    // Ensure any previous monitor is removed
    try {
      monitorSubRef.current?.remove?.();
    } catch {}

    monitorSubRef.current = device.monitorCharacteristicForService(
      GLUCOWIZZARD_UUID,
      GLUCOWIZZARD_READ_CHARACTERISTIC,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;

        // Decode base64 (required)
        const decoded = base64.decode(characteristic.value);

        // 1) Header/EOF are slash-4 packets; detect fast
        const flag = parseSlash4Flag(decoded);
        if (flag === 1) {
          transferStartRef.current = Date.now();
          console.log("📁 File header:", decoded);
          return;
        }
        if (flag === 0) {
          console.log("📁 End of file:", decoded);

          const start = transferStartRef.current;
          if (start) {
            const durationSec = ((Date.now() - start) / 1000).toFixed(2);
            console.log(`📁 File transfer completed in ${durationSec} seconds`);
          }
          transferStartRef.current = null;

          // Kick off post-processing AFTER transfer (async, not blocking BLE handler)
          const csvPath = csvPathRef.current;
          const rows = csvRowsRef.current.slice();
          csvRowsRef.current = []; // clear immediately to free memory

          if (csvPath) {
            void (async () => {
              try {
                await writeCsvOnce(csvPath, rows);
                console.log("CSV saved:", csvPath);

                await importCsvToDatabase(csvPath);
                console.log("CSV import complete");
              } catch (e) {
                console.error("Post-processing failed:", e);
              }
            })();
          }
          return;
        }

        // 2) Live packet: "ts/glucose/battery"
        // Avoid split unless needed
        if (decoded.indexOf("/") !== -1) {
          // If it's not slash4, it's likely slash3 live
          // Push row fast (manual slicing)
          pushLiveRow(decoded);
          return;
        }

        // 3) File data packet: "ts,glucose"
        if (decoded.indexOf(",") !== -1) {
          // Could also be freq packet; treat freq as UI-only if you still need it
          // If you want to distinguish, do a cheap numeric check of the second value range.
          const comma = decoded.indexOf(",");
          const secondStr = decoded.slice(comma + 1).trim();
          const v = Number(secondStr);

          // Heuristic: freq packets are typically high (50..5000) and might arrive during live mode.
          // If this is a file dump, glucose likely 40..400. We'll route accordingly.
          if (Number.isFinite(v) && v > 50 && v < 5000 && decoded.length < 32) {
            // Throttle UI updates to avoid slowing BLE stream
            const now = Date.now();
            if (shouldUpdate(now, lastFreqUiUpdateRef.current, 500)) {
              lastFreqUiUpdateRef.current = now;
              setFreqRate(decoded);
            }
            return;
          }

          pushFileRow(decoded);
          return;
        }

        // console.warn("Unknown packet:", decoded); // avoid logging in hot path
      }
    );
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

      // MTU (Android)
      try {
        await deviceConnection.requestMTU(185);
        console.log("MTU updated to:", deviceConnection.mtu);
      } catch {
        console.log("MTU request failed → MTU likely fixed at 23");
      }

      // Optional: ask for high connection priority
      if (Platform.OS === "android") {
        try {
          await deviceConnection.requestConnectionPriority?.(1);
          console.log("Requested high connection priority");
        } catch {}
      }

      bleManager.stopDeviceScan();
      setConnectedDevice(deviceConnection);

      // Prepare buffers for this session
      csvRowsRef.current = [];
      csvPathRef.current = makeCsvPath();

      console.log("CSV will be written at EOF:", csvPathRef.current);

      // Start listener BEFORE sending commands
      startUnifiedListener(deviceConnection);

      // Stop alignment
      await sendDataToDevice(
        deviceConnection,
        "1113/" + new Date().toISOString()
      );

      await new Promise((res) => setTimeout(res, 300));

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
      // Avoid excessive logging during throughput tests
      // console.log("Sending:", sendString);

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
      try {
        monitorSubRef.current?.remove?.();
      } catch {}
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
