import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
  Modal,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  LatLng,
  Region,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useCoords } from "../../../context/CoordsContext";
import { useTechnician } from "../../../context/TechnicianContext";
import colors from "../../../../assets/colors/theme";
import MapViewDirections from "react-native-maps-directions";
import { useSocket } from "@/app/context/SocketContext";
import { useAuth } from "@/app/context/AuthContext";
import {
  MediaStream,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from "react-native-webrtc";
import Constants from "expo-constants";

const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.expoPublic?.GOOGLE_MAPS_API_KEY;

interface Coords {
  latitude: number;
  longitude: number;
}

interface Technician {
  id: number;
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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    sender: string;
    senderData: any;
  } | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const { user, createCall, review } = useAuth();
  const [routeCoordinates, setRouteCoordinates] = useState<Coords[]>([]);
  const [duration, setDuration] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });
  const [rating, setRating] = useState(5);
  const router = useRouter();

  const { coords, address } = useCoords();
  const { technician, setTechnician } = useTechnician();
  const [arrived, setArrived] = useState(false);

  const { socket, isConnected } = useSocket();
  const [peerLocations, setPeerLocations] = useState<Technician[]>([]); //

  const [callModalVisible, setCallModalVisible] = useState(false);

  const socketPeer = {
    id: user?.id,
    role: "user",
    firstName: user?.firstName,
    lastName: user?.lastName,
    socketId: user?.email,
    photo: user?.photo,
    address: address,
    location: coords,
    // serviceId: parseInt(id as string),
    // serviceName: name,
  };

  const lastLocationRef = useRef<Coords | null>(technician?.location || null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket?.emit("register", socketPeer);

    socket?.on("peer-list", (technicians: Technician[]) => {
      //
      setPeerLocations(technicians);
    });

    socket?.on("offer", ({ offer, sender, senderData }) => {
      console.log(`Incoming offer from ${sender} with data:`, senderData);
      setIncomingCall({ sender, senderData });
      setCallModalVisible(true);
      handleOffer(offer, sender);
    });

    socket?.on("answer", handleAnswer);
    socket?.on("ice-candidate", handleIceCandidate);
    socket?.on("call-rejected", ({ senderData }) => {
      resetCallState();
      showAlert("Rejected", `${senderData.firstName} rejected the call.`);
      setCallModalVisible(false);
      console.log("Call rejected.");
    });

    socket?.on("call-ended", ({ senderData }) => {
      resetCallState();
      showAlert("Ended", `${senderData.firstName} ended the call.`);
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

    socket?.on("service-cancelled", () => {
      showAlert(
        "Service cancelled",
        `${technician?.firstName} cancelled the service`
      );
      console.log("Service cancelled");
    });

    socket?.on("service-ended", () => {
      console.log("Service ended");
      handleReview();
    });

    return () => {
      //
      socket?.off("peer-list");
      socket?.off("offer");
      socket?.off("answer");
      socket?.off("ice-candidate");
      socket?.off("call-rejected");
      socket?.off("call-ended");
      socket?.off("call-cancelled");
      socket?.off("service-cancelled");
      socket?.off("service-ended");
    };
  }, [socket, isConnected]);

  useEffect(() => {
    if (inCall && !remoteStream) {
      console.warn("Remote stream is missing. Debugging...");
    }
  }, [inCall, remoteStream]);

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

  const handleAnswer = async (
    answer: { answer: RTCSessionDescription } | null
  ) => {
    console.log(technician?.socketId);
    if (answer && answer.answer) {
      const { answer: sessionDescription } = answer;

      console.log("Received valid answer:", sessionDescription);

      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(sessionDescription)
          );
          console.log("Remote description set successfully.");
          console.log(technician?.socketId);

          setInCall(true);
          setCallModalVisible(true);
          console.log(technician?.socketId);
        } catch (error) {
          console.error("Error setting remote description:", error);
        }
      }
    } else {
      console.error("Received invalid answer:", answer);
    }
  };

  const handleIceCandidate = ({
    candidate,
  }: {
    candidate: RTCIceCandidateInit;
  }) => {
    console.log("Received ICE candidate:", candidate);
    if (peerConnectionRef.current) {
      if (peerConnectionRef.current.remoteDescription) {
        peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
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

    peerConnection.addEventListener("track", (event) => {
      console.log("Remote stream received", event.streams[0]);
      setRemoteStream(event.streams[0]);
    });

    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        socket?.emit("ice-candidate", {
          target: targetPeer,
          candidate: event.candidate,
        });
        console.log(`ICE candidate sent to: ${targetPeer}`);
      }
    });

    return peerConnection;
  };

  const startCall = async () => {
    if (!localStream || !technician) return;

    const peerConnection = createPeerConnection(technician.companyId); // companyId or socketID

    localStream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, localStream));

    const offerOptions = {
      offerToReceiveAudio: 1,
    };

    try {
      const offer = await peerConnection.createOffer(offerOptions);
      await peerConnection.setLocalDescription(offer);

      socket?.emit("offer", { target: technician?.companyId, offer }); // companyId or socketID
      peerConnectionRef.current = peerConnection;

      setIsCalling(true);
      setCallModalVisible(true);
      console.log(`Calling peer: ${technician?.socketId}`);
    } catch (error) {
      console.error("Error creating or setting offer:", error);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !localStream) return;

    const peerConnection = peerConnectionRef.current!;

    localStream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, localStream));

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
    socket?.emit("call-ended", {
      target: technician?.companyId || incomingCall?.sender,
    }); // companyId or socketID
    console.log("Call ended.");
  };

  const cancelCall = () => {
    if (isCalling) {
      socket?.emit("call-cancelled", { target: technician?.companyId }); // companyId or socketID
      console.log(`Call cancelled to ${technician?.socketId}`);
      resetCallState();
    }
  };

  const resetCallState = () => {
    setIsCalling(false);
    setInCall(false);
    setCallModalVisible(false);
    peerConnectionRef.current = null;
    setRemoteStream(null);
  };

  const cancelService = () => {
    socket?.emit("cancel-service", {
      clientId: socketPeer.socketId,
      technicianId: technician?.socketId,
    });
    handleReturn();
  };

  const endService = () => {
    socket?.emit("end-service", {
      clientId: socketPeer.socketId,
      technicianId: technician?.socketId,
    });
    handleReview();
  };

  const showModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  const showAlert = (title: string, message: string) => {
    setModalContent({ title, message });
    setAlertVisible(true);
  };

  const fetchDuration = useCallback(
    async (origin: Coords, destination: Coords) => {
      if (!origin || !destination) return;
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes.length > 0) {
          const duration = data.routes[0].legs[0].duration.text;
          setDuration(duration);
          const durationInSeconds = data.routes[0].legs[0].duration.value;
          if (durationInSeconds < 60) {
            setArrived(true);
          } else {
            setArrived(false);
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
    },
    []
  );

  useEffect(() => {
    if (technician?.location && coords) {
      setRouteCoordinates([technician.location, coords]);
      fetchDuration(technician.location, coords);
    } else {
      setLoading(false);
    }
  }, [technician, coords, fetchDuration]);

  if (!coords) {
    return <Text>Loading location...</Text>;
  }

  const handleReturn = async () => {
    setTechnician(null);
    router.replace("/");
  };

  const handleReview = async () => {
    showModal("Job Complete!", `Please rate ${technician?.firstName}'s work`);
  };

  const handleRate = async (value: number) => {
    setRating(value);
  };

  const submitRating = async () => {
    if (technician?.id && user?.jobs[user.jobs.length - 1]?.id) {
      await review(technician.id, user.jobs[user.jobs.length - 1].id, rating);
    } else {
      console.error("Technician ID or Job ID is undefined");
    }
    setModalVisible(false);
    setTechnician(null);
    router.replace("/");
  };

  const renderStars = (rating: number) => {
    if (!rating) return;
    const fullStars = Math.floor(rating);
    const stars = [];

    for (let i = 0; i < 5; i++) {
      const opacity = i < fullStars ? 1 : 0.2;
      stars.push(
        <Image
          key={i}
          source={require("../../../../assets/icons/Rate_Star.png")}
          style={[styles.starIcon, { opacity }]}
        />
      );
    }

    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingNumber}>{rating.toFixed(1)}</Text>
        <View style={styles.starsContainer}>{stars}</View>
        <Text style={styles.ratings}> ({technician?.reviews})</Text>
      </View>
    );
  };

  const simpleMapStyle = [
    {
      featureType: "poi", // Hide points of interest (landmarks, parks, etc.)
      stylers: [{ visibility: "off" }],
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
      featureType: "water", // Simplify water colors
      stylers: [{ color: "#c9c9c9" }],
    },
    {
      featureType: "landscape", // Simplify landscape colors
      stylers: [{ color: "#f5f5f5" }],
    },
  ];

  useEffect(() => {
    if (technician) {
      const updatedTechnician = peerLocations.find(
        (peer) => peer.socketId === technician.socketId
      );

      if (
        updatedTechnician?.location &&
        JSON.stringify(updatedTechnician.location) !==
          JSON.stringify(lastLocationRef.current)
      ) {
        lastLocationRef.current = updatedTechnician.location;
        fetchDuration(updatedTechnician.location, coords);
      }
    }
  }, [peerLocations, technician, coords, fetchDuration]);

  return (
    <GestureHandlerRootView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} />
      ) : (
        <MapView
          style={{ height: "80%" }}
          provider={PROVIDER_GOOGLE}
          region={
            {
              latitude: lastLocationRef.current?.latitude,
              longitude: lastLocationRef.current?.longitude,
              latitudeDelta: 0.0112,
              longitudeDelta: 0.0121,
            } as Region
          }
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
              latitude: lastLocationRef.current?.latitude ?? 0,
              longitude: lastLocationRef.current?.longitude ?? 0,
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
                latitude: lastLocationRef.current?.latitude ?? 0,
                longitude: lastLocationRef.current?.longitude ?? 0,
              }}
              destination={{
                latitude: coords?.latitude ?? 0,
                longitude: coords?.longitude ?? 0,
              }}
              apikey={GOOGLE_MAPS_API_KEY || ""}
              strokeWidth={4}
              strokeColor={colors.primary}
            />
          )}
        </MapView>
      )}

      <View style={styles.bottomSheet}>
        {duration &&
          (!arrived ? (
            <Text style={styles.time}>On the way. {duration} left</Text>
          ) : (
            <Text style={styles.time}>Work in progress</Text>
          ))}
        <View style={styles.technicianCard}>
          {technician && (
            <Image
              source={{ uri: technician.photo }}
              style={styles.technicianPhoto}
            />
          )}
          <View style={styles.technicianContainer}>
            <Text style={styles.technicianName}>
              {technician && `${technician.firstName} ${technician.lastName}`}
            </Text>
            <Text style={styles.technicianService}>
              {technician && `${technician.firstName} ${technician.lastName}`}
            </Text>
            <Text style={styles.technicianCompany}>
              By {technician && technician.company}
            </Text>
            <View style={styles.technicianRating}>
              {technician && renderStars(technician.rating)}
            </View>
          </View>
        </View>
        {!arrived ? (
          <TouchableOpacity
            style={styles.cancelServiceButton}
            onPress={cancelService}
          >
            <Text style={styles.buttonText}>End contract</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.finishServiceButton}
            onPress={endService}
          >
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
                    source={require("../../../../assets/icons/Rate_Star.png")}
                    style={[styles.reviewStar, value > rating && styles.staro]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                submitRating();
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
                handleReturn();
              }}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for Calls */}
      <Modal
        visible={callModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.callModalContainer}>
          <View style={styles.callModalContent}>
            {isCalling && !inCall && !incomingCall && (
              <>
                <Text style={styles.callModalText}>
                  Calling {technician?.firstName}
                </Text>
                <Image
                  source={{ uri: technician?.photo }}
                  style={styles.callPhoto}
                />
                <TouchableOpacity
                  style={styles.callModalButton}
                  onPress={cancelCall}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
            {inCall && !incomingCall && (
              <>
                <Text style={styles.callModalText}>
                  In call with {technician?.firstName}
                </Text>
                <Image
                  source={{ uri: technician?.photo }}
                  style={styles.callPhoto}
                />
                <TouchableOpacity
                  style={styles.callModalButton}
                  onPress={endCall}
                >
                  <Text style={styles.buttonText}>End Call</Text>
                </TouchableOpacity>
              </>
            )}
            {incomingCall && inCall && (
              <>
                <Text style={styles.callModalText}>
                  In call with {incomingCall.senderData.firstName}
                </Text>
                <Image
                  source={{ uri: incomingCall.senderData.photo }}
                  style={styles.callPhoto}
                />
                <TouchableOpacity
                  style={styles.callModalButton}
                  onPress={endCall}
                >
                  <Text style={styles.buttonText}>End Call</Text>
                </TouchableOpacity>
              </>
            )}
            {incomingCall && !inCall && (
              <>
                <Text style={styles.callModalText}>
                  Incoming call from {incomingCall.senderData.firstName}
                </Text>
                <Image
                  source={{ uri: incomingCall.senderData.photo }}
                  style={styles.callPhoto}
                />
                <View style={{ flexDirection: "row", gap: 50 }}>
                  <TouchableOpacity
                    style={styles.callModalButton}
                    onPress={acceptCall}
                  >
                    <Text style={styles.buttonText}>Accept Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.callModalButton}
                    onPress={rejectCall}
                  >
                    <Text style={styles.buttonText}>Reject Call</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    color: colors.text,
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
    fontWeight: "bold",
  },
  technicianService: {
    fontSize: 17,
  },
  technicianCompany: {
    fontSize: 16,
    color: colors.text,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingNumber: {
    fontSize: 17,
    fontWeight: "500",
    marginRight: 5,
  },
  ratings: {
    fontSize: 17,
    fontWeight: "500",
    marginRight: 5,
    color: colors.text,
  },
  starsContainer: {
    flexDirection: "row",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  finishServiceButton: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.primary,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  reviewStarsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  reviewStar: {
    width: 40,
    height: 40,
  },
  staro: {
    opacity: 0.2,
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

export default MapScreen;
