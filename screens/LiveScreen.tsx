import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import {
  VictoryChart,
  VictoryScatter,
  VictoryAxis,
  VictoryTheme,
} from "victory-native";

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

  // ✅ Track which button state is active
  const [isGlucoseRunning, setIsGlucoseRunning] = useState(false);

  // If device disconnects, reset button state
  useEffect(() => {
    if (!connectedDevice) {
      setIsGlucoseRunning(false);
    }
  }, [connectedDevice]);

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
  // Save new glucose readings
  useEffect(() => {
    if (!connectedDevice) return;
    if (!isGlucoseRunning) return;
    if (typeof freqRate !== "string" || !freqRate.includes("/")) return;

    const parts = freqRate.split("/");
    const nextGlucoseVal = Number(parts[1]);
    const nextBatteryVal = Number(parts[2]) || 0;

    if (!Number.isFinite(nextGlucoseVal)) return;

    saveDataToDB({
      time: new Date().toISOString(),
      glucoseLevel: nextGlucoseVal,
      batteryLevel: nextBatteryVal.toString(),
    });

    readDataFromDB((rows) => {
      if (!rows) return;

      const formatted = rows.map((r: any) => ({
        x: new Date(r.time).getTime(),
        y: Number(r.glucoseLevel),
      }));

      setData(formatted.slice(-500));
    });
  }, [freqRate, connectedDevice, isGlucoseRunning]);

  const safeData = data.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y)
  );

  const lastX = safeData.length ? safeData[safeData.length - 1].x : now;
  const domainX: [number, number] = [lastX - WINDOW_MS, lastX];

  // Auto-scale Y based on visible data
  const visibleData = safeData.filter(
    (p) => p.x >= domainX[0] && p.x <= domainX[1]
  );

  const yValues = visibleData.map((p) => p.y);

  let yMin = 0;
  let yMax = 100;

  if (yValues.length > 0) {
    const minVal = Math.min(...yValues);
    const maxVal = Math.max(...yValues);

    if (minVal === maxVal) {
      yMin = Math.max(0, minVal - 20);
      yMax = maxVal + 20;
    } else {
      const padding = Math.max((maxVal - minVal) * 0.1, 20);
      yMin = Math.max(0, minVal - padding);
      yMax = maxVal + padding;
    }
  }

  // Commands
  const startGlucose = () => {
    if (!connectedDevice) {
      Alert.alert("Not Connected", "Connect to the device first.");
      return;
    }
    if (isGlucoseRunning) {
      Alert.alert("Already Running", "Glucose streaming is already active.");
      return;
    }

    sendDataToDevice(connectedDevice, "1110");
    setIsGlucoseRunning(true);
    Alert.alert("Glucose Started", "Glucose streaming is now ACTIVE.");
  };

  const stopGlucose = () => {
    if (!connectedDevice) {
      Alert.alert("Not Connected", "Connect to the device first.");
      return;
    }
    if (!isGlucoseRunning) {
      Alert.alert("Already Stopped", "Glucose streaming is already stopped.");
      return;
    }
  
    Alert.alert(
      "Stop Glucose Streaming",
      "Are you sure you want to stop glucose streaming?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: async () => {
            await sendDataToDevice(connectedDevice, "1111");
            setIsGlucoseRunning(false);
            Alert.alert("Glucose Stopped", "Glucose streaming is now STOPPED.");
          },
        },
      ]
    );
  };

  // Wrap disconnect so we reset state + alert
  const handleDisconnect = () => {
    setIsGlucoseRunning(false);
    disconnectFromDevice();
    Alert.alert("Disconnected", "Device disconnected.");
  };

  const currentDate = new Date(lastX).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="lightblue" />

      {/* LOGO */}
      <Image source={require("../Images/logo.jpg")} style={styles.logo} />

      {/* CONNECTION BAR */}
      <View
        style={[
          styles.connectionBar,
          connectedDevice ? styles.connectedBar : styles.disconnectedBar,
        ]}
      >
        {connectedDevice ? (
          <>
            <Text style={styles.connectionText}>✅ Connected</Text>
            <Text style={styles.connectionSubText}>Battery: {batteryVal}%</Text>
            <TouchableOpacity
              style={styles.disconnectButtonSmall}
              onPress={handleDisconnect}
            >
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.connectionText}>❌ Not Connected</Text>
            <TouchableOpacity
              style={styles.connectButtonSmall}
              onPress={openDeviceModal}
            >
              <Text style={styles.connectText}>Connect</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {connectedDevice ? (
        <>
          {/* STATUS */}
          <Text
            style={[
              styles.statusText,
              isGlucoseRunning ? styles.statusOn : styles.statusOff,
            ]}
          >
            {isGlucoseRunning ? "● Glucose ACTIVE" : "● Glucose STOPPED"}
          </Text>

          {/* FREQUENCY DISPLAY */}
          <Text style={styles.freqLabel}>Frequency (Hz)</Text>
          <View style={styles.roundBox}>
            <Text style={styles.freqValue}>{glucoseVal || 0}</Text>
          </View>

          {/* GRAPH */}
          <View style={styles.chartContainer}>
            <Text style={styles.dateOverlay}>{currentDate}</Text>
            <VictoryChart
              scale={{ x: "time" }}
              domain={{ x: domainX, y: [yMin, yMax] }}
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
              <VictoryScatter
                size={3}
                style={{ data: { fill: "#8b0000" } }}
                data={safeData}
              />
            </VictoryChart>
          </View>

          {/* GLUCOSE BUTTONS */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                isGlucoseRunning && styles.buttonDisabled,
              ]}
              onPress={startGlucose}
              disabled={isGlucoseRunning}
            >
              <Text style={styles.buttonText}>Start Glucose</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                !isGlucoseRunning && styles.buttonDisabled,
              ]}
              onPress={stopGlucose}
              disabled={!isGlucoseRunning}
            >
              <Text style={styles.buttonText}>Stop Glucose</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      <DeviceModal
        closeModal={() => setModalVisible(false)}
        visible={modalVisible}
        connectToPeripheral={connectToDevice}
        devices={allDevices}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    paddingTop: 10,
  },
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
  connectedBar: {
    backgroundColor: "#d0f5d0",
    borderBottomWidth: 2,
    borderColor: "green",
  },
  disconnectedBar: {
    backgroundColor: "#ffd6d6",
    borderBottomWidth: 2,
    borderColor: "red",
  },
  connectionText: { fontSize: 18, fontWeight: "bold" },
  connectionSubText: { fontSize: 16, fontWeight: "500" },
  connectButtonSmall: {
    backgroundColor: "dodgerblue",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  disconnectButtonSmall: {
    backgroundColor: "red",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  connectText: { color: "white", fontSize: 16, fontWeight: "600" },
  disconnectText: { color: "white", fontSize: 16, fontWeight: "600" },

  // ✅ status label
  statusText: { marginTop: 10, fontSize: 16, fontWeight: "700" },
  statusOn: { color: "green" },
  statusOff: { color: "red" },

  // Frequency Label
  freqLabel: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 15,
    color: "blue",
  },
  roundBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "lightblue",
    justifyContent: "center",
    marginTop: 5,
  },
  freqValue: {
    fontSize: 42,
    fontWeight: "bold",
    textAlign: "center",
    color: "white",
  },

  // Graph
  chartContainer: { marginTop: 10, backgroundColor: "lightblue", borderRadius: 8, position: "relative", },

  // date
  dateOverlay: {
    position: "absolute",
    top: 8,
    right: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#003B7A",
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
  },

  // Buttons
  buttonRow: { flexDirection: "row", marginTop: 20 },
  button: {
    backgroundColor: "lightblue",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
