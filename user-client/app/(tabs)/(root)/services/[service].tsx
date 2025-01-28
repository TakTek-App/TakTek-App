import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView,TouchableOpacity, ScrollView, Image, Alert, Modal, Pressable } from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { useCoords } from "../../../context/CoordsContext";
import { useTechnician } from "../../../context/TechnicianContext";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from "react-native-maps";
import MapViewDirections from 'react-native-maps-directions';
import React from "react";
import colors from "@/assets/colors/theme";
import { useSocket } from "@/app/context/SocketContext";

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
  services: number[]
}

const GOOGLE_MAPS_API_KEY = '';

export default function ServiceScreen() {
  const { user, loading } = useAuth();
  const { id, name } = useLocalSearchParams();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [acceptAlertVisible, setAcceptAlertVisible] = useState(false);
  const [rejectAlertVisible, setRejectAlertVisible] = useState(false);
  const [alertContent, setAlertContent] = useState({ title: '', message: '' });
  const [routeCoordinates, setRouteCoordinates] = useState<Coords[]>([]);
  const [duration, setDuration] = useState<string | null>(null);
  const router = useRouter();
  const { setTechnician } = useTechnician();

  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);

  const { coords, address } = useCoords();

  const [called, setCalled] = useState(true);

  const { socket } = useSocket();
  const socketPeer = {
    id: user?.id,
    role: "user",
    firstName: user?.firstName,
    lastName: user?.lastName,
    socketId: user?.email,
    photo: user?.photo,
    address: address,
    location: coords,
    serviceName: name
  }

  // useEffect(() => {
  //   console.log(technicians)
  // }, [technicians]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth/login");
      } else {
        // console.log("Logging user from services", user);
      }
    }
  }, [user, loading]);

  useEffect(() => { //
    socket?.emit("register", socketPeer);
    console.log("Registered as user:", socketPeer.socketId);
  }, []);

  useEffect(() => {
    socket?.on("peer-list", (technicians: Technician[]) => { //
      setTechnicians(technicians);
    });

    socket?.on("hire-accepted", ({ technicianId }) => { //
      console.log(`Technician ${technicianId} accepted the job!`);
      showAcceptAlert("Your address was sent to the technician", "Your issue will be solved soon..")
      setTimeout(()=> router.replace("/(tabs)/(root)/contact/map"), 2000)
    });

    socket?.on("hire-rejected", ({ technicianId }) => { //
      setTechnician(null)
      showRejectAlert("Rejected",`${selectedTechnician?.firstName} rejected the job.`)
      console.log(`Technician ${technicianId} rejected the job.`);
    });

    return () => { //
      socket?.off("peer-list");
      socket?.off("hire-accepted");
      socket?.off("hire-rejected");
    };
  }, []);

  useEffect(() => {
    if (coords) {
      socket?.emit("send-location", {latitude: coords.latitude, longitude: coords.longitude});
    }
  }, []);

  useEffect(() => {
    console.log("serviceName", name)
    console.log("serviceId", id)
    const fetchServices = async () => {
      setLoadingTechnicians(true);
      try {
        const response = await fetch(`http://localhost:3000/technicians/service/${id}`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const result = await response.json();
        setTechnicians(result);
      } catch (err) {
        // setTechnicians([
        // {
        //     "id": 1,
        //     "role": "technician",
        //     "firstName": "David",
        //     "lastName": "Jones",
        //     "photo": "https://plus.unsplash.com/premium_photo-1689530775582-83b8abdb5020?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        //     "location": {latitude: 6.1964825999999995, longitude: -75.57387140463291},
        //     "rating": 5,
        //     "company": "ServNow",
        //   },
        //   {
        //       "id": 2,
        //       "firstName": "John",
        //       "lastName": "Doe",
        //       "photo": "https://plus.unsplash.com/premium_photo-1689539137236-b68e436248de?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        //       "location": {latitude: 6.1989072, longitude: -75.57493439594916},
        //       "rating": 5,
        //       "company": {
        //           "name": "Tech Solutions",
        //           "serviceId": 1,
        //       },
        //   },
        //   {
        //       "id": 3,
        //       "firstName": "Jane",
        //       "lastName": "Smith",
        //       "photo": "https://plus.unsplash.com/premium_photo-1688572454849-4348982edf7d?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        //       "location": {latitude: 6.19702045, longitude: -75.5591826240879},
        //       "rating": 5,
        //       "company": {
        //           "name": "Tech Solutions",
        //           "serviceId": 1,
        //       }
        //   },
        //   {
        //     "id": 4,
        //     "firstName": "David",
        //     "lastName": "Jones",
        //     "photo": "https://plus.unsplash.com/premium_photo-1689530775582-83b8abdb5020?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        //     "location": {latitude: 6.248217, longitude: -75.580032},
        //     "rating": 5,
        //     "company": {
        //         "name": "ServNow",
        //         "serviceId": 1,
        //     },
        //   },
        //   {
        //     "id": 5,
        //     "firstName": "John",
        //     "lastName": "Doe",
        //     "photo": "https://plus.unsplash.com/premium_photo-1689539137236-b68e436248de?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        //     "location": {latitude: 6.1881323, longitude: -75.5836944},
        //     "rating": 5,
        //     "company": {
        //         "name": "Tech Solutions",
        //         "serviceId": 1,
        //     },
        //   },
        //   {
        //     "id": 6,
        //     "firstName": "Jane",
        //     "lastName": "Smith",
        //     "photo": "https://plus.unsplash.com/premium_photo-1688572454849-4348982edf7d?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        //     "location": {latitude: 6.2964825999999995, longitude: -75.57387140463291},
        //     "rating": 5,
        //     "company": {
        //         "name": "Tech Solutions",
        //           "serviceId": 1,
        //     }
        //   },
        //   {
        //     "id": 7,
        //     "firstName": "David",
        //     "lastName": "Jones",
        //     "photo": "https://plus.unsplash.com/premium_photo-1689530775582-83b8abdb5020?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        //     "location": {latitude: 6.3964825999999995, longitude: -75.57387140463291},
        //     "rating": 5,
        //     "company": {
        //         "name": "ServNow",
        //         "serviceId": 1,
        //     },
        //   },
        //   {
        //       "id": 8,
        //       "firstName": "John",
        //       "lastName": "Doe",
        //       "photo": "https://plus.unsplash.com/premium_photo-1689539137236-b68e436248de?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        //       "location": {latitude: 6.4964825999999995, longitude: -75.57387140463291},
        //       "rating": 5,
        //       "company": {
        //           "name": "Tech Solutions",
        //           "serviceId": 1,
        //       },
        //   },
        //   {
        //     "id": 9,
        //     "firstName": "Jane",
        //     "lastName": "Smith",
        //     "photo": "https://plus.unsplash.com/premium_photo-1688572454849-4348982edf7d?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        //     "location": {latitude: 6.5964825999999995, longitude: -75.57387140463291},
        //     "rating": 5,
        //     "company": {
        //         "name": "Tech Solutions",
        //         "serviceId": 1,
        //     }
        //   },
        // ])
        // console.error("error", err);
      } finally {
        setLoadingTechnicians(false)
      }
    };

    fetchServices();
  }, []);

  const fetchDuration = async (origin: Coords,destination: Coords) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes.length > 0) {
        const duration = data.routes[0].legs[0].duration.text;
        setDuration(duration);
      } else {
        throw new Error("No route found");
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
      return "N/A";
    }
  };

  const showAcceptAlert = (title: string, message: string) => {
    setAlertContent({ title, message });
    setAcceptAlertVisible(true);
  };

  const showRejectAlert = (title: string, message: string) => {
    setAlertContent({ title, message });
    setRejectAlertVisible(true);
  };

  const callTechnician = (technician: Technician) => {
    setCalled(true)
    router.push("/(tabs)/(root)/contact/call")
  };

  // const hireTechnician = (technician: Technician) => {
  //   setTechnician(technician)
  //   showAcceptAlert("Your address was sent to the technician", "Your issue will be solved soon..")
  //   setTimeout(()=> router.replace("/(tabs)/(root)/contact/map"), 2000)
  // };

  const hireTechnician = (technician: Technician) => { //
    setTechnician(technician)
    socket?.emit("hire", { technicianId: technician.socketId, clientId: socketPeer.socketId });
  };

  // const openTechnician = (technician: Technician) => {
  //   setSelectedTechnician(technician);
  //   setRouteCoordinates([
  //     { latitude: technician.location.latitude, longitude: technician.location.longitude },
  //     coords as Coords,
  //   ])
  //   if (technician.location) {
  //     fetchDuration({ latitude: technician.location.latitude, longitude: technician.location.longitude }, coords as Coords);
  //   }
  //   setModalVisible(true);
  // };

  const openTechnician = (technician: Technician) => {
    setSelectedTechnician(technician);
    technician.location && setRouteCoordinates([
      { latitude: technician.location?.latitude, longitude: technician.location?.longitude },
      coords as Coords,
    ])
    
    if (technician.location) {
      fetchDuration({ latitude: technician.location.latitude, longitude: technician.location.longitude }, coords as Coords);
    }
    setModalVisible(true);
  };

  useEffect(() => {
    if (selectedTechnician) {
      const updatedTechnician = technicians.find(
        (peer) => peer.socketId === selectedTechnician.socketId
      );

      if (updatedTechnician) {
        setSelectedTechnician((prev) => ({
          ...prev!,
          location: updatedTechnician.location ? { latitude: updatedTechnician.location.latitude, longitude: updatedTechnician.location.longitude } : prev!.location,
        }));
        if (updatedTechnician.location) {
          fetchDuration({ latitude: updatedTechnician.location.latitude, longitude: updatedTechnician.location.longitude }, coords as Coords);
        }
      }
    }
  }, [technicians]);

  const closeTechnician = () => {
    setModalVisible(false);
    setRouteCoordinates([])
    setDuration(null)
    setSelectedTechnician(null);
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
  }

  return (
    <SafeAreaView style={styles.container}>
      {loadingTechnicians ? (
      <View style={styles.container}>
        <Text>Loading technicians...</Text>
      </View>
    ) : (
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: coords?.latitude || 0,
          longitude: coords?.longitude || 0,
          latitudeDelta: 0.0112,
          longitudeDelta: 0.0121,
        }}
      >
        <Marker
          coordinate={{
            latitude: coords?.latitude || 0,
            longitude: coords?.longitude || 0,
          }}
          title="Current Location"
        >
          <Image
            source={require("../../../../assets/icons/Location_icon.png")}
            style={styles.currentLocationPin}
            resizeMode="contain"
          />
        </Marker>
        {/* {technicians && technicians.map((technician) => (
          <Marker
            key={technician.id}
            coordinate={{
              latitude: technician.location.latitude,
              longitude: technician.location.longitude,
            }}
            onPress={() => openTechnician(technician)}
          >
            <Image source={{ uri: technician.photo }} style={styles.markerImage} />
          </Marker>
        ))} */}

        {technicians.filter((technician) => technician.role === "technician" && technician.available && technician.services.some((service) => service === parseInt(id as string)))
        .map((technician) => (
          <Marker 
            key={technician.socketId}
            coordinate={technician.location ? { latitude: technician.location.latitude, longitude: technician.location.longitude } : { latitude: 0, longitude: 0 }}
            title={technician.firstName}
            onPress={() => openTechnician(technician)}
            >
            <Image source={{ uri: technician.photo }} style={styles.markerImage} />
          </Marker>
        ))}
        {routeCoordinates.length > 0 && (
          <MapViewDirections
          origin={{
            latitude: selectedTechnician?.location?.latitude || 0,
            longitude: selectedTechnician?.location?.longitude || 0,
          }}
          destination={{latitude: coords?.latitude || 0, longitude: coords?.longitude || 0}}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={4}
          strokeColor={colors.primary}
          lineDashPattern={[5, 10]}
        />
        )}
      </MapView>
    )}

      {/* Modal for Technician Details */}
      <Modal
        transparent
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={closeTechnician}
      >
        <Pressable style={styles.overlay} onPress={closeTechnician} />
        <View style={styles.bottomSheet}>
          {selectedTechnician && (
            <>
              {duration && (
                <Text style={styles.time}>{duration} away</Text>
              )}
              <View style={styles.technicianCard}>
                    {selectedTechnician && <Image source={{ uri: selectedTechnician.photo }} style={styles.technicianPhoto} />}
                    <View style={styles.technicianContainer}>
                      <Text style={styles.technicianName}>
                      {selectedTechnician && `${selectedTechnician.firstName} ${selectedTechnician.lastName}`}
                      </Text>
                      <Text style={styles.technicianService}>
                      {selectedTechnician && `${selectedTechnician.firstName} ${selectedTechnician.lastName}`}
                      </Text>
                      <Text style={styles.technicianCompany}>By {selectedTechnician && selectedTechnician.company}
                      </Text>
                      <View style={styles.technicianRating}>
                        {renderStars(selectedTechnician.rating)}
                      </View>
                    </View>
                  </View>
                {!called && <TouchableOpacity style={styles.callButton} onPress={()=> callTechnician(selectedTechnician)}>
                  <Image source={require("../../../../assets/icons/phone.png")} style={styles.callIcon} />
                  <Text style={styles.buttonText}>Call {selectedTechnician.firstName}</Text>
                </TouchableOpacity>}
                {called && 
                <>
                <TouchableOpacity style={styles.hireButton} onPress={()=> hireTechnician(selectedTechnician)}>
                    <Text style={styles.buttonText}>Accept & Share address</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={closeTechnician}>
                    <Text style={styles.buttonText}>Change Vendor</Text>
                </TouchableOpacity>
                </>}
            </>
          )}
        </View>
      </Modal>

      {/* Modal for alerts */}
      <Modal
          visible={acceptAlertVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAcceptAlertVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalMessage}>{alertContent.title}</Text>
                  <Text style={styles.modalMessage}>{alertContent.message}</Text>
              </View>
          </View>
      </Modal>

      <Modal
          visible={rejectAlertVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRejectAlertVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{alertContent.title}</Text>
                  <Text style={styles.modalMessage}>{alertContent.message}</Text>
                  <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => {
                          setRejectAlertVisible(false)
                          closeTechnician()
                        }
                      }
                  >
                      <Text style={styles.modalButtonText}>Close</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
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
  overlay: {
    flex: 1,
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
  callButton: {
    marginBottom: 15,
    padding: 9,
    backgroundColor: colors.accentGreen,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
  },
  callIcon: {
    width: 25,
    height: 25,
    marginRight: 10
  },
  hireButton: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: colors.accentGreen,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
  },
  cancelButton: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.red,
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
