import React, { useState } from "react";
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
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Link, useRouter } from "expo-router";
import colors from "../../assets/colors/theme";
import { Ionicons } from "@expo/vector-icons";

const RegisterScreen = () => {
  const { signUpUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });
  const [loading, setLoading] = useState(false);

  const showModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  const handleRegister = async () => {
    if (!firstName || !/^[A-Za-z]+$/.test(firstName)) {
      showModal(
        "Error",
        "First name is required and should only contain letters."
      );
      return;
    }

    if (!lastName || !/^[A-Za-z]+$/.test(lastName)) {
      showModal(
        "Error",
        "Last name is required and should only contain letters."
      );
      return;
    }

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      showModal("Error", "Please enter a valid email address.");
      return;
    }

    if (!phone || !/^\d{10}$/.test(phone)) {
      showModal("Error", "Please enter a valid 10-digit phone number.");
      return;
    }

    if (
      !password ||
      password.length < 8 ||
      !/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)
    ) {
      showModal(
        "Error",
        "Password must be at least 8 characters long, with a mix of letters, numbers, and symbols."
      );
      return;
    }

    if (password !== confirmPassword) {
      showModal("Error", "Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      await signUpUser(firstName, lastName, email, phone, password);
      showModal(
        "Verify your Email",
        "We have sent an email with a verification link to your email."
      );
    } catch (error) {
      showModal("Error", (error as any).message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Register</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.main}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
          />

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your first name"
            placeholderTextColor="#aaa"
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your last name"
            placeholderTextColor="#aaa"
            value={lastName}
            onChangeText={setLastName}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            placeholderTextColor="#aaa"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
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

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#aaa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={24}
                color="black"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?
            <Link href="/auth/login" style={styles.footerLink}>
              {" "}
              Sign In here
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    width: "100%",
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    alignItems: "center",
    padding: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: 500,
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: "center",
    height: 900,
  },
  main: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  logo: {
    width: "50%",
    height: "20%",
    resizeMode: "contain",
    marginVertical: 20,
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
    right: 40,
    top: 8,
  },
  button: {
    display: "flex",
    width: "90%",
    backgroundColor: colors.primary,
    borderRadius: 50,
    padding: 10,
    alignItems: "center",
    textAlign: "center",
    marginTop: 20,
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

export default RegisterScreen;
