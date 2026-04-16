import React, { useEffect, useRef, useState } from "react";
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
  VictoryLabel, // ✅ added
} from "victory-native";

import { useBLEContext } from "../BLEContext";

export default function AlignmentScreen({ navigation }) {
  const { connectedDevice, sendDataToDevice, freqRate } = useBLEContext();
  const wasConnectedRef = useRef(false);

  type DataPoint = { x: number; y: number };

  const [data, setData] = useState<DataPoint[]>([]);
  const [windowStart, setWindowStart] = useState<number | null>(null);
  const [isAlignmentRunning, setIsAlignmentRunning] = useState(false);
  const [ledCenterMode, setLedCenterMode] = useState(false);

  const WINDOW_MS = 5 * 60 * 1000;

  let latestAlignmentVal = NaN;
  let batteryVal = 0;

  if (typeof freqRate === "string" && freqRate.includes("/")) {
    const parts = freqRate.split("/");
    latestAlignmentVal = Number(parts[1]);
    batteryVal = Number(parts[2]) || 0;
  }

  useEffect(() => {
    if (!connectedDevice) {
      if (wasConnectedRef.current) {
        setIsAlignmentRunning(false);
        setData([]);
        setWindowStart(null);

        Alert.alert(
          "Device Disconnected",
          "Connection lost. Alignment has been stopped."
        );
      }
      wasConnectedRef.current = false;
    } else {
      wasConnectedRef.current = true;
    }
  }, [connectedDevice]);

  const toggleLED = () => {
    if (!connectedDevice) {
      Alert.alert("Not Connected", "Connect first.");
      return;
    }

    const next = !ledCenterMode;
    setLedCenterMode(next);
    sendDataToDevice(connectedDevice, next ? "1115" : "1114");
  };

  useEffect(() => {
    if (!connectedDevice) return;
    if (!isAlignmentRunning) return;
    if (typeof freqRate !== "string" || !freqRate.includes("/")) return;

    const parts = freqRate.split("/");
    const alignmentVal = Number(parts[1]);

    if (!Number.isFinite(alignmentVal)) return;

    const t = Date.now();

    setData((prev) => {
      const next = [...prev, { x: t, y: alignmentVal }];
      const cutoff = t - WINDOW_MS - 5000;
      const pruned = next.filter((p) => p.x >= cutoff);

      return pruned.length > 1000
        ? pruned.slice(pruned.length - 1000)
        : pruned;
    });

    setWindowStart((prev) => prev ?? t);
  }, [freqRate, connectedDevice, isAlignmentRunning]);

  const safeData = data.filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y)
  );

  const latestPoint = safeData.length ? safeData[safeData.length - 1] : null; // ✅ added

  const now = Date.now();
  const effectiveStart = windowStart ?? now;
  const lastX = safeData.length
    ? safeData[safeData.length - 1].x
    : effectiveStart;

  let domainX: [number, number];

  if (lastX - effectiveStart < WINDOW_MS) {
    domainX = [effectiveStart, effectiveStart + WINDOW_MS];
  } else {
    const left = Math.max(effectiveStart, lastX - WINDOW_MS);
    domainX = [left, lastX];
  }

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

  const startAlignment = () => {
    if (!connectedDevice) {
      Alert.alert("Not Connected", "Connect first.");
      return;
    }

    if (isAlignmentRunning) {
      Alert.alert("Already Running");
      return;
    }

    setData([]);
    setWindowStart(null);
    sendDataToDevice(connectedDevice, "1112");
    setIsAlignmentRunning(true);
  };

  const stopAlignment = () => {
    if (!connectedDevice) {
      Alert.alert("Not Connected");
      return;
    }

    if (!isAlignmentRunning) {
      Alert.alert("Already Stopped");
      return;
    }

    Alert.alert("Stop Alignment?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop",
        style: "destructive",
        onPress: async () => {
          await sendDataToDevice(connectedDevice, "1113");
          setIsAlignmentRunning(false);
        },
      },
    ]);
  };

  const currentDate = new Date(lastX).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Main")}>
          <Ionicons name="arrow-back-outline" size={26} color="#003B7A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alignment Mode</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* TOP ROW */}
      <View style={styles.topRow}>
        <Text
          style={[
            styles.connectionText,
            connectedDevice ? styles.connected : styles.disconnected,
          ]}
        >
          {connectedDevice ? "● Connected" : "● Not Connected"}
        </Text>

        <Text style={styles.batteryText}>
          Battery: {connectedDevice ? `${batteryVal}%` : "--"}
        </Text>
      </View>

      {/* ALIGNMENT DISPLAY */}
      <Text style={styles.alignmentLabel}>Alignment</Text>
      <View style={styles.roundBox}>
        <Text style={styles.alignmentValue}>
          {Number.isFinite(latestAlignmentVal) ? latestAlignmentVal : "--"}
        </Text>
      </View>

      {/* GRAPH */}
      <View style={styles.chartContainer}>
        <Text style={styles.dateOverlay}>{currentDate}</Text>

        <VictoryChart
          scale={{ x: "time" }}
          domain={{ x: domainX, y: [yMin, yMax] }}
          padding={{ top: 30, bottom: 50, right: 20, left: 60 }}
          width={Dimensions.get("window").width - 10}
          height={420}
          theme={VictoryTheme.grayscale}
        >
          <VictoryAxis
            dependentAxis
            label="Alignment"
            style={{
              axisLabel: { padding: 40, fontSize: 20 },
              tickLabels: { fontSize: 14 },
            }}
          />
          <VictoryAxis
            tickFormat={(t) =>
              new Date(t).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          />

          <VictoryScatter data={safeData} size={3} />

          {/* ✅ latest point label */}
          {latestPoint && (
            <VictoryScatter
              data={[latestPoint]}
              size={6}
              style={{ data: { fill: "#007AFF" } }}
              labels={({ datum }) => `${datum.y}`}
              labelComponent={
                <VictoryLabel
                  dx={0}
                  dy={-16}
                  textAnchor="middle"
                  style={{
                    fontSize: 12,
                    fill: "black",
                    fontWeight: "bold",
                  }}
                  backgroundStyle={{
                    fill: "white",
                    stroke: "#007AFF",
                    strokeWidth: 1,
                  }}
                  backgroundPadding={{
                    top: 4,
                    bottom: 4,
                    left: 6,
                    right: 6,
                  }}
                />
              }
            />
          )}
        </VictoryChart>
      </View>

      {/* BUTTONS */}
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

      {/* LED */}
      <View style={styles.ledRow}>
        <Text style={styles.ledLabel}>
          {ledCenterMode ? "Center LED" : "All LEDs"}
        </Text>
        <Switch value={ledCenterMode} onValueChange={toggleLED} />
      </View>

      {/* ALIGNMENT STATUS */}
      <Text
        style={[
          styles.alignStatus,
          isAlignmentRunning ? styles.statusOn : styles.statusOff,
        ]}
      >
        {isAlignmentRunning ? "● Alignment ACTIVE" : "● Alignment STOPPED"}
      </Text>
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

  header: {
    width: "92%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#003B7A",
  },

  topRow: {
    width: "92%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  connectionText: {
    fontSize: 16,
    fontWeight: "700",
  },
  connected: { color: "green" },
  disconnected: { color: "red" },

  batteryText: {
    fontSize: 16,
    fontWeight: "600",
  },

  alignmentLabel: {
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
  alignmentValue: {
    fontSize: 42,
    fontWeight: "bold",
    textAlign: "center",
    color: "white",
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
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },

  ledRow: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
  },
  ledLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003B7A",
  },

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
  alignStatus: {
    marginTop: 12,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  
  statusOn: {
    color: "green",
  },
  
  statusOff: {
    color: "red",
  },
});