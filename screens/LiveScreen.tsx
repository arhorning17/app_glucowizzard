import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, StatusBar } from "react-native";
import { VictoryChart, VictoryScatter, VictoryAxis, VictoryTheme } from "victory-native";
import base64 from "react-native-base64";
import { Ionicons } from "@expo/vector-icons";

import { useBLEContext } from "../BLEContext";
import DeviceModal from "../DeviceConnectionModal";

import { initDB, saveDataToDB, readDataFromDB } from "../src/database";

export default function LiveScreen() {
  const {
    requestPermissions,
    scanForPeripherals,
    allDevices,
    connectToDevice,
    connectedDevice,
    disconnectFromDevice,
    freqRate,
    sendDataToDevice,
  } = useBLEContext();

  // Modal state for BLE device scanning
  const [modalVisible, setModalVisible] = useState(false);
  const openDeviceModal = async () => {
    const ok = await requestPermissions();
    if (ok) scanForPeripherals();
    setModalVisible(true);
  };

  let glucoseVal = 0;
  let batteryVal = 0;

  if (freqRate && freqRate.includes("/")) {
    const parts = freqRate.split("/");
    glucoseVal = Number(parts[1]) || 0;
    batteryVal = Number(parts[2]) || 0;
  }

  // Graph state
  type DataPoint = { x: number; y: number };
  const [data, setData] = useState<DataPoint[]>([]);
  const [now, setNow] = useState(Date.now());
  const WINDOW_MS = 3 * 60 * 1000;

  // Load saved data
  useEffect(() => {
    initDB();
    readDataFromDB((rows) => {
      if (!rows) return;
      const formatted = rows.map((r: any) => ({
        x: new Date(r.time).getTime(),
        y: Number(r.glucoseLevel),
      }));
      setData(formatted.slice(-500));
    });
  }, []);

  // Live scrolling
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(interval);
  }, []);

  // Save new glucose readings
  useEffect(() => {
    if (!connectedDevice || !Number.isFinite(glucoseVal)) return;

    saveDataToDB({
      time: new Date().toISOString(),
      glucoseLevel: glucoseVal,
      batteryLevel: batteryVal?.toString() || "",
    });

    readDataFromDB((rows) => {
      const formatted = rows.map((r: any) => ({
        x: new Date(r.time).getTime(),
        y: Number(r.glucoseLevel),
      }));
      setData(formatted.slice(-500));
    });
  }, [glucoseVal, connectedDevice]);

  const safeData = data.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const lastX = safeData.length ? safeData[safeData.length - 1].x : now;
  const domainX: [number, number] = [lastX - WINDOW_MS, lastX];

  // Commands
  const startGlucose = () => {
    if (!connectedDevice) return console.log("No connected device");
    sendDataToDevice(connectedDevice, "1110");
  };
  
  const stopGlucose = () => {
    if (!connectedDevice) return console.log("No connected device");
    sendDataToDevice(connectedDevice, "1111");
  };
  
  /*
  const startAlignment = () => {
    if (!connectedDevice) return console.log("No connected device");
    sendDataToDevice(connectedDevice, "1112");
  };
  
  const stopAlignment = () => {
    if (!connectedDevice) return console.log("No connected device");
    sendDataToDevice(connectedDevice, "1113");
  };
*/
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="lightblue" />

      {/* LOGO */}
      <Image source={require("../Images/logo.jpg")} style={styles.logo} />

      {/* CONNECTION BAR */}
      <View style={[styles.connectionBar, connectedDevice ? styles.connectedBar : styles.disconnectedBar]}>
        {connectedDevice ? (
          <>
            <Text style={styles.connectionText}>✅ Connected</Text>
            <Text style={styles.connectionSubText}>Battery: {batteryVal}%</Text>
            <TouchableOpacity style={styles.disconnectButtonSmall} onPress={disconnectFromDevice}>
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.connectionText}>❌ Not Connected</Text>
            <TouchableOpacity style={styles.connectButtonSmall} onPress={openDeviceModal}>
              <Text style={styles.connectText}>Connect</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {connectedDevice ? (
        <>
          {/* FREQUENCY DISPLAY */}
          <Text style={styles.freqLabel}>Frequency (Hz)</Text>
          <View style={styles.roundBox}>
            <Text style={styles.freqValue}>{glucoseVal || 0}</Text>
          </View>

          {/* GRAPH */}
          <View style={styles.chartContainer}>
            <VictoryChart
              scale={{ x: "time" }}
              domain={{ x: domainX, y: [0, 500] }}
              padding={{ top: 30, bottom: 50, right: 20, left: 60 }}
              width={Dimensions.get("window").width - 10}
              height={450}
              theme={VictoryTheme.grayscale}
            >
              <VictoryAxis
                dependentAxis
                label="Frequency (Hz)"
                style={{
                  axisLabel: { padding: 40, fontSize: 16, fill: "black" },
                  tickLabels: { fontSize: 12 },
                }}
              />
              <VictoryAxis
                tickFormat={(t) =>
                  new Date(t).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                }
              />
              <VictoryScatter size={3} style={{ data: { fill: "#8b0000" } }} data={safeData} />
            </VictoryChart>
          </View>

          {/* GLUCOSE BUTTONS */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={startGlucose}>
              <Text style={styles.buttonText}>Start Glucose</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={stopGlucose}>
              <Text style={styles.buttonText}>Stop Glucose</Text>
            </TouchableOpacity>
          </View>

        </>
      ) : null}

      <DeviceModal
        closeModal={() => setModalVisible(false)}
        visible={modalVisible}
        connectToPeripheral={connectToDevice}   // ✔ correct
        devices={allDevices}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", alignItems: "center", paddingTop: 10 },
  logo: { width: 102, height: 32, marginBottom: 6 },

  // Connection Bar
  connectionBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  connectedBar: { backgroundColor: "#d0f5d0", borderBottomWidth: 2, borderColor: "green" },
  disconnectedBar: { backgroundColor: "#ffd6d6", borderBottomWidth: 2, borderColor: "red" },
  connectionText: { fontSize: 18, fontWeight: "bold" },
  connectionSubText: { fontSize: 16, fontWeight: "500" },
  connectButtonSmall: { backgroundColor: "dodgerblue", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  disconnectButtonSmall: { backgroundColor: "red", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  connectText: { color: "white", fontSize: 16, fontWeight: "600" },
  disconnectText: { color: "white", fontSize: 16, fontWeight: "600" },

  // Frequency Label
  freqLabel: { fontSize: 28, fontWeight: "bold", marginTop: 15, color: "blue" },
  roundBox: { width: 120, height: 120, borderRadius: 60, backgroundColor: "lightblue", justifyContent: "center", marginTop: 5 },
  freqValue: { fontSize: 42, fontWeight: "bold", textAlign: "center", color: "white" },

  // Graph
  chartContainer: { marginTop: 10, backgroundColor: "lightblue", borderRadius: 8 },

  // Buttons (shared style)
  buttonRow: { flexDirection: "row", marginTop: 20 },
  button: {
    backgroundColor: "lightblue",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
