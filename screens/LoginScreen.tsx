import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export default function LoginScreen({ navigation }: any) {
  const [patientName, setPatientName] = useState("");
  const [investigatorName, setInvestigatorName] = useState("");
  const [clinicalSite, setClinicalSite] = useState("");
  const [dayNumber, setDayNumber] = useState("");

  const handleSignIn = () => {
    navigation.replace("Main");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Logo */}
      <Image
        source={require("../Images/logo.jpg")}
        style={styles.logo}
      />

      <Text style={styles.title}>Biorasis Clinical Session</Text>
      <Text style={styles.subtitle}>Enter patient details to continue</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Patient (Name/ID)"
          value={patientName}
          onChangeText={setPatientName}
        />

        <TextInput
          style={styles.input}
          placeholder="Investigator"
          value={investigatorName}
          onChangeText={setInvestigatorName}
        />

        <TextInput
          style={styles.input}
          placeholder="Clinical Site"
          value={clinicalSite}
          onChangeText={setClinicalSite}
        />

        <TextInput
          style={styles.input}
          placeholder="Day Number"
          value={dayNumber}
          onChangeText={setDayNumber}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7F2FF", // soft clinical light blue
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  logo: {
    width: 160,
    height: 52,
    resizeMode: "contain",
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#003B7A", // clinical navy
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#4E6E94",
    marginBottom: 28,
  },
  form: {
    width: "100%",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    height: 54,
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    borderWidth: 1.8,
    borderColor: "#A9CCF8", // soft border
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  button: {
    width: "100%",
    height: 52,
    backgroundColor: "#4FA4FF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
});