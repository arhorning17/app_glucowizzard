import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function TermsScreen({ navigation }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <View style={styles.container}>
      {/* TITLE */}
      <Text style={styles.title}>Terms & Conditions</Text>

      {/* TERMS CONTENT */}
      <ScrollView style={styles.termsBox}>
        <Text style={styles.termsText}>
          By using this app, you agree to the following terms:
          {"\n\n"}
          • This app is for informational purposes only and does not provide medical advice.
          {"\n\n"}
          • Always consult a healthcare professional before making decisions based on data from this app.
          {"\n\n"}
          • You are responsible for ensuring your device is properly connected and functioning.
          {"\n\n"}
          • We are not liable for any damages, data loss, or misuse of the application.
          {"\n\n"}
          • Your data may be stored locally on your device for functionality.
          {"\n\n"}
          By continuing, you acknowledge that you have read and agree to these terms.
        </Text>
      </ScrollView>

      {/* AGREE BUTTON */}
      <TouchableOpacity
        style={[
          styles.agreeButton,
          agreed && styles.agreeButtonActive,
        ]}
        onPress={() => setAgreed(!agreed)}
      >
        <Text style={styles.agreeText}>
          {agreed
            ? "✓ I agree to the Terms & Conditions"
            : "I agree to the Terms & Conditions"}
        </Text>
      </TouchableOpacity>

      {/* CONTINUE BUTTON */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          !agreed && styles.disabled,
        ]}
        disabled={!agreed}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 24,
    justifyContent: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#003B7A",
    textAlign: "center",
    marginBottom: 20,
  },

  termsBox: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: "#cfd8e3",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f8fbff",
    marginBottom: 20,
  },

  termsText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },

  agreeButton: {
    backgroundColor: "#dbeeff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },

  agreeButtonActive: {
    backgroundColor: "#8fd3ff",
  },

  agreeText: {
    textAlign: "center",
    fontWeight: "600",
    color: "#003B7A",
  },

  continueButton: {
    backgroundColor: "#4db8ff",
    padding: 16,
    borderRadius: 12,
  },

  continueText: {
    textAlign: "center",
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },

  disabled: {
    opacity: 0.5,
  },
});