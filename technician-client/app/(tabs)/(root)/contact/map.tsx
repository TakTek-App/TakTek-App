import React, { useState, useEffect, useRef } from "react";
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
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { useCoords } from "../../../context/CoordsContext";
import { useClient } from "../../../context/ClientContext";
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

interface Peer {
  //
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

  const { technician, createCall, review } = useAuth();
  const [routeCoordinates, setRouteCoordinates] = useState<Coords[]>([]);
  const [duration, setDuration] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const router = useRouter();

  const { coords, setCoords } = useCoords();
  const { client, setClient } = useClient();
  const [arrived, setArrived] = useState(false);

  const { socket } = useSocket();
  const [peerLocations, setPeerLocations] = useState<Peer[]>([]); //

  const socketId = technician?.email;

  useEffect(() => {
    socket?.on("peer-list", (peers: Peer[]) => {
      //
      setPeerLocations(peers);
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
      showModal("Rejected", `${senderData.firstName} rejected the call.`);
      setCallModalVisible(false);
      console.log("Call rejected.");
    });

    socket?.on("call-ended", ({ senderData }) => {
      resetCallState();
      showModal("Ended", `${senderData.firstName} ended the call.`);
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
      showAlert("Service cancelled", `The service was cancelled`);
      console.log("Service cancelled");
      setClient(null);
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
  }, []);

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
    console.log(client?.socketId);
    if (answer && answer.answer) {
      const { answer: sessionDescription } = answer;

      console.log("Received valid answer:", sessionDescription);

      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(sessionDescription)
          );
          console.log("Remote description set successfully.");
          console.log(client?.socketId);

          setInCall(true);
          setCallModalVisible(true);
          console.log(client?.socketId);
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
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:relay1.expressturn.com:3478",
          username: Constants.expoConfig?.extra?.expoPublic?.TURN_USERNAME,
          credential: Constants.expoConfig?.extra?.expoPublic?.TURN_CREDENTIAL,
        },
      ],
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
    if (!localStream || !client) return;

    const peerConnection = createPeerConnection(client.socketId);

