import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView,TouchableOpacity, ScrollView, Image, Alert, Modal, Pressable, ActivityIndicator } from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { useCoords } from "../../../context/CoordsContext";
import { useTechnician } from "../../../context/TechnicianContext";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import MapViewDirections from 'react-native-maps-directions';
import React from "react";
import colors from "@/assets/colors/theme";
import { useSocket } from "@/app/context/SocketContext";
import { MediaStream, RTCPeerConnection,RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
import Constants from "expo-constants";

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
  companyId: string;
  company: string;
  rating: number;
  reviews: number;
  services: number[];
}

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.expoPublic?.GOOGLE_MAPS_API_KEY;

export default function ServiceScreen() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ sender: string; senderData: any } | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const { user, loading, fetchUserInfo, createCall } = useAuth();
  const { id, name } = useLocalSearchParams();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [acceptAlertVisible, setAcceptAlertVisible] = useState(false);
  const [rejectAlertVisible, setRejectAlertVisible] = useState(false);
  const [alertContent, setAlertContent] = useState({ title: '', message: '' });
  const [routeCoordinates, setRouteCoordinates] = useState<Coords[]>([]);
  const [duration, setDuration] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const router = useRouter();
  const { setTechnician } = useTechnician();

  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);

  const [loadingCoords, setLoadingCoords] = useState(true);

  const { coords, address } = useCoords();

  const [called, setCalled] = useState(false);

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
    serviceId: id,
    serviceName: name
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [user, loading]);

  const mapRef = useRef<MapView>(null);
  
  useEffect(() => {
    if (mapRef.current && coords) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
    setLoadingCoords(false);
  }, [mapRef.current]);

  useEffect(() => {
    console.log("incomingCall: ", incomingCall);
  }, [incomingCall]);

  useEffect(() => { //
    socket?.emit("register", socketPeer);
    console.log("Registered as user:", socketPeer.socketId);

    socket?.on("peer-list", (technicians: Technician[]) => { //
      setTechnicians(technicians);
      // console.log(technicians);
    });

    socket?.on("offer", ({ offer, sender, senderData }) => {
      console.log(`Incoming offer from ${sender} with data:`, senderData);
      setIncomingCall({ sender, senderData });
      setCallModalVisible(true);
      handleOffer(offer, sender);
    });

    socket?.on("answer", handleAnswer);
    socket?.on("ice-candidate", handleIceCandidate);
    socket?.on("call-rejected", ({senderData}) => {
      resetCallState();
      showRejectAlert("Rejected",`${senderData.firstName} rejected the call.`)
      setCallModalVisible(false);
      console.log("Call rejected.");
    });

    socket?.on("call-ended", ({ senderData }) => {
      resetCallState();
      // showRejectAlert("Ended",`${senderData.firstName} ended the call.`)
      setCalled(true)
      console.log("Call ended.");
    });

    socket?.on("call-cancelled", () => {
      resetCallState();
      console.log(`Call cancelled`);
    });

    const getUserMedia = async () => {
      const constraints = { audio: true, video: false };
      try {
        const stream = await mediaDevices.getUserMedia(constraints);
  
        if (stream.getAudioTracks().length === 0) {
          console.error("No audio tracks found.");
          return;
        }

        setLocalStream(stream);
        console.log("Local stream obtained.");
      } catch (err) {
        console.error("Failed to get user media:", err);
      }
    };

    getUserMedia();

    return () => { //
      socket?.off("peer-list");
      socket?.off("offer");
      socket?.off("answer");
      socket?.off("ice-candidate");
      socket?.off("call-rejected");
      socket?.off("call-ended");
      socket?.off("call-cancelled");
      socket?.off("hire-accepted");
      socket?.off("hire-rejected");
    };
  }, []);

  useEffect(() => {
    if (inCall && !remoteStream) {
      console.warn("Remote stream is missing. Debugging...");
    }
  }, [inCall, remoteStream]);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.id) {
          await fetchUserInfo(user.id);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleOffer = async (offer: RTCSessionDescription, sender: string) => {
    const peerConnection = createPeerConnection(sender);

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    console.log("Offer set to remote description.");

    iceCandidateQueue.current.forEach((candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("Queued ICE candidate added.");
    });
    iceCandidateQueue.current = [];

    peerConnectionRef.current = peerConnection;
  };

  const handleAnswer = async (answer: { answer: RTCSessionDescription } | null) => {
    console.log(selectedTechnician?.socketId)
    if (answer && answer.answer) {
      const { answer: sessionDescription } = answer;

      console.log("Received valid answer:", sessionDescription);

      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sessionDescription));
          console.log("Remote description set successfully.");
          console.log("selectedTechnician", selectedTechnician?.socketId)

          setInCall(true);
          setCallModalVisible(true);
          console.log("selectedTechnician", selectedTechnician?.socketId)
        } catch (error) {
          console.error("Error setting remote description:", error);
        }
      }
    } else {
      console.error("Received invalid answer:", answer);
    }
  };

  const handleIceCandidate = ({ candidate }: { candidate: RTCIceCandidateInit }) => {
    console.log("Received ICE candidate:", candidate);
    if (peerConnectionRef.current) {
      if (peerConnectionRef.current.remoteDescription) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        iceCandidateQueue.current.push(candidate);
        console.log("ICE candidate queued.");
      }
    }
  };

  const createPeerConnection = (targetPeer: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.addEventListener('track', event => {
      console.log("Remote stream received", event.streams[0]);
      setRemoteStream(event.streams[0]);
    });

    peerConnection.addEventListener('icecandidate', event => {
      if (event.candidate) {
        socket?.emit("ice-candidate", { target: targetPeer, candidate: event.candidate });
        console.log(`ICE candidate sent to: ${targetPeer}`);
      }
    });

    return peerConnection;
  };

  const startCall = async () => {
    if (!localStream || !selectedTechnician) return;

    const peerConnection = createPeerConnection("santizapata"); // companyId or socketID

    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    const offerOptions = {
      offerToReceiveAudio: 1,
    };

    try {
      const offer = await peerConnection.createOffer(offerOptions);
      await peerConnection.setLocalDescription(offer);

      socket?.emit("offer", { target: "santizapata", offer }); // companyId or socketID
      peerConnectionRef.current = peerConnection;

      setIsCalling(true);
      setCallModalVisible(true);
      console.log(`Calling peer: ${selectedTechnician}`);
    } catch (error) {
      console.error("Error creating or setting offer:", error);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !localStream) return;
  
    const peerConnection = peerConnectionRef.current!;
  
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
  
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
  
    socket?.emit("answer", { target: incomingCall.sender, answer });

    if (user?.id !== undefined) {
      await createCall(user.id, incomingCall.senderData.id);
    }
  
    setInCall(true);
    setCallModalVisible(true);
    console.log(`Call accepted with ${incomingCall.sender}`);
  };

  const rejectCall = () => {
    if (incomingCall) {
      socket?.emit("call-rejected", { target: incomingCall.sender });
      console.log(`Call rejected from ${incomingCall.sender}`);
      setIncomingCall(null);
      setCallModalVisible(false);
    }
  };

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    resetCallState();
    socket?.emit("call-ended", { target: selectedTechnician?.companyId || incomingCall?.sender }); // companyId or socketID
    setCalled(true)
    console.log("Call ended.");
  };

  const cancelCall = () => {
    if (isCalling) {
      socket?.emit("call-cancelled", { target: selectedTechnician?.companyId }); // companyId or socketID
      console.log(`Call cancelled to ${selectedTechnician?.socketId}`);
      resetCallState();
    }
  };

  const resetCallState = () => {
    setIsCalling(false);
    setInCall(false);
    setIncomingCall(null);
    setCallModalVisible(false);
    peerConnectionRef.current = null;
    setRemoteStream(null);
  };

  useEffect(() => {
    if (coords) {
      socket?.emit("send-location", {latitude: coords.latitude, longitude: coords.longitude});
    }
  }, []);

  useEffect(() => {
    console.log("serviceName", name)
    console.log("serviceId", id)
  }, []);

  const fetchDuration = useCallback(async (origin: Coords, destination: Coords) => {
    if (!origin || !destination) return;
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
  }, []);

  const showAcceptAlert = (title: string, message: string) => {
    setAlertContent({ title, message });
    setAcceptAlertVisible(true);
  };

  const showRejectAlert = (title: string, message: string) => {
    setAlertContent({ title, message });
    setRejectAlertVisible(true);
  };

  const hireTechnician = (technician: Technician) => { //
    setWaiting(true);
    socket?.emit("hire", { technicianId: technician.socketId, clientId: socketPeer.socketId });

    socket?.on("hire-accepted", async (technicianData) => { //
      setWaiting(false);
      console.log(`Technician ${technicianData.firstName} accepted the job!`);
      setTechnician(technicianData);
      if (socketPeer.id !== undefined) {
        const job = await fetchUserInfo(socketPeer.id);
        console.log(job);
      } else {
        console.error("socketPeer.id is undefined");
      }
      showAcceptAlert("Your address was sent to the technician", "Your issue will be solved soon..")
      setTimeout(()=> router.replace("/(tabs)/(root)/contact/map"), 2000)
    });

    socket?.on("hire-rejected", (technicianData) => { //
      setWaiting(false)
      showRejectAlert("Rejected",`${technicianData?.firstName} rejected the job.`)
      console.log(`Technician ${technicianData.firstName} rejected the job.`);
    });
  };

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
    setCalled(false);
  };

  const renderStars = (rating: number, reviews: number) => {
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
          <Text style={styles.ratings}> ({reviews})</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {loadingCoords? <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>:<MapView ref={mapRef} 
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: coords?.latitude ?? 0,
          longitude: coords?.longitude ?? 0,
          latitudeDelta: 0.0112,
          longitudeDelta: 0.0121,
        }}
      >
        <Marker
          coordinate={coords as Coords}
          title="Current Location"
        >
          <Image
            source={require("../../../../assets/icons/Location_icon.png")}
            style={styles.currentLocationPin}
            resizeMode="contain"
          />
        </Marker>

        {technicians.filter((technician) => technician.role === "technician" && technician.services.some((service) => service === parseInt(id as string)))
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
          apikey={GOOGLE_MAPS_API_KEY || ""}
          strokeWidth={4}
          strokeColor={colors.primary}
          lineDashPattern={[5, 10]}
        />
        )}
      </MapView>}

      {/* Modal for Technician Details */}
      <Modal
        transparent
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={closeTechnician}
      >
        <Pressable style={styles.overlay} onPress={closeTechnician} disabled={called}/>
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
                      {name}
                      </Text>
                      <Text style={styles.technicianCompany}>By {selectedTechnician && selectedTechnician.company}
                      </Text>
                      <View style={styles.technicianRating}>
                        {renderStars(selectedTechnician.rating, selectedTechnician.reviews)}
                      </View>
                    </View>
                  </View>
                {!called && <TouchableOpacity style={styles.callButton} onPress={()=> {
                  startCall()
                }}>
                  <Image source={require("../../../../assets/icons/phone.png")} style={styles.callIcon} />
                  <Text style={styles.buttonText}>Call {selectedTechnician.firstName}</Text>
                </TouchableOpacity>}
                {called && 
                <>
                <TouchableOpacity style={styles.hireButton} onPress={()=> hireTechnician(selectedTechnician)} disabled={waiting}>
                    <Text style={styles.buttonText}>{waiting ? "Waiting for technician..." : "Accept & Share address"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={closeTechnician} disabled={waiting}>
                    <Text style={styles.buttonText}>{waiting ? "Waiting for technician..." : "Change Vendor"}</Text>
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

      {/* Modal for Calls */}
      <Modal visible={callModalVisible} transparent={true} animationType="slide">
        <View style={styles.callModalContainer}>
          <View style={styles.callModalContent}>
            {isCalling && !inCall && !incomingCall && (
              <>
              <Text style={styles.callModalText}>Calling {selectedTechnician?.firstName}</Text>
              <Image source={{ uri: selectedTechnician?.photo }} style={styles.callPhoto} />
              <TouchableOpacity style={styles.callModalButton} onPress={cancelCall}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              </>
            )}
            {inCall && !incomingCall && (
              <>
                <Text style={styles.callModalText}>In call with {selectedTechnician?.firstName}</Text>
                <Image source={{ uri: selectedTechnician?.photo }} style={styles.callPhoto} />
                <TouchableOpacity style={styles.callModalButton} onPress={endCall}>
                  <Text style={styles.buttonText}>End Call</Text>
                </TouchableOpacity>
              </>
            )}
            {incomingCall && inCall && (
              <>
                <Text style={styles.callModalText}>In call with {incomingCall.senderData.firstName }</Text>
                <Image source={{ uri: incomingCall.senderData.photo }} style={styles.callPhoto} />
                <TouchableOpacity style={styles.callModalButton} onPress={endCall}>
                  <Text style={styles.buttonText}>End Call</Text>
                </TouchableOpacity>
              </>
            )}
            {incomingCall && !inCall && (
              <>
                <Text style={styles.callModalText}>Incoming call from {incomingCall.senderData.firstName}</Text>
                <Image source={{ uri: incomingCall.senderData.photo }} style={styles.callPhoto} />
                <View style={{ flexDirection: "row", gap: 50 }}>
                  <TouchableOpacity style={styles.callModalButton} onPress={acceptCall}>
                    <Text style={styles.buttonText}>Accept Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.callModalButton} onPress={rejectCall}>
                    <Text style={styles.buttonText}>Reject Call</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  callModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  callModalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    width: "90%",
  },
  callModalText: {
    fontSize: 25,
  },
  callModalButton: {
    backgroundColor: colors.primary,
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
  callPhoto: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginVertical: 80,
  },
});
