import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  VictoryChart,
  VictoryScatter,
  VictoryAxis,
  VictoryTheme,
} from "victory-native";

import { useBLEContext } from "../BLEContext";

export default function AlignmentScreen({ navigation }) {
  const { connectedDevice, sendDataToDevice, freqRate } = useBLEContext();

  // ✅ Parse BLE string like: "2036/0/0"
  // We'll plot the FIRST field (2036) as the alignment value.
  let alignmentVal = NaN;
  let batteryVal = 0;

  if (typeof freqRate === "string" && freqRate.includes("/")) {
    const parts = freqRate.split("/");
    alignmentVal = Number(parts[1]); // ✅ FIX: was parts[1]
    batteryVal = Number(parts[2]) || 0; // keep if you want, but logs show 0
  }

  // Track alignment running
  const [isAlignmentRunning, setIsAlignmentRunning] = useState(false);

  // LED state
  const [ledCenterMode, setLedCenterMode] = useState(false);

  // Graph state (LIVE ONLY)
  type DataPoint = { x: number; y: number };
  const [data, setData] = useState<DataPoint[]>([]);
  const WINDOW_MS = 3 * 60 * 1000; // 3 minutes

  // If device disconnects, reset states + clear live data
  useEffect(() => {
    if (!connectedDevice) {
      setIsAlignmentRunning(false);
      setData([]);
    }
  }, [connectedDevice]);

  const toggleLED = () => {
    if (!connectedDevice) {
      Alert.alert("Not Connected", "Connect to the device first.");
      return;
    }

    const next = !ledCenterMode;
    setLedCenterMode(next);

    const AllLED = "1114";
    const CenterLED = "1115";

    sendDataToDevice(connectedDevice, next ? CenterLED : AllLED);
  };

  // ✅ Append new BLE points (LIVE ONLY, no DB)
  useEffect(() => {
    if (!connectedDevice) return;
    if (!Number.isFinite(alignmentVal)) return; // skip only NaN/Infinity

    const t = Date.now();
    const point = { x: t, y: alignmentVal };

    setData((prev) => {
      const next = [...prev, point];
      const cutoff = t - WINDOW_MS;
      const pruned = next.filter((p) => p.x >= cutoff);
      return pruned.length > 800 ? pruned.slice(pruned.length - 800) : pruned;
    });
  }, [alignmentVal, connectedDevice]);

  const safeData = data.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y)
  );

  // ✅ window follows latest DATA point
  const lastX = safeData.length ? safeData[safeData.length - 1].x : Date.now();
  const domainX = [lastX - WINDOW_MS, lastX];

  // Commands
  const startAlignment = () => {
    if (!connectedDevice) {
      Alert.alert("Not Connected", "Connect to the device first.");
      return;
    }
    if (isAlignmentRunning) {
      Alert.alert("Already Running", "Alignment is already active.");
      return;
    }

    setData([]);
    sendDataToDevice(connectedDevice, "1112");
    setIsAlignmentRunning(true);
    Alert.alert("Alignment Started", "✅ Alignment mode is now ACTIVE.");
  };

  const stopAlignment = () => {
    if (!connectedDevice) {
      Alert.alert("Not Connected", "Connect to the device first.");
      return;
    }
    if (!isAlignmentRunning) {
      Alert.alert("Already Stopped", "Alignment is already stopped.");
      return;
    }

    Alert.alert(
      "Stop Alignment",
      "Are you sure you want to stop alignment mode?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: () => {
            (async () => {
              await sendDataToDevice(connectedDevice, "1113");
              setIsAlignmentRunning(false);
              Alert.alert(
                "Alignment Stopped",
                "🛑 Alignment mode is now STOPPED."
              );
            })();
          },
        },
      ]
    );
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

      {/* STATUS BAR */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {connectedDevice ? "✅ Connected" : "❌ Not Connected"}
        </Text>
        <Text style={styles.statusText}>Battery: {batteryVal}%</Text>

        <Text
          style={[
            styles.alignStatus,
            isAlignmentRunning ? styles.statusOn : styles.statusOff,
          ]}
        >
          {isAlignmentRunning ? "● Alignment ACTIVE" : "● Alignment STOPPED"}
        </Text>

        {/* optional: debug on-screen */}
        <Text style={[styles.statusText, { marginTop: 6 }]}>
          Latest: {Number.isFinite(alignmentVal) ? alignmentVal : "--"}
        </Text>
      </View>

      {/* GRAPH */}
      <View style={styles.chartContainer}>
        <VictoryChart
          scale={{ x: "time" }}
          domain={{ x: domainX, y: [500, 5000] }} 
          padding={{ top: 30, bottom: 50, right: 20, left: 60 }}
          width={Dimensions.get("window").width - 10}
          height={450}
          theme={VictoryTheme.grayscale}
        >
          <VictoryAxis
            dependentAxis
            label="Alignment"
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

      {/* CONTROLS */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isAlignmentRunning && styles.buttonDisabled]}
          onPress={startAlignment}
          disabled={isAlignmentRunning}
        >
          <Text style={styles.buttonText}>Start Alignment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !isAlignmentRunning && styles.buttonDisabled]}
          onPress={stopAlignment}
          disabled={!isAlignmentRunning}
        >
          <Text style={styles.buttonText}>Stop Alignment</Text>
        </TouchableOpacity>
      </View>

      {/* LED Toggle */}
      <View style={styles.ledRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="bulb-outline"
            size={22}
            color="#003B7A"
            style={{ marginRight: 8 }}
          />
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
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 10,
    alignItems: "center",
  },

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

  alignStatus: { marginTop: 8, fontSize: 16, fontWeight: "700" },
  statusOn: { color: "green" },
  statusOff: { color: "red" },

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
  buttonDisabled: {
    opacity: 0.5,
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