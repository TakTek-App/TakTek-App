import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Platform, Modal } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, LatLng, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useCoords } from '../../../context/CoordsContext';
import { useClient } from "../../../context/ClientContext";
import colors from "../../../../assets/colors/theme";
import MapViewDirections from 'react-native-maps-directions';
import { useSocket } from "@/app/context/SocketContext";
import { useAuth } from '@/app/context/AuthContext';

const GOOGLE_MAPS_API_KEY = '';
// const GOOGLE_MAPS_API_KEY = '';

interface Peer { //
  userId: string;
  role: string;
  location: { lat: number; lng: number } | null;
  available: boolean;
}

interface Coords {
  latitude: number;
  longitude: number;
}

const MapScreen: React.FC = () => {
  const { technician } = useAuth();
  const [routeCoordinates, setRouteCoordinates] = useState<Coords[]>([]);
  const [duration, setDuration] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [rating, setRating] = useState(5);
  const router = useRouter();

  const {coords, setCoords} = useCoords();
  const { client, setClient } = useClient();
  const [ arrived, setArrived ] = useState(false);

  const { socket } = useSocket();
  const [peerLocations, setPeerLocations] = useState<Peer[]>([]); //

  const socketId = technician?.email

  useEffect(() => {
    socket?.on("peer-list", (peers: Peer[]) => { //
      setPeerLocations(peers);
    });

    socket?.on("service-cancelled", () => {
      showAlert("Service cancelled", `The service was cancelled`)
      console.log("Service cancelled")
      setClient(null)
    });

    socket?.on("service-ended", () => {
      console.log("Service ended")
      handleReview()
    });

    return () => { //
      socket?.off("peer-list");
      socket?.off("service-cancelled");
      socket?.off("service-ended");
    };
  }, []);

  const cancelService = () => {
    socket?.emit("cancel-service", {
      clientId: client?.socketId,
      technicianId: socketId
    });
    handleReturn()
  };

  const endService = () => {
    socket?.emit("end-service", {
      clientId: client?.socketId,
      technicianId: socketId
    });
    handleReview()
  };

  const showReviewModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setReviewModalVisible(true);
  };

  const showAlert = (title: string, message: string) => {
    setModalContent({ title, message });
    setAlertVisible(true);
  };

  useEffect(() => {
    (async () => {
      console.log('coords', coords);
      if (client && client.location && coords) {
        setRouteCoordinates([coords, client.location])
        await fetchDuration(coords, client.location);
      } else {
        setErrorMsg('Coordinates not available');
        setLoading(false);
      }
    })();
  }, []);

  const fetchDuration = async (origin: Coords,destination: Coords) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes.length > 0) {
        const duration = data.routes[0].legs[0].duration.text;
        setDuration(duration);
        const durationInSeconds = data.routes[0].legs[0].duration.value
        if (durationInSeconds < 60) {
          setArrived(true)
        } else {
          setArrived(false)
        }
      } else {
        throw new Error("No route found");
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
      return "N/A";
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async() => {
    setClient(null)
    router.replace("/")
  };

  const handleReview = async() => {
    showReviewModal("Order Completed", `Customer review`)
  };

  const handleRate = (value: number) => {
    setRating(value);
  };

  const simpleMapStyle = [
    {
      featureType: 'poi',  // Hide points of interest (landmarks, parks, etc.)
      stylers: [{ visibility: 'off' }],
    },
    // {
    //   featureType: 'transit',  // Hide transit lines
    //   stylers: [{ visibility: 'off' }],
    // },
    // {
    //   featureType: 'road',  // Reduce road details
    //   elementType: 'labels',
    //   stylers: [{ visibility: 'off' }],
    // },
    {
      featureType: 'water',  // Simplify water colors
      stylers: [{ color: '#c9c9c9' }],
    },
    {
      featureType: 'landscape',  // Simplify landscape colors
      stylers: [{ color: '#f5f5f5' }],
    },
  ];

  const openDashboard = ()  => {
    router.back()
  }
  
  return (
    <GestureHandlerRootView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} />
      ) : (
      <MapView
        style={{ height: "65%" }}
        provider={PROVIDER_GOOGLE}
        region={{
          latitude: coords?.latitude ?? 0,
          longitude: coords?.longitude ?? 0,
          latitudeDelta: 0.0112,
          longitudeDelta: 0.0121,
        } as Region}
        customMapStyle={simpleMapStyle}
      >
        <Marker
          coordinate={{
            latitude: coords?.latitude ?? 0,
            longitude: coords?.longitude ?? 0,
          }}
        >
          <Image
            source={{ uri: technician?.photo }}
            style={styles.markerImage}
          />
        </Marker>
        <Marker
          coordinate={{
            latitude: client?.location?.latitude ?? 0,
            longitude: client?.location?.longitude ?? 0,
          }}
          title="Destination"
        >
          <Image
            source={require("../../../../assets/icons/Location_icon.png")}
            style={styles.currentLocationPin}
            resizeMode="contain"
          />
        </Marker>
        {routeCoordinates.length > 0 && (
          <MapViewDirections
          origin={{
            latitude: coords?.latitude ?? 0,
            longitude: coords?.longitude ?? 0,
          }}
          destination={{
            latitude: client?.location?.latitude ?? 0,
            longitude: client?.location?.longitude ?? 0
          }}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={4}
          strokeColor={colors.primary}
        />
        )}
      </MapView>)}
      
      <ScrollView style={styles.bottomSheet}>
        <Text style={styles.label}>Address</Text>
        <Text style={styles.orderContent}>{client?.address}</Text>
        <Text style={styles.label}>Type of work</Text>
        <Text style={styles.orderContent}>{client?.serviceName}</Text>
        <Text style={styles.label}>Client</Text>
        <View style={styles.clientContainer}>
          <Image source={{ uri: client?.photo }} style={styles.clientPhoto} />
          <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client?.firstName} {client?.lastName}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callButton}>
          <Image source={require("../../../../assets/icons/phone.png")} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Call {client?.firstName}</Text>
        </TouchableOpacity><TouchableOpacity style={styles.dashboardButton} onPress={openDashboard}>
            <Image source={require("../../../../assets/icons/dashboard.png")} style={styles.buttonIcon} />
            <Text style={styles.dashboardButtonText}>Switch to Dashboard</Text>
          </TouchableOpacity>
        {arrived?(
          <TouchableOpacity style={styles.finishServiceButton} onPress={endService}>
            <Text style={styles.buttonText}>The work is complete</Text>
          </TouchableOpacity>
        ):(
          <TouchableOpacity style={styles. cancelServiceButton} onPress={cancelService}>
            <Text style={styles.buttonText}>End contract</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

    {/* Modal for alerts */}
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
                      source={require('../../../../assets/icons/Rate_Star.png')}
                      style={[styles.reviewStar, value > rating && styles.staro]}
                      />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.orderBody}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.orderContent}>{client?.address}</Text>
                <Text style={styles.label}>Type of work</Text>
                <Text style={styles.orderContent}>{client?.serviceName}</Text>
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

    <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
    >
      <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{modalContent.title}</Text>
              <Text style={styles.modalMessage}>{modalContent.message}</Text>
              <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    handleReturn()
                  }}
              >
                  <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationPin: {
    width: 50,
  },
  markerImage: {
    width: 35,
    height: 35,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    maxHeight: "45%",
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  time: {
    fontSize: 24,
    color: colors.text
  },
  technicianCard: {
    flex: 1,
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
  },
  technicianPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  technicianContainer: {
    flex: 1,
  },
  technicianName: {
    fontSize: 19,
    fontWeight: 'bold',
  },
  technicianService: {
    fontSize: 17,
  },
  technicianCompany: {
    fontSize: 16,
    color: colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 17,
    fontWeight: '500',
    marginRight: 5,
  },
  ratings: {
    fontSize: 17,
    fontWeight: '500',
    marginRight: 5,
    color: colors.text,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    width: 16,
    height: 16,
    marginRight: 2,
  },
  technicianRating: {
    fontSize: 16,
    marginTop: 8,
  },
  cancelServiceButton: {
    marginBottom: 30,
    padding: 10,
    backgroundColor: colors.red,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
  },
  finishServiceButton: {
    marginBottom: 30,
    padding: 10,
    backgroundColor: colors.primary,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
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
  dashboardButton: {
    marginBottom: 10,
    padding: 7,
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
  dashboardButtonText: {
    color: colors.primary,
    textAlign: 'center',
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
    padding: 20,
    paddingHorizontal: 30,
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
    marginTop: 10,
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default MapScreen;