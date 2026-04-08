import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";

import { useBLEContext } from "../BLEContext";
import DeviceModal from "../DeviceConnectionModal";

export default function DeviceConnectionScreen({ navigation }) {
  const {
    requestPermissions,
    scanForPeripherals,
    allDevices,
    connectToDevice,
    connectedDevice,
  } = useBLEContext();

  const [modalVisible, setModalVisible] = useState(false);

  const openDeviceModal = async () => {
    const ok = await requestPermissions();

    if (!ok) {
      Alert.alert(
        "Permissions Required",
        "Bluetooth permissions are required to scan for devices."
      );
      return;
    }

    scanForPeripherals();
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Image source={require("../Images/logo.jpg")} style={styles.logo} />

      <Text style={styles.title}>Connect Your Device</Text>
      <Text style={styles.subtitle}>
        Turn on your Proximity Communicator and connect it before continuing.
      </Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>
          {connectedDevice
            ? `✅ Connected to ${connectedDevice.name || "Device"}`
            : "❌ No device connected"}
        </Text>
      </View>

      <TouchableOpacity style={styles.scanButton} onPress={openDeviceModal}>
        <Text style={styles.scanButtonText}>
          {connectedDevice ? "Change Device" : "Scan for Devices"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.continueButton,
          !connectedDevice && styles.buttonDisabled,
        ]}
        disabled={!connectedDevice}
        onPress={() => navigation.replace("Alignment")}
      >
        <Text style={styles.continueButtonText}>Continue to Alignment</Text>
      </TouchableOpacity>

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
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logo: {
    width: 120,
    height: 40,
    resizeMode: "contain",
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#003B7A",
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },

  statusBox: {
    width: "100%",
    backgroundColor: "#EAF4FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003B7A",
    textAlign: "center",
  },

  scanButton: {
    width: "100%",
    backgroundColor: "lightblue",
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 14,
  },

  scanButtonText: {
    textAlign: "center",
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },

  continueButton: {
    width: "100%",
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 10,
  },

  continueButtonText: {
    textAlign: "center",
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },

  buttonDisabled: {
    opacity: 0.5,
  },
});