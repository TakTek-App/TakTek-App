import React, { useEffect, useState } from 'react';
import { SafeAreaView, TextInput, Text, StyleSheet, TouchableOpacity, View, Image, Modal, Alert, ScrollView, FlatList, SectionList } from 'react-native';
import Checkbox from 'expo-checkbox';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import colors from "../../assets/colors/theme";
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { technician, updateTechnician } = useAuth();
  const [firstName, setFirstName] = useState(technician?.firstName || '');
  const [lastName, setLastName] = useState(technician?.lastName || '');
  const [email, setEmail] = useState(technician?.email || '');
  const [company, ] = useState(technician?.company.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [photo, setPhoto] = useState({ uri: technician?.photo || '' });
  const [showPassword, setShowPassword] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [saveEnabled, setSaveEnabled] = useState(false);
  const { logOutTechnician } = useAuth();

  const categories = [
    { id: 1, name: 'Car' },
    { id: 2, name: 'Home' },
    { id: 3, name: 'Business' },
  ];

  const [services,] = useState(technician?.company.services);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(technician?.services.map(service => service.id) || []);
  console.log(selectedServiceIds)

  const selectedCategoryIds = services?.map(service => service.categoryId) || [];

  const servicesByCategory = categories
  .map((category) => {
    const servicesInCategory = technician?.company.services.filter(
      (service) => service.categoryId === category.id
    );
    if (servicesInCategory && servicesInCategory.length > 0) {
      return {
        title: category.name,
        data: servicesInCategory,
      };
    }
    return null;
  })
  .filter((section) => section !== null);

  const handleCheckboxToggle = (serviceId: number) => {
    setSelectedServiceIds((prevSelectedServiceIds) => {
      if (prevSelectedServiceIds.includes(serviceId)) {
        // If the service ID is already selected, remove it
        return prevSelectedServiceIds.filter((id) => id !== serviceId);
      } else {
        // If the service ID is not selected, add it
        return [...prevSelectedServiceIds, serviceId];
      }
    });
  };

  useEffect(() => {
    console.log("Selected service IDs:", selectedServiceIds);
    setSaveEnabled(true);
  }, [selectedServiceIds]);

  useEffect(() => {
    console.log("Logging technician from profile", technician?.jobs);
  }, [technician]);

  const handleSave = async () => {
    const updatedTechnician = {
      firstName,
      lastName,
      email,
    };
  
    try {
      await updateTechnician(updatedTechnician, selectedServiceIds);
      setModalContent({ title: 'Profile Updated', message: 'Your profile has been updated successfully.' });
      setModalVisible(true);
      setSaveEnabled(false);
    } catch (error) {
      console.error("Error updating user:", error);
      setModalContent({ title: 'Update Failed', message: 'There was an error updating your profile. Please try again.' });
      setModalVisible(true);
    }
  };

  // const handleChangePhoto = async () => {
  //   const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  //   if (permissionResult.granted === false) {
  //     alert("Permission to access camera roll is required!");
  //     return;
  //   }
  
  //   const result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //     allowsEditing: true,
  //     aspect: [1, 1],
  //     quality: 1,
  //   });
  
  //   if (!result.canceled) {
  //     setPhoto({ uri: result.assets[0].uri });
  //     setSaveEnabled(true);
  //   }
  // };

  const handleLogout = async () => {
    try {
    await logOutTechnician();
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const handleChange = () => {
    if (firstName !== technician?.firstName || lastName !== technician.lastName || email !== technician.email) {
      setSaveEnabled(true);
    } else {
      setSaveEnabled(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <View style={styles.main}>
                {/* Profile Picture */}
                <Image source={photo} style={styles.profileImage} />
                {/* <TouchableOpacity>
                    <Text style={styles.changePhoto}>Change photo</Text>
                </TouchableOpacity> */}

                {/* Editable Fields */}
                <Text style={styles.label}>First Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your first name"
                    value={firstName}
                    onChangeText={text => { setFirstName(text); handleChange(); }}
                />

                <Text style={styles.label}>Last Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your last name"
                    value={lastName}
                    onChangeText={text => { setLastName(text); handleChange(); }}
                />

                <Text style={styles.label}>Services</Text>
                <View style={styles.services}>
                  {categories.map((category) => (
                    <View key={category.id} style={styles.item}>
                      <Checkbox
                        value={selectedCategoryIds.includes(category.id)}
                        style={styles.checkbox}
                        color={colors.primary}
                      />
                      <Text style={styles.serviceLabel}>{category.name}</Text>
                    </View>
                  ))}
                </View>

                <SectionList
                  style={styles.sectionList}
                  scrollEnabled={false}
                  sections={servicesByCategory}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.sectionItem}>
                      <Checkbox
                        value={selectedServiceIds.includes(item.id)}
                        onValueChange={() => handleCheckboxToggle(item.id)}
                        style={styles.sectionCheckbox}
                        color={colors.primary}
                      />
                      <Text style={styles.sectionLabel}>{item.name}</Text>
                    </View>
                  )}
                  renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>{title}</Text>
                    </View>
                  )}
                />

                <Text style={styles.label}>Company</Text>
                <TextInput
                    editable={false}
                    style={styles.disabledInput}
                    placeholder="Enter your company Id"
                    value={company}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                    editable={false}
                    style={styles.disabledInput}
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={text => { setEmail(text); handleChange(); }}
                    keyboardType="email-address"
                />

                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                    <TextInput
                        editable={false}
                        style={styles.disabledInput}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChangeText={text => { setNewPassword(text); handleChange(); }}
                        secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                        onPress={() => setShowPassword(prev => !prev)}
                        style={styles.eyeIcon}
                    >
                        <Ionicons
                            name={showPassword ? "eye-off" : "eye"}
                            size={24}
                            color="black"
                        />
                    </TouchableOpacity>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: saveEnabled ? colors.primary : '#aaa' }]}
                    onPress={handleSave}
                    disabled={!saveEnabled}
                >
                    <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>

                {/* Log Out Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Image 
                      source={require("../../assets/icons/SignOut.png")}
                      style={styles.logoutIcon}
                    />
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
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
    backgroundColor: '#fff',
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
    fontWeight: '500',
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 30,
  },
  main: {
    width: "100%",
    alignItems: "center",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  changePhoto: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 500,
    marginBottom: 20,
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
    width: '90%',
    backgroundColor: '#fff',
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 10,
    marginBottom: 10,
    paddingLeft: 20,
    fontWeight: '500',
  },
  disabledInput: {
    height: 40,
    width: '90%',
    backgroundColor: colors.border,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 10,
    marginBottom: 10,
    paddingLeft: 20,
    fontWeight: '500',
  },
  services: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 50,
  },
  checkbox: {
    marginTop: 20,
    width: 30,
    height: 30,
    borderRadius: 5
  },
  item: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  serviceLabel: {
    marginTop: 4,
    fontSize: 16,
  },
  sectionList: {
    width: "90%",
    marginBottom: 20,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 18,
    color: colors.text,
  },
  sectionCheckbox: {
    width: 30,
    height: 30,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  sectionItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    color: colors.text,
  },
  passwordContainer: {
    width: '100%',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 40,
    top: 8,
  },
  button: {
    display: 'flex',
    width: '90%',
    backgroundColor: colors.primary,
    borderRadius: 50,
    padding: 10,
    alignItems: 'center',
    textAlign: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    width: '90%',
    backgroundColor: '#ca1f2d',
    borderRadius: 50,
    padding: 10,
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
    marginTop: 20,
  },
  logoutIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    tintColor: "#fff"
  },
  logoutButtonText: {
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

export default ProfileScreen;