import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useBLEContext } from "../BLEContext";

export default function SettingsScreen() {
  const { connectedDevice } = useBLEContext();
  const navigation = useNavigation();

  // BLE Commands
  const AllLED = "1114";
  const CenterLED = "1115";

  // Profile Editing State
  const [isEditing, setIsEditing] = useState(false);

  // Patient Info State
  const [patientName, setPatientName] = useState("");
  const [investigatorName, setInvestigatorName] = useState("");
  const [clinicalSite, setClinicalSite] = useState("");
  const [dayNumber, setDayNumber] = useState("");

  // LED State
  const [ledCenterMode, setLedCenterMode] = useState(false);

  const { sendDataToDevice } = useBLEContext();

  const toggleLED = () => {
    setLedCenterMode(!ledCenterMode);

    if (!connectedDevice) return;

    sendDataToDevice(
      connectedDevice,
      ledCenterMode ? AllLED : CenterLED
    );
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image source={require("../Images/logo.jpg")} style={styles.logo} />

      {/* Title */}
      <Text style={styles.title}>Settings</Text>

      {/* ---------------- Patient Information ---------------- */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Patient Information</Text>

        {/* EDIT / SAVE BUTTON */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            if (isEditing) {
              console.log("Profile saved:", {
                patientName,
                investigatorName,
                clinicalSite,
                dayNumber,
              });
            }
            setIsEditing(!isEditing);
          }}
        >
          <Ionicons
            name={isEditing ? "save-outline" : "create-outline"}
            size={18}
            color="white"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.editButtonText}>
            {isEditing ? "Save Profile" : "Edit Profile"}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, !isEditing && styles.disabledInput]}
          placeholder="Patient Name / ID"
          value={patientName}
          onChangeText={setPatientName}
          editable={isEditing}
        />

        <TextInput
          style={[styles.input, !isEditing && styles.disabledInput]}
          placeholder="Investigator Name"
          value={investigatorName}
          onChangeText={setInvestigatorName}
          editable={isEditing}
        />

        <TextInput
          style={[styles.input, !isEditing && styles.disabledInput]}
          placeholder="Clinical Site"
          value={clinicalSite}
          onChangeText={setClinicalSite}
          editable={isEditing}
        />

        <TextInput
          style={[styles.input, !isEditing && styles.disabledInput]}
          placeholder="Day Number"
          value={dayNumber}
          onChangeText={setDayNumber}
          editable={isEditing}
        />
      </View>

      {/* ---------------- Alignment Controls ---------------- */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Alignment Controls</Text>

        {/* OPEN ALIGNMENT SCREEN BUTTON */}
        <TouchableOpacity
          style={styles.fullWidthButton}
          onPress={() => navigation.navigate("Alignment")}
        >
          <Ionicons
            name="compass-outline"
            size={22}
            color="white"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.fullWidthButtonText}>Open Alignment Mode</Text>
        </TouchableOpacity>

        {/* LED Toggle */}
        <View style={[styles.ledRow, { marginTop: 18 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="bulb-outline"
              size={22}
              color="#003B7A"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.ledLabel}>
              {ledCenterMode ? "Center LED" : "All LEDs"}
            </Text>
          </View>

          <Switch value={ledCenterMode} onValueChange={toggleLED} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full screen
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 10,
    alignItems: "center",
  },

  // Logo
  logo: {
    width: 120,
    height: 38,
    resizeMode: "contain",
    marginBottom: 6,
  },

  // Title
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#003B7A",
    marginBottom: 10,
  },

  // Section Boxes
  sectionBox: {
    width: "92%",
    backgroundColor: "#E2F1FF",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#003B7A",
    marginBottom: 10,
  },

  // Profile Inputs
  input: {
    backgroundColor: "white",
    borderColor: "#A9CCF8",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    fontSize: 16,
  },

  disabledInput: {
    opacity: 0.5,
  },

  // Edit Button
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    marginBottom: 12,
  },
  editButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },

  // Full-width Alignment Button
  fullWidthButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: "center",
    marginTop: 10,
  },
  fullWidthButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  // LED
  ledRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  ledLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003B7A",
  },
});
