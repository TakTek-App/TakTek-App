import { useAuth } from "@/app/context/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import colors from "../../../assets/colors/theme";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocket } from "@/app/context/SocketContext";
import { useClient } from "@/app/context/ClientContext";
import { useCoords } from "@/app/context/CoordsContext";
import { Audio } from "expo-av";
import {
  MediaStream,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from "react-native-webrtc";

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
  serviceId: number;
  serviceName: string;
}

const Main = () => {
  const [locationPermission, setLocationPermission] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState(false);
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

  const {
    technician,
    loading,
    acceptJob,
    fetchTechnicianInfo,
    createCall,
    review,
  } = useAuth();
  const [connecting, setConnecting] = useState(true);
  const [available, setAvailable] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [noServicesVisible, setNoServicesVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [clients, setClients] = useState<Client[]>([]); //
  const [requestingClient, setRequestingClient] = useState<Client>();
  const [rating, setRating] = useState(5);

  const { client, setClient } = useClient();
  const { setCoords } = useCoords();

  const { socket, isConnected } = useSocket();

  const router = useRouter();

  // Random location generator

  // const baseLocation = { latitude: 6.207326920022623, longitude: -75.57076466673648 };

  // const generateRandomLocation = () => {
  //   const radiusInKm = 1;
  //   const earthRadiusInKm = 6371;

  //   const randomOffset = () => (Math.random() - 0.5) * 2; // Random value between -1 and 1

  //   const latOffset = (radiusInKm / earthRadiusInKm) * (180 / Math.PI);
  //   const lngOffset = latOffset / Math.cos((baseLocation.latitude * Math.PI) / 180);

  //   const newLat = baseLocation.latitude + randomOffset() * latOffset;
  //   const newLng = baseLocation.longitude + randomOffset() * lngOffset;

  //   return { latitude: parseFloat(newLat.toFixed(6)), longitude: parseFloat(newLng.toFixed(6)) };
  // };

  // const sendRandomLocation = () => {
  //   const randomLocation = generateRandomLocation();
  //   setCoords(randomLocation);
  //   socket?.emit("send-location", randomLocation);
  // };

  // /Random location generator

  const showModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  const showNoServices = (title: string, message: string) => {
    setModalContent({ title, message });
    setNoServicesVisible(true);
  };

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const locationStatus =
          await Location.requestForegroundPermissionsAsync();
        if (locationStatus.status === "granted") {
          setLocationPermission(true);
        } else {
          setLocationPermission(false);
          Alert.alert("Permission Denied", "Location access is required.");
        }

        const microphoneStatus = await Audio.requestPermissionsAsync();
        if (microphoneStatus.status === "granted") {
          setMicrophonePermission(true);
        } else {
          setMicrophonePermission(false);
          Alert.alert("Permission Denied", "Microphone access is required.");
        }
      } catch (error) {
        console.error("Error requesting permissions:", error);
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!technician) {
        router.replace("/auth/login");
      } else {
        // console.log("Logging technician from index", technician);
      }
    }
  }, [technician, loading]);

  const socketPeer = {
    id: technician?.id,
    role: "technician",
    firstName: technician?.firstName,
    lastName: technician?.lastName,
    socketId: technician?.email,
    photo: technician?.photo,
    companyId: technician?.company.id,
    company: technician?.company.name,
    rating: technician?.rating,
    reviews: technician?.reviews.length,
    services: technician?.services.map((service) => service.id),
  };

  useEffect(() => {
    const fetchData = async () => {
      if (technician?.id) {
        await fetchTechnicianInfo(technician.id);
      }
    };

    fetchData();
  }, [technician?.id]);

  useEffect(() => {
    setTimeout(() => {
      setConnecting(false);
    }, 5000);
  }, []);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return false;
      }
      return true;
    };

    const startLocationTracking = async () => {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          socket?.emit("send-location", {latitude, longitude});
          console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
        }
      );
    };

    startLocationTracking();
  }, []);

  useEffect(() => {
    //
    if (!socket || !isConnected) return;

    setConnecting(false);

    socket?.emit("register", socketPeer);
    console.log("Registered as technician:", socketPeer.socketId);

    console.log("Services:", socketPeer.services);

    if (socketPeer.services?.length === 0) {
      showNoServices(
        "No services",
        "You need to add services to start receiving orders."
      );
    }

    // sendRandomLocation();
    // const interval = setInterval(sendRandomLocation, 3000);

    socket?.on("peer-list", (clients: Client[]) => {
      //
      setClients(clients);
      console.log("clients", clients);
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

    socket?.on("hire-request", (clientData) => {
      setRequestingClient(clientData);
      console.log(clientData);
      setAlertVisible(true);
    });

    socket?.on("service-cancelled", ({ message }) => {
      console.log(message);
      showModal("Service Cancelled", message);
      setClient(null);
    });

    socket?.on("service-ended", () => {
      handleReview();
      setClient(null);
    });

    return () => {
      socket?.off("peer-list");
      socket?.off("offer");
      socket?.off("answer");
      socket?.off("ice-candidate");
      socket?.off("call-rejected");
      socket?.off("call-ended");
      socket?.off("call-cancelled");
      socket?.off("hire-request");
      socket?.off("service-cancelled");
      socket?.off("service-ended");
      // clearInterval(interval);
      socket?.disconnect();
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

  const toggleAvailability = async () => {
    if (!client) {
      setAvailable(!available);
      socket?.emit("toggle-availability", !available);
    }
  };

  const acceptRequest = async () => {
    setAlertVisible(false);
    socket?.emit("hire-response", {
      response: "accept",
      clientId: requestingClient?.socketId,
      technicianId: socketPeer.socketId,
    });
    if (requestingClient) {
      setClient(requestingClient);
    }
    if (socketPeer.id) {
      if (
        socketPeer.id &&
        requestingClient?.id &&
        requestingClient?.serviceId
      ) {
        const job = await acceptJob(
          socketPeer.id,
          requestingClient.id,
          requestingClient.serviceId
        );
        console.log("job", job);
      } else {
        console.error(
          "Failed to set up job: Missing required IDs",
          socketPeer.id,
          requestingClient?.id,
          requestingClient?.serviceId
        );
      }
    } else {
      console.log("Failed to set up job");
    }
  };

  const rejectRequest = () => {
    setAlertVisible(false);
    socket?.emit("hire-response", {
      response: "reject",
      clientId: requestingClient?.socketId,
      technicianId: socketPeer.socketId,
    });
  };

  const handleRate = (value: number) => {
    setRating(value);
  };

  const submitRating = async () => {
    if (client?.id && technician?.jobs[technician.jobs.length - 1]?.id) {
      await review(
        client.id,
        technician.jobs[technician.jobs.length - 1].id,
        rating
      );
      setReviewModalVisible(false);
      setClient(null);
      router.replace("/");
    } else {
      console.error("Client ID or Job ID is undefined");
    }
  };

  const showReviewModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setReviewModalVisible(true);
  };

  const handleReview = async () => {
    showReviewModal("Order Completed", `Customer review`);
  };

  const openMap = () => {
    router.push("/(tabs)/(root)/contact/map");
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
          <Switch
            style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
            trackColor={{ false: colors.red, true: colors.accentGreen }}
            thumbColor={"#fff"}
            ios_backgroundColor={colors.red}
            onValueChange={toggleAvailability}
            value={available}
          />

          <Text style={styles.available}>
            {available ? "Available" : "Busy"}
          </Text>
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
                <Image
                  source={{ uri: client.photo }}
                  style={styles.clientPhoto}
                />
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {client.firstName} {client.lastName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callButton}>
                <Image
                  source={require("../../../assets/icons/phone.png")}
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>Call {client.firstName}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapButton} onPress={openMap}>
                <Image
                  source={require("../../../assets/icons/map.png")}
                  style={styles.buttonIcon}
                />
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
              <Text style={styles.orderContent}>
                {requestingClient?.address}
              </Text>
              <Text style={styles.label}>Type of work</Text>
              <Text style={styles.orderContent}>
                {requestingClient?.serviceName}
              </Text>
              <Text style={styles.label}>Client</Text>
              <View style={styles.clientContainer}>
                <Image
                  source={{ uri: requestingClient?.photo }}
                  style={styles.clientPhoto}
                />
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {requestingClient?.firstName} {requestingClient?.lastName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={acceptRequest}
              >
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={rejectRequest}
              >
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
        visible={noServicesVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoServicesVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalContent.title}</Text>
            <Text style={styles.modalMessage}>{modalContent.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setNoServicesVisible(false);
                router.replace("/(tabs)/profile");
              }}
            >
              <Text style={styles.modalButtonText}>Go to profile</Text>
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
                    source={require("@/assets/icons/Rate_Star.png")}
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

      <Modal visible={connecting} transparent animationType="fade">
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={"#fff"} />
        </View>
      </Modal>
    </ScrollView>
  );
};

export default Main;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    margin: 20,
    marginTop: Platform.OS === "ios"? 140:100,
  },
  statsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
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
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  statLabel: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
    textAlign: "center"
  },
  statValue: {
    fontSize: 26,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    marginLeft: 20,
  },
  availableContainer: {
    marginLeft: 30,
    flexDirection: "row",
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
    fontWeight: 500,
  },
  orderCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerSection: {
    flexDirection: "column",
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
  mapButton: {
    padding: 8,
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
  mapButtonText: {
    color: colors.primary,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  noOrders: {
    fontSize: 18,
    color: colors.text,
    marginLeft: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContent: {
    width: "90%",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 500,
    color: "#000",
    marginBottom: 10,
  },
  rejectButton: {
    marginBottom: 10,
    padding: 9,
    backgroundColor: colors.red,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
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
    tintColor: "#969696",
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