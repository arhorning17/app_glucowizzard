import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, Alert } from "react-native";
import { VictoryChart, VictoryScatter, VictoryAxis, VictoryTheme, VictoryLabel } from "victory-native";
import { Picker } from "@react-native-picker/picker";
import { readDataFromDB, clearDatabase, exportDataToCSV } from "../src/database";
import { Ionicons } from "@expo/vector-icons";
import Share from "react-native-share";
import RNFS from "react-native-fs";

export default function HistoryScreen() {
  const [data, setData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    loadHistory();
  }, [timeRange]);

  const loadHistory = () => {
    readDataFromDB((rows) => {
      if (!rows) return;

      const now = Date.now();
      const cutoff = now - timeRange * 60 * 60 * 1000;

      const formatted = rows
        .map((r: any) => ({
          x: new Date(r.time).getTime(),
          y: Number(r.glucoseLevel),
        }))
        .filter((p) => p.x >= cutoff);

      setData(formatted);
    });
  };

  // Export CSV
  const handleExport = async () => {
    try {
      const filePath = await exportDataToCSV();
      const exists = await RNFS.exists(filePath);
      if (!exists) throw new Error("File error");

      let sharePath = filePath;
      if (Platform.OS === "android") {
        const destPath = `${RNFS.CachesDirectoryPath}/glucose_export.csv`;
        await RNFS.copyFile(filePath, destPath);
        sharePath = `file://${destPath}`;
      }

      await Share.open({
        title: "Share Glucose Data",
        url: sharePath,
        type: "text/csv",
      });
    } catch (err) {
      Alert.alert("Export Failed", "Could not export glucose data.");
    }
  };

  // Clear DB
  const handleClear = () =>
    Alert.alert("Confirm", "Clear all stored glucose data?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => clearDatabase(() => {}, () => {}),
      },
    ]);

  const safeData = data.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const lastX = safeData.length ? safeData[safeData.length - 1].x : Date.now();
  const WINDOW_MS = timeRange * 60 * 60 * 1000;
  const domainX: [number, number] = [lastX - WINDOW_MS, lastX];

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image source={require("../Images/logo.jpg")} style={styles.logo} />

      <Text style={styles.title}>Glucose History</Text>

      {/* Dropdown */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>Show past:</Text>
        <Picker selectedValue={timeRange} style={styles.picker} onValueChange={setTimeRange}>
          <Picker.Item label="6 hours" value={6} />
          <Picker.Item label="12 hours" value={12} />
          <Picker.Item label="24 hours" value={24} />
          <Picker.Item label="48 hours" value={48} />
        </Picker>
      </View>

      {/* Graph */}
      <View style={styles.chartContainer}>
        <VictoryChart
          scale={{ x: "time" }}
          domain={{ x: domainX, y: [0, 500] }}
          padding={{ top: 30, bottom: 50, right: 20, left: 70 }}
          width={Dimensions.get("window").width - 10}
          height={450}
          theme={VictoryTheme.grayscale}
        >
          <VictoryAxis
            dependentAxis
            label="Frequency (Hz)"
            axisLabelComponent={<VictoryLabel dy={3} />}
            style={{
              axisLabel: { padding: 50, fontSize: 16, fill: "black" },
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
            style={{ tickLabels: { fontSize: 12 } }}
          />

          <VictoryScatter size={3} style={{ data: { fill: "#8b0000" } }} data={safeData} />
        </VictoryChart>
      </View>

      {/* 📦 Data Management Section (MOVED FROM SETTINGS) */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Ionicons name="download-outline" size={20} color="white" style={styles.exportIcon} />
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.redButton} onPress={handleClear}>
          <Ionicons name="trash-outline" size={20} color="white" style={styles.icon} />
          <Text style={styles.redButtonText}>Clear Database</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", alignItems: "center", paddingTop: 10 },
  logo: { width: 120, height: 38, resizeMode: "contain", marginBottom: 6 },
  title: { fontSize: 26, fontWeight: "700", color: "#003B7A", marginBottom: 6 },

  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#A9CCF8",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  dropdownLabel: { fontSize: 16, fontWeight: "600", color: "#003B7A", marginRight: 6 },
  picker: { width: 160, height: 42 },

  chartContainer: { marginTop: 10, backgroundColor: "lightblue", borderRadius: 8 },

  /* --- NEW SECTION BOX + BUTTON STYLES MOVED FROM SETTINGS --- */
  sectionBox: {
    width: "92%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginTop: 50,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#003B7A",
    marginBottom: 10,
  },
  exportButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  exportIcon: { marginRight: 8 },
  exportButtonText: { color: "white", fontWeight: "700", fontSize: 16 },

  redButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
    justifyContent: "center",
  },
  redButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  icon: { marginRight: 6 },
});
