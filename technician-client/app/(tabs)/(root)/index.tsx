import { useAuth } from '@/app/context/AuthContext';
import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import colors from "../../../assets/colors/theme";
import * as Location from "expo-location";
import { useRouter } from 'expo-router';
import SwitchToggle from 'react-native-switch-toggle';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocket } from '@/app/context/SocketContext';
import { useClient } from '@/app/context/ClientContext';
import { useCoords } from '@/app/context/CoordsContext';

interface Coords {
  latitude: number;
  longitude: number;
}

interface Client {
  id: number;
  role: string;
  firstName: string;
  lastName: string;
  socketId: string;
  photo: string;
  address: string;
  location: Coords | null;
  serviceName: string;
}

const Main = () => {
  const { technician, loading } = useAuth();
  const [available, setAvailable] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [clients, setClients] = useState<Client[]>([]); //
  const [requestingClient, setRequestingClient] = useState<Client>();
  const [rating, setRating] = useState(5);
  
  const {client, setClient} = useClient();
  const { setCoords } = useCoords();

  const { socket } = useSocket();
  const socketPeer = {
    id: technician?.id,
    role: "technician",
    firstName: technician?.firstName,
    lastName: technician?.lastName,
    socketId: technician?.email,
    photo: technician?.photo,
    available: false,
    company: technician?.company.name,
    rating: technician?.rating,
    services: technician?.services.map((service) => service.id)
  }
  const currentOrder = {
    address: '123 Main St',
    serviceType: 'Plumbing',
    clientName: 'John Doe',
    clientPhoto: 'https://plus.unsplash.com/premium_photo-1689530775582-83b8abdb5020?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  }
  // const currentOrder = null
  const router = useRouter();

  // Random location generator

  const baseLocation = { latitude: 6.207326920022623, longitude: -75.57076466673648 };

  const generateRandomLocation = () => {
    const radiusInKm = 1;
    const earthRadiusInKm = 6371;

    const randomOffset = () => (Math.random() - 0.5) * 2; // Random value between -1 and 1

    const latOffset = (radiusInKm / earthRadiusInKm) * (180 / Math.PI);
    const lngOffset = latOffset / Math.cos((baseLocation.latitude * Math.PI) / 180);

    const newLat = baseLocation.latitude + randomOffset() * latOffset;
    const newLng = baseLocation.longitude + randomOffset() * lngOffset;

    return { latitude: parseFloat(newLat.toFixed(6)), longitude: parseFloat(newLng.toFixed(6)) };
  };

  const sendRandomLocation = () => {
    const randomLocation = generateRandomLocation();
    setCoords(randomLocation);
    socket?.emit("send-location", randomLocation);
  };

  // /Random location generator

  const showModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  useEffect(() => {
    if (!loading) {
      if (!technician) {
        router.replace("/auth/login");
      } else {
        // console.log("Logging technician from index", technician);
      }
    }
  }, [technician, loading]);

  // useEffect(() => {
  //   const requestPermissions = async () => {
  //     const { status } = await Location.requestForegroundPermissionsAsync();
  //     if (status !== 'granted') {
  //       console.log('Permission to access location was denied');
  //       return false;
  //     }
  //     return true;
  //   };

  //   const startLocationTracking = async () => {
  //     const hasPermission = await requestPermissions();
  //     if (!hasPermission) return;
    
  //     Location.watchPositionAsync(
  //       {
  //         accuracy: Location.Accuracy.High,
  //         timeInterval: 5000, // Update every 5 seconds
  //         distanceInterval: 10, // Update every 10 meters
  //       },
  //       (location) => {
  //         const { latitude, longitude } = location.coords;
  //         socket?.emit('send-location', { latitude, longitude });
  //         console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
  //       }
  //     );
  //   };

  //   startLocationTracking();
  // }, []);

  useEffect(() => { //
    if (!socket) return;
    socket?.emit("register", socketPeer);
    console.log("Registered as technician:", socketPeer.socketId);

    sendRandomLocation();
    const interval = setInterval(sendRandomLocation, 3000);

    socket?.on("peer-list", (clients: Client[]) => { //
      setClients(clients);
      console.log("clients", clients)
    });

    socket?.on("hire-request", (clientData) => {
      setRequestingClient(clientData);
      console.log(clientData)
      setAlertVisible(true);
    });

    socket?.on("service-cancelled", ({ message }) => {
      console.log(message)
      showModal("Service Cancelled", message);
      setClient(null);
    });

    socket?.on("service-ended", () => {
      handleReview();
      setClient(null);
    });

    return () => {
      socket?.off("hire-request");
      socket?.off("service-cancelled");
      socket?.off("service-ended");
      clearInterval(interval);
      socket?.disconnect();
    };
  }, [technician]);

  const toggleAvailability = () => {
    if (!client) {
      setAvailable(!available);
      socket?.emit("toggle-availability", !available);
    }
  };

  const acceptRequest = () => {
    setAlertVisible(false);
    socket?.emit("hire-response", {
      response: "accept",
      clientId: requestingClient?.socketId,
      technicianId: socketPeer.socketId,
    });
    if (requestingClient) {
      setClient(requestingClient);
    }
  }

  const rejectRequest = () => {
    setAlertVisible(false);
    socket?.emit("hire-response", {
      response: "reject",
      clientId: requestingClient?.socketId,
      technicianId: socketPeer.socketId,
    });
  }

  const handleRate = (value: number) => {
    setRating(value);
  };

  const showReviewModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setReviewModalVisible(true);
  };

  const handleReview = async() => {
    showReviewModal("Order Completed", `Customer review`)
  };

  const openMap = () => {
    router.push("/(tabs)/(root)/contact/map")
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Hey, {technician?.firstName}!</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Your Rating</Text>
          <Text style={styles.statValue}>{technician?.rating.toFixed(1)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Completed Orders</Text>
          <Text style={styles.statValue}>{technician?.jobs.length}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available for work?</Text>
        <View style={styles.availableContainer}>
          <SwitchToggle
            switchOn={available}
            onPress={toggleAvailability}
            circleColorOff="#fff"
            circleColorOn="#fff"
            backgroundColorOn={colors.accentGreen}
            backgroundColorOff={colors.red}
            containerStyle={styles.toggleContainer}
            circleStyle={styles.toggleCircle}
          />
          
        <Text style={styles.available}>{available ? 'Available' : 'Busy'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order in Progress</Text>
        {client ? (
          <View style={styles.orderCard}>
            <View style={styles.orderBody}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.orderContent}>{client.address}</Text>
              <Text style={styles.label}>Type of work</Text>
              <Text style={styles.orderContent}>{client.serviceName}</Text>
              <Text style={styles.label}>Client</Text>
              <View style={styles.clientContainer}>
                  <Image source={{ uri: client.photo }} style={styles.clientPhoto} />
                  <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.firstName} {client.lastName}</Text>
                  </View>
              </View>
              <TouchableOpacity style={styles.callButton}>
                <Image source={require("../../../assets/icons/phone.png")} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Call {client.firstName}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapButton} onPress={openMap}>
                <Image source={require("../../../assets/icons/map.png")} style={styles.buttonIcon} />
                <Text style={styles.mapButtonText}>Switch to Map</Text>
              </TouchableOpacity>
            </View>
          </View>          
        ) : (
          <Text style={styles.noOrders}>No orders in progress.</Text>
        )}
      </View>

      <Modal
          visible={alertVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAlertVisible(false)}
      >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Order</Text>
            <View style={styles.orderBody}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.orderContent}>{requestingClient?.address}</Text>
              <Text style={styles.label}>Type of work</Text>
              <Text style={styles.orderContent}>{requestingClient?.serviceName}</Text>
              <Text style={styles.label}>Client</Text>
              <View style={styles.clientContainer}>
                <Image source={{ uri: requestingClient?.photo }} style={styles.clientPhoto} />
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{requestingClient?.firstName} {requestingClient?.lastName}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callButton} onPress={acceptRequest}>
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectButton}  onPress={rejectRequest}>
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{modalContent.title}</Text>
                <Text style={styles.modalMessage}>{modalContent.message}</Text>
                <View style={styles.reviewStarsContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity key={value} onPress={() => handleRate(value)}>
                    <Image
                      source={require('@/assets/icons/Rate_Star.png')}
                      style={[styles.reviewStar, value > rating && styles.staro]}
                      />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.orderBody}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.orderContent}>{client?.address}</Text>
                <Text style={styles.label}>Type of work</Text>
                <Text style={styles.orderContent}>{client?.firstName}</Text>
                <Text style={styles.label}>Client</Text>
                <View style={styles.clientContainer}>
                  <Image source={{ uri: client?.photo }} style={styles.clientPhoto} />
                  <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client?.firstName} {client?.lastName}</Text>
                  </View>
                </View>
              </View>
                <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      setReviewModalVisible(false)
                      setClient(null)
                      router.replace("/")
                    }}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default Main

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    margin: 20,
    marginTop: 90,
  },
  statsContainer: {
    width: "100%",
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 5,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statBox: {
    flex: 1,
    padding: 15,
    marginHorizontal: 10,
    backgroundColor: colors.lightBlue,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  statLabel: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    marginLeft: 20,
  },
  availableContainer: {
    marginLeft: 20,
    flexDirection: 'row',
    alignItems: "center",
  },
  toggleContainer: {
    width: 50,
    height: 35,
    borderRadius: 25,
    paddingLeft: 5,
    paddingRight: 55,
  },
  toggleCircle: {
    width: 27,
    height: 27,
    borderRadius: 20,
  },
  available: {
    marginLeft: 20,
    fontSize: 20,
    fontWeight: 500
  },
  orderCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  headerSection: {
      flexDirection: 'column',
  },
  label: {
    fontSize: 17,
    color: colors.text,
    marginBottom: 2,
  },
  orderBody: {
    marginTop: 0,
    width: "100%"
  },
  orderContent: {
    fontSize: 17,
    marginBottom: 10,
  },
  clientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10
  },
  clientPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 20,
  },
  clientInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  callButton: {
    marginBottom: 10,
    padding: 9,
    backgroundColor: colors.accentGreen,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
  },
  buttonIcon: {
    width: 25,
    height: 25,
    marginRight: 10
  },
  mapButton: {
    padding: 8,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mapButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noOrders: {
    fontSize: 18,
    color: colors.text,
    marginLeft: 20
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 500,
    color: '#000',
    marginBottom: 10,
  },
  rejectButton: {
    marginBottom: 10,
    padding: 9,
    backgroundColor: colors.red,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
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
  reviewStarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    marginBottom: 20
  },
  reviewStar: {
    width: 40,
    height: 40
  },
  staro: {
    tintColor: "#969696"
  },
});