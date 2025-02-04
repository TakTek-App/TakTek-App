import React, { useState } from 'react';
import { SafeAreaView, TextInput, Text, StyleSheet, TouchableOpacity, View, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import colors from "../../assets/colors/theme";
import { Ionicons } from '@expo/vector-icons';

const ForgotPasswordScreen = () => {
    const [email, setEmail] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', message: '' });
    const router = useRouter();

    const showModal = (title: string, message: string) => {
        setModalContent({ title, message });
        setModalVisible(true);
    };

    const handleForgotPassword = () => {
        if (!email) {
            showModal('Error', 'Please enter your email address!');
            return;
        }

        // Handle forgot password logic here (e.g., send email)
        showModal('Email sent', 'Password reset link has been sent to your email.');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>
            <View style={styles.main}>
                <Image source={require("../../assets/images/logo.png")} style={styles.logo} />
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.description}>
                    We will send a password reset link to your email address.
                </Text>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#aaa"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                />
                <TouchableOpacity style={styles.button} onPress={handleForgotPassword}>
                    <Text style={styles.buttonText}>Send</Text>
                </TouchableOpacity>
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        width: "100%",
        borderBottomColor: "#eee",
        borderBottomWidth: 1,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 5,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "#fff",
        shadowColor: '#aaa',
        shadowOffset: { width: 0, height: -20 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
    },
    main: {
        flex: 1,
        width: "100%",
        alignItems: 'center',
    },
    logo: {
        width: "70%",
        height: "40%",
        resizeMode: 'contain',
        marginVertical: 20,
    },
    title: {
        width: "90%",
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: "left",
    },
    description: {
        width: "90%",
        fontSize: 15,
        textAlign: 'left',
        marginBottom: 20,
        fontWeight: 500,
    },
    label: {
        width: "90%",
        fontSize: 17,
        color: colors.text,
        marginBottom: 5,
    },
    input: {
        height: 40,
        width: '90%',
        backgroundColor: '#fff',
        borderColor: colors.primary,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingLeft: 20,
        marginBottom: 20,
    },
    button: {
        width: '90%',
        backgroundColor: colors.primary,
        borderRadius: 50,
        padding: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 15,
        paddingVertical: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 500,
        color: '#000',
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 15,
        color: '#000',
        textAlign: 'center',
        marginBottom: 20,
        width: "90%",
    },
    modalButton: {
        backgroundColor: colors.primary,
        padding: 10,
        borderRadius: 50,
        width: '90%',
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default ForgotPasswordScreen;
