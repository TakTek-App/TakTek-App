import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import colors from "../../assets/colors/theme";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import Constants from "expo-constants";

const SUPPORT_COOLDOWN_KEY = "lastSupportEmail";
const DISABLE_DURATION = 180 * 60000;

const SupportScreen = () => {
  const { user } = useAuth();
  const [photo, setPhoto] = useState({ uri: user?.photo || "" });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });
  const [lastSentTimestamp, setLastSentTimestamp] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    const fetchLastSentTime = async () => {
      const storedTimestamp = await SecureStore.getItemAsync(SUPPORT_COOLDOWN_KEY);
      if (storedTimestamp) {
        setLastSentTimestamp(parseInt(storedTimestamp, 10));
      }
    };

    fetchLastSentTime();

    const interval = setInterval(() => {
      if (lastSentTimestamp) {
        const timePassed = Date.now() - lastSentTimestamp;
        const remaining = Math.max((DISABLE_DURATION - timePassed) / 1000, 0);
  
        // if (remaining > 0) console.log(Math.ceil(remaining));
  
        if (remaining <= 0) {
          setLastSentTimestamp(null);
          setTimeRemaining(null);
        } else {
          const seconds = Math.ceil(remaining);
          if (seconds >= 3600) {
            setTimeRemaining(`${Math.floor(seconds / 3600)} hour(s) remaining`);
          } else if (seconds >= 60) {
            setTimeRemaining(`${Math.floor(seconds / 60)} minute(s) remaining`);
          } else {
            setTimeRemaining(`${seconds} second(s) remaining`);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSentTimestamp]);

  const showModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  const canSubmit = () => {
    if (!lastSentTimestamp) return true;
    return Date.now() - lastSentTimestamp > DISABLE_DURATION;
  };

  const handleSupportSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      showModal("Error", "Both Subject and Message are required.");
      return;
    }

    if (!canSubmit()) return;

    setLoading(true);
    try {
      const response = await fetch(Constants.expoConfig?.extra?.expoPublic?.MAIL_SERVER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: user?.email,
          from: "tech@taktek.app",
          subject,
          text: message,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send support request.");
      }

      showModal("Success", "Your support request has been sent.");

      const timestamp = Date.now();
      setLastSentTimestamp(timestamp);
      await SecureStore.setItemAsync(SUPPORT_COOLDOWN_KEY, timestamp.toString());

      setSubject("");
      setMessage("");
    } catch (error) {
      showModal("Error", "Failed to send support request. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support</Text>
        <Link href="/(tabs)/profile" style={styles.headerLink}>
          <Image source={photo} style={styles.profileImage} />
        </Link>
      </View>

      {/* Chat Body */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.main}>
          <Text style={styles.mainTitle}>
            Please send us a detailed message of your issue, we will be in touch with you soon!
          </Text>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the subject"
            placeholderTextColor="#aaa"
            value={subject}
            onChangeText={setSubject}
          />
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Describe your issue"
            placeholderTextColor="#aaa"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[styles.button, !canSubmit() && styles.buttonDisabled]}
            onPress={handleSupportSubmit}
            disabled={!canSubmit() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {canSubmit() ? "Submit Request" : "Wait before sending another request"}
              </Text>
            )}
          </TouchableOpacity>
          {!canSubmit() && <Text style={styles.timeText}>{timeRemaining}</Text>}
        </View>
      </ScrollView>

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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "500",
  },
  headerLink: {
    position: "absolute",
    right: 15,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  main: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  mainTitle: {
    width: "95%",
    textAlign: "center",
    fontSize: 18,
    marginBottom: 12,
  },
  label: {
    width: "100%",
    fontSize: 17,
    color: colors.text,
    paddingTop: 8,
    paddingBottom: 5,
  },
  input: {
    height: 40,
    width: "100%",
    backgroundColor: "#fff",
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 10,
    marginBottom: 10,
    paddingLeft: 15,
    fontWeight: "500",
  },
  messageInput: {
    height: 100,
    textAlignVertical: "top",
    paddingVertical: 10,
  },
  button: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 50,
    padding: 10,
    alignItems: "center",
    textAlign: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: colors.text,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  timeText: {
    fontSize: 14,
    marginTop: 10,
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
    fontWeight: "500",
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

export default SupportScreen;