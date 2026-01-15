import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Switch, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VictoryChart, VictoryScatter, VictoryAxis, VictoryTheme } from "victory-native";

import { useBLEContext } from "../BLEContext";
import { saveDataToDB, readDataFromDB } from "../src/database";

export default function AlignmentScreen({ navigation }) {
  const {
    connectedDevice,
    sendDataToDevice,
    freqRate,
  } = useBLEContext();

  // BLE values (same parsing as LiveScreen)
  let glucoseVal = 0;
  let batteryVal = 0;

  if (freqRate && freqRate.includes("/")) {
    const parts = freqRate.split("/");
    glucoseVal = Number(parts[1]) || 0;
    batteryVal = Number(parts[2]) || 0;
  }

  // LED state
  const [ledCenterMode, setLedCenterMode] = useState(false);

  const toggleLED = () => {
    setLedCenterMode(!ledCenterMode);
    if (!connectedDevice) return;

    const AllLED = "1114";
    const CenterLED = "1115";
    sendDataToDevice(connectedDevice, ledCenterMode ? AllLED : CenterLED);
  };

  // Alignment graph state (same as Live)
  type DataPoint = { x: number; y: number };
  const [data, setData] = useState<DataPoint[]>([]);
  const [now, setNow] = useState(Date.now());
  const WINDOW_MS = 3 * 60 * 1000; // 3 minutes

  // Load initial stored values (optional — mirrors Live)
  useEffect(() => {
    readDataFromDB((rows) => {
      if (!rows) return;
      const formatted = rows.map((r: any) => ({
        x: new Date(r.time).getTime(),
        y: Number(r.glucoseLevel),
      }));
      setData(formatted.slice(-500));
    });
  }, []);

  // Live graph scroll
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(interval);
  }, []);

  // Add new BLE data exactly like LiveScreen
  useEffect(() => {
    if (!connectedDevice || !Number.isFinite(glucoseVal)) return;

    saveDataToDB({
      time: new Date().toISOString(),
      glucoseLevel: glucoseVal,
      batteryLevel: batteryVal?.toString() || "",
    });

    readDataFromDB((rows) => {
      if (!rows) return;
      const formatted = rows.map((r: any) => ({
        x: new Date(r.time).getTime(),
        y: Number(r.glucoseLevel),
      }));
      setData(formatted.slice(-500));
    });
  }, [glucoseVal, connectedDevice]);

  // Filtering / domain same as Live
  const safeData = data.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const lastX = safeData.length ? safeData[safeData.length - 1].x : now;
  const domainX: [number, number] = [lastX - WINDOW_MS, lastX];

  // Commands
  const startAlignment = () => {
    if (connectedDevice) sendDataToDevice(connectedDevice, "1112");
  };

  const stopAlignment = () => {
    if (connectedDevice) sendDataToDevice(connectedDevice, "1113");
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={26} color="#003B7A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alignment Mode</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* BATTERY & STATUS (optional, matches Live look) */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {connectedDevice ? "Connected" : "Not Connected"}
        </Text>
        <Text style={styles.statusText}>Battery: {batteryVal}%</Text>
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

      {/* CONTROLS BOTTOM */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={startAlignment}>
          <Text style={styles.buttonText}>Start Alignment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={stopAlignment}>
          <Text style={styles.buttonText}>Stop Alignment</Text>
        </TouchableOpacity>
      </View>

      {/* LED Toggle */}
      <View style={styles.ledRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="bulb-outline" size={22} color="#003B7A" style={{ marginRight: 8 }} />
          <Text style={styles.ledLabel}>
            {ledCenterMode ? "Center LED" : "All LEDs"}
          </Text>
        </View>
        <Switch value={ledCenterMode} onValueChange={toggleLED} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", paddingTop: 10, alignItems: "center" },

  header: {
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#003B7A" },

  statusBar: {
    width: "92%",
    backgroundColor: "#E2F1FF",
    paddingVertical: 10,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003B7A",
  },

  chartContainer: {
    marginTop: 10,
    backgroundColor: "lightblue",
    borderRadius: 8,
  },

  controls: {
    flexDirection: "row",
    marginTop: 20,
  },
  button: {
    backgroundColor: "lightblue",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },

  ledRow: {
    flexDirection: "row",
    marginTop: 20,
    alignItems: "center",
    justifyContent: "space-between",
    width: "80%",
  },
  ledLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003B7A",
  },
});
