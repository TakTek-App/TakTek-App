import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Link, useRouter } from "expo-router";
import colors from "../../assets/colors/theme";
import { Ionicons } from "@expo/vector-icons";

const LoginScreen = () => {
  const { technician, signInTechnician } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const showModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  useEffect(() => {
    if (technician) {
      router.replace("/");
    }
  }, [technician]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInTechnician(email, password);
    } catch (err) {
      showModal("Error", "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === "ios" ? "padding": undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Sign In</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.main}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
            />
            <Text style={styles.technician}>For Technicians</Text>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your Email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="black"
                />
              </TouchableOpacity>
            </View>
            <Link
              href={{ pathname: `/auth/forgot-password` }}
              style={styles.passwordLink}
            >
              Forgot password?
            </Link>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?
              <Link
                href={{ pathname: `/auth/register` }}
                style={styles.footerLink}
              >
                {" "}
                Sign Up here
              </Link>
            </Text>
          </View>

          {/* Modal for alerts */}
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{modalContent.title}</Text>
                <Text style={styles.modalMessage}>{modalContent.message}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    height: 600,
    paddingBottom: Platform.OS === "ios" ? 0 : 30,
  },
  header: {
    width: "100%",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    alignItems: "center",
    padding: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: 500,
  },
  main: {
    width: "100%",
    alignItems: "center",
  },
  logo: {
    width: "70%",
    height: "40%",
    resizeMode: "contain",
    marginTop: 20,
  },
  technician: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 500,
    paddingBottom: 20
  },
  label: {
    width: "90%",
    fontSize: 17,
    color: colors.text,
    paddingTop: 8,
    paddingBottom: 5,
  },
  input: {
    height: 40,
    width: "90%",
    backgroundColor: "#fff",
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 10,
    marginBottom: 10,
    paddingLeft: 20,
    fontWeight: 500,
  },
  passwordContainer: {
    width: "100%",
    alignItems: "center",
  },
  eyeIcon: {
    position: "absolute",
    right: 30,
    top: 8,
  },
  passwordLink: {
    color: colors.primary,
    fontWeight: "bold",
    width: "90%",
    textAlign: "right",
    marginBottom: 20,
  },
  button: {
    display: "flex",
    width: "90%",
    backgroundColor: colors.primary,
    borderRadius: 50,
    padding: 10,
    alignItems: "center",
    textAlign: "center",
  },
  buttonDisabled: {
    backgroundColor: colors.text,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    padding: 20,
  },
  footerText: {
    fontSize: 16,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 500,
    color: "#000",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    color: "#000",
    textAlign: "center",
    marginBottom: 20,
    width: "90%",
  },
  modalButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 50,
    width: "90%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default LoginScreen;
