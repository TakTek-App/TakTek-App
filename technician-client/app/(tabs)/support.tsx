import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import colors from '../../assets/colors/theme';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const messages = [
    {
        id: '1',
        sender: 'support',
        message: 'Hello! How can we assist you today?',
        time: '10:00 AM',
    },
    {
        id: '2',
        sender: 'user',
        message: 'I need help with a recent order.',
        time: '10:02 AM',
    },
    {
        id: '3',
        sender: 'support',
        message: 'Sure, could you please provide more details?',
        time: '10:03 AM',
    },
];

const SupportScreen = () => {
    const { technician } = useAuth();
    const [chatMessages, setChatMessages] = useState(messages);
    const [inputMessage, setInputMessage] = useState('');
    const [ photo, setPhoto ] = useState({ uri: technician?.photo || '' })
    const [modalVisible, setModalVisible] = useState(true);
    const [modalContent, setModalContent] = useState({ title: 'Support is not available', message: 'We are working on it' });

    const router = useRouter();

    const handleSend = () => {
        if (inputMessage.trim() === '') return;

        const newMessage = {
            id: `${chatMessages.length + 1}`,
            sender: 'user',
            message: inputMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setChatMessages([...chatMessages, newMessage]);
        setInputMessage('');
    };

    const showModal = (title: string, message: string) => {
      setModalContent({ title, message });
      setModalVisible(true);
    };

    useEffect(()=> {
      showModal('Support is not available', 'We are working on it')
    }, [])

    return (
      <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
              <Text style={styles.headerTitle}>Support</Text>
              <Link href="/(tabs)/profile" style={styles.headerLink}>
                  <Image
                      source={photo}
                      style={styles.profileImage}
                  />
              </Link>
          </View>

          {/* Chat Body */}
          <ScrollView contentContainerStyle={styles.chatContainer}>
          {chatMessages.map((msg) => (
            <View
                key={msg.id}
                style={[
                    styles.messageRow,
                    msg.sender === 'user' ? styles.userRow : styles.supportRow,
                ]}
            >
                {/* Support Image */}
                {msg.sender === 'support' && (
                    <Image
                        source={require('../../assets/images/logo.png')} // Replace with your support image
                        style={styles.messageImage}
                    />
                )}

                {/* Message Content */}
                <View style={styles.messageCol}>
                    {msg.sender === 'support' && (
                        <Text style={styles.supportTitle}>TakTek Support</Text>
                    )}
                    <View
                        style={[
                            styles.messageContent,
                            msg.sender === 'user' ? styles.userContent : styles.supportContent,
                        ]}
                    >
                        <Text style={[styles.messageText, msg.sender === 'user' && styles.userText]}>{msg.message}</Text>
                    </View>
                    <Text
                        style={[
                            styles.messageTime,
                            msg.sender === 'user' ? styles.userTime : styles.supportTime,
                        ]}
                    >
                        {msg.time}
                    </Text>
                </View>

                {/* User Image */}
                {msg.sender === 'user' && (
                    <Image
                        source={require('../../assets/images/logo.png')} // Replace with your user image
                        style={styles.messageImage}
                    />
                )}
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
            <TextInput
                style={styles.textInput}
                placeholder="Type message"
                placeholderTextColor={colors.border}
                value={inputMessage}
                onChangeText={setInputMessage}
            />
            <TouchableOpacity style={styles.micButton}>
                <Image
                    source={require('../../assets/icons/Mic.png')}
                />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                <Image
                    source={require('../../assets/icons/Send.png')}
                />
            </TouchableOpacity>
        </View>

        {/* Modal for alerts */}
        <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => router.replace("/")}
        >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{modalContent.title}</Text>
                  <Text style={styles.modalMessage}>{modalContent.message}</Text>
                  <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => router.replace("/")}
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
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '500',
  },
  headerLink: {
    position: 'absolute',
    right: 15,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContainer: {
    padding: 15,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  supportRow: {
    justifyContent: 'flex-start',
  },
  messageImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  messageCol: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  messageContent: {
    padding: 10,
    borderRadius: 10,
  },
  userContent: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 0,
  },
  supportContent: {
    backgroundColor: colors.lightBlue,
    borderTopLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: "#fff"
  },
  messageTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  userTime: {
    textAlign: 'left',
  },
  supportTime: {
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  textInput: {
    flex: 1,
    height: 50,
    width: '90%',
    backgroundColor: colors.lightBlue,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 15,
    marginBottom: 10,
    paddingLeft: 60,
    fontWeight: '500',
  },
  micButton: {
    position: "absolute",
    width: 30,
    height: 30,
    left: 20,
    top: 22,
  },
  sendButton: {
    position: "absolute",
    width: 30,
    height: 30,
    right: 10,
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

export default SupportScreen;