    localStream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, localStream));

    const offerOptions = {
      offerToReceiveAudio: 1,
    };

    try {
      const offer = await peerConnection.createOffer(offerOptions);
      await peerConnection.setLocalDescription(offer);

      socket?.emit("offer", { target: client.socketId, offer });
      peerConnectionRef.current = peerConnection;

      setIsCalling(true);
      setCallModalVisible(true);
      console.log(`Calling peer: ${client}`);
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

    if (technician?.id) {
      await createCall(technician.id, incomingCall.senderData.id);
    } else {
      console.error("Technician ID is undefined");
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
      target: client?.socketId || incomingCall?.sender,
    });
    console.log("Call ended.");
  };

  const cancelCall = () => {
    if (isCalling) {
      socket?.emit("call-cancelled", {
        target: client?.socketId || incomingCall?.sender,
      });
      console.log(`Call cancelled to ${client?.socketId}`);
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
      clientId: client?.socketId,
      technicianId: socketId,
    });
    handleReturn();
  };

  const endService = () => {
    socket?.emit("end-service", {
      clientId: client?.socketId,
      technicianId: socketId,
    });
    handleReview();
  };

  const showReviewModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setReviewModalVisible(true);
  };

  const showAlert = (title: string, message: string) => {
    setModalContent({ title, message });
    setAlertVisible(true);
  };

  const showModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  useEffect(() => {
    (async () => {
      console.log("coords", coords);
      if (client && client.location && coords) {
        setRouteCoordinates([coords, client.location]);
        await fetchDuration(coords, client.location);
      } else {
        setErrorMsg("Coordinates not available");
        setLoading(false);
      }
    })();
  }, []);

  const fetchDuration = async (origin: Coords, destination: Coords) => {
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
  };

  const handleReturn = async () => {
    setClient(null);
    router.replace("/");
  };

  const handleReview = async () => {
    showReviewModal("Order Completed", `Customer review`);
  };

  const handleRate = async (value: number) => {
    setRating(value);
  };

  const submitRating = async () => {
    if (client?.id && technician?.jobs[technician.jobs.length - 1]?.id) {
      await review(
        client.id,
        technician.jobs[technician.jobs.length - 1].id,
        rating
      );
    } else {
      console.error("Client ID or Job ID is undefined");
    }
    setReviewModalVisible(false);
    setClient(null);
    router.replace("/");
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

  const openDashboard = () => {
    router.back();
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} />
      ) : (
        <MapView
          style={{ height: "65%" }}
          provider={PROVIDER_GOOGLE}
          region={
            {
              latitude: coords?.latitude ?? 0,
              longitude: coords?.longitude ?? 0,
              latitudeDelta: 0.0112,
              longitudeDelta: 0.0121,
            } as Region
          }
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
                longitude: client?.location?.longitude ?? 0,
              }}
              apikey={GOOGLE_MAPS_API_KEY || ""}
              strokeWidth={4}
              strokeColor={colors.primary}
            />
          )}
        </MapView>
      )}

      <ScrollView style={styles.bottomSheet}>
        <Text style={styles.label}>Address</Text>
        <Text style={styles.orderContent}>{client?.address}</Text>
        <Text style={styles.label}>Type of work</Text>
        <Text style={styles.orderContent}>{client?.serviceName}</Text>
        <Text style={styles.label}>Client</Text>
        <View style={styles.clientContainer}>
          <Image source={{ uri: client?.photo }} style={styles.clientPhoto} />
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {client?.firstName} {client?.lastName}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callButton} onPress={startCall}>
          <Image
            source={require("../../../../assets/icons/phone.png")}
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Call {client?.firstName}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={openDashboard}
        >
          <Image
            source={require("../../../../assets/icons/dashboard.png")}
            style={styles.buttonIcon}
          />
          <Text style={styles.dashboardButtonText}>Switch to Dashboard</Text>
        </TouchableOpacity>
        {arrived ? (
          <TouchableOpacity
            style={styles.finishServiceButton}
            onPress={endService}
          >
            <Text style={styles.buttonText}>The work is complete</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.cancelServiceButton}
            onPress={cancelService}
          >
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
                    source={require("../../../../assets/icons/Rate_Star.png")}
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
                <Image
                  source={{ uri: client?.photo }}
                  style={styles.clientPhoto}
                />
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {client?.firstName} {client?.lastName}
                  </Text>
                </View>
              </View>
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

      <Modal
        visible={alertVisible}
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
              onPress={() => {
                setModalVisible(false);
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
                  Calling {client?.firstName}
                </Text>
                <Image
                  source={{ uri: client?.photo }}
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
                  In call with {client?.firstName}
                </Text>
                <Image
                  source={{ uri: client?.photo }}
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
    marginBottom: 30,
    padding: 10,
    backgroundColor: colors.red,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  finishServiceButton: {
    marginBottom: 30,
    padding: 10,
    backgroundColor: colors.primary,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
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
  label: {
    fontSize: 17,
    color: colors.text,
    marginBottom: 2,
  },
  orderBody: {
    marginTop: 0,
    width: "100%",
  },
  orderContent: {
    fontSize: 17,
    marginBottom: 10,
  },
  clientContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  clientPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 20,
  },
  clientInfo: {
    flexDirection: "column",
    flex: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 2,
  },
  callButton: {
    marginBottom: 10,
    padding: 9,
    backgroundColor: colors.accentGreen,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  buttonIcon: {
    width: 25,
    height: 25,
    marginRight: 10,
  },
  dashboardButton: {
    marginBottom: 10,
    padding: 7,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary,
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
  dashboardButtonText: {
    color: colors.primary,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
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
    padding: 20,
    paddingHorizontal: 30,
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
    marginTop: 10,
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 50,
    width: "100%",
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
