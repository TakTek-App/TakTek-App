import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Platform, Modal } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, LatLng, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useCoords } from '../../../context/CoordsContext';
import { useTechnician } from "../../../context/TechnicianContext";
import colors from "../../../../assets/colors/theme";
import MapViewDirections from 'react-native-maps-directions';
import { useSocket } from "@/app/context/SocketContext";
import { useAuth } from '@/app/context/AuthContext';

const GOOGLE_MAPS_API_KEY = '';
// const GOOGLE_MAPS_API_KEY = '';

interface Coords {
  latitude: number;
  longitude: number;
}

interface Technician {
  id: number,
  role: string;
  firstName: string;
  lastName: string;
  socketId: string;
  photo: string;
  location: Coords | null;
  available: boolean;
  company: string;
  rating: number;
}

const MapScreen: React.FC = () => {
  const { user } = useAuth();
  const [routeCoordinates, setRouteCoordinates] = useState<Coords[]>([]);
  const [duration, setDuration] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const [rating, setRating] = useState(5);
  const router = useRouter();

  const { coords } = useCoords();
  const { technician, setTechnician } = useTechnician();
  const [ arrived, setArrived ] = useState(false);

  const { socket } = useSocket();
  const [peerLocations, setPeerLocations] = useState<Technician[]>([]); //

  const socketId = user?.email

  useEffect(() => {
    socket?.on("peer-list", (technicians: Technician[]) => { //
      setPeerLocations(technicians);
    });

    socket?.on("service-cancelled", () => {
      showAlert("Service cancelled", `${technician?.firstName} cancelled the service`)
      console.log("Service cancelled")
    });

    socket?.on("service-ended", () => {
      console.log("Service ended")
      handleReview()
    });

    return () => { //
      socket?.off("peer-list");
      socket?.off("service-ended");
    };
  }, []);

  const cancelService = () => {
    socket?.emit("cancel-service", {
      clientId: socketId,
      technicianId: technician?.socketId
    });
    handleReturn()
  };

  const endService = () => {
    socket?.emit("end-service", {
      clientId: socketId,
      technicianId: technician?.socketId
    });
    handleReview()
  };

  const showModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  const showAlert = (title: string, message: string) => {
    setModalContent({ title, message });
    setAlertVisible(true);
  };

  useEffect(() => {
    (async () => {
      console.log('coords', coords);
      if (technician && technician.location && coords) {
        setRouteCoordinates([technician.location, coords])
        await fetchDuration(technician.location, coords);
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
        if(durationInSeconds < 60) {
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

  if (!coords) {
    return <Text>Loading location...</Text>;
  }

  const handleReturn = async() => {
    setTechnician(null)
    router.replace("/")
  };

  const handleReview = async() => {
    showModal("Job Complete!", `Please rate ${technician?.firstName}'s work`)
  };

  const handleRate = (value: number) => {
    setRating(value);
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const stars = [];

    for (let i = 0; i < 5; i++) {
      const tintColor = i < fullStars ? undefined : colors.border;
      stars.push(
          <Image
              key={i}
              source={require('../../../../assets/icons/Rate_Star.png')}
              style={[styles.starIcon, { tintColor }]}
          />
      );
    }

    return (
      <View style={styles.ratingContainer}>
          <Text style={styles.ratingNumber}>{rating.toFixed(1)}</Text>
          <View style={styles.starsContainer}>{stars}</View>
          <Text style={styles.ratings}> (300)</Text>
      </View>
    );
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

  useEffect(() => {
    if (technician) {
      // Find the peer technician by matching the userId with the technician's firstName
      const updatedTechnician = peerLocations.find(
        (peer) => peer.socketId === technician.socketId
      );
  
      if (updatedTechnician) {
        // Update only the location field
        setTechnician({
          ...technician,
          location: updatedTechnician.location ? {
            latitude: updatedTechnician.location.latitude,
            longitude: updatedTechnician.location.longitude,
          } : technician.location,
        });
  
        // If a new location exists, fetch the duration based on that location
        if (updatedTechnician.location) {
          fetchDuration(
            { latitude: updatedTechnician.location.latitude, longitude: updatedTechnician.location.longitude },
            coords as Coords
          );
        }
      }
    }
  }, [peerLocations]);
  

  return (
    <GestureHandlerRootView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} />
       ) : (
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: technician && technician.location ? technician.location.latitude : 0,
          longitude: technician && technician.location ? technician.location.longitude : 0,
          latitudeDelta: 0.0112,
          longitudeDelta: 0.0121,
        } as Region}
        customMapStyle={simpleMapStyle}
      >
        <Marker
          coordinate={{
            latitude: coords.latitude,
            longitude: coords.longitude,
          }}
          title="Current Location"
        >
          <Image
            source={require("../../../../assets/icons/Location_icon.png")}
            style={styles.currentLocationPin}
            resizeMode="contain"
          />
        </Marker>
        <Marker
          coordinate={{
            latitude: technician?.location?.latitude ?? 0,
            longitude: technician?.location?.longitude ?? 0,
          }}
        >
          {technician && (
            <Image
              source={{ uri: technician.photo }}
              style={styles.markerImage}
            />
          )}
        </Marker>
        {routeCoordinates.length > 0 && (
          <MapViewDirections
          origin={{
            latitude: technician?.location?.latitude ?? 0,
            longitude: technician?.location?.longitude ?? 0,
          }}
          destination={{latitude: coords?.latitude ?? 0, longitude: coords?.longitude ?? 0}}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={4}
          strokeColor={colors.primary}
        />
        )}
      </MapView>)}
      
      <View style={styles.bottomSheet}>
          {duration && (
            !arrived ? <Text style={styles.time}>On the way. {duration} left</Text> : <Text style={styles.time}>Work in progress</Text>
          )}
          <View style={styles.technicianCard}>
            {technician && <Image source={{ uri: technician.photo }} style={styles.technicianPhoto} />}
            <View style={styles.technicianContainer}>
              <Text style={styles.technicianName}>
              {technician && `${technician.firstName} ${technician.lastName}`}
              </Text>
              <Text style={styles.technicianService}>
              {technician && `${technician.firstName} ${technician.lastName}`}
              </Text>
              <Text style={styles.technicianCompany}>By {technician && technician.company}
              </Text>
              <View style={styles.technicianRating}>
              {technician && renderStars(technician.rating)}
              </View>
            </View>
          </View>
        {!arrived? (
          <TouchableOpacity style={styles.cancelServiceButton} onPress={cancelService}>
            <Text style={styles.buttonText}>End contract</Text>
          </TouchableOpacity>
        ):(
          <TouchableOpacity style={styles.finishServiceButton} onPress={endService}>
                <Text style={styles.buttonText}>The work is complete</Text>
            </TouchableOpacity>
        )}
        
        
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
                  <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => {
                        setModalVisible(false)
                        setTechnician(null)
                        router.replace("/")
                      }}
                  >
                      <Text style={styles.modalButtonText}>Submit</Text>
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
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
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
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.red,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
  },
  finishServiceButton: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.primary,
    borderRadius: 50,
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

export default MapScreen;