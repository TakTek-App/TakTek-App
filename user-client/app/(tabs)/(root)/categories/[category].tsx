import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import * as Location from "expo-location";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { useCoords } from "../../../context/CoordsContext";
import colors from "../../../../assets/colors/theme";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import { useTechnician } from "@/app/context/TechnicianContext";
import Constants from "expo-constants";

const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.expoPublic?.GOOGLE_MAPS_API_KEY;

interface Service {
  id: number;
  name: string;
}

export default function Services() {
  const { user, loading } = useAuth();
  const [services, setServices] = useState<Service[]>();
  const [searchAddressQuery, setSearchAddressQuery] = useState<string>("");
  const [searchAddressResults, setSearchAddressResults] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const { id, name } = useLocalSearchParams();

  const [loadingCoords, setLoadingCoords] = useState(true);

  const { coords, setCoords, address, setAddress, city, country } = useCoords();
  const { technician } = useTechnician();

  const showModal = (title: string, message: string) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  const serviceImages: { [key: string]: any } = {
    roadsidehelp: require("@/assets/icons/Car - Roadside Help.png"),
    carlocksmith: require("@/assets/icons/Car - Car Locksmith-.png"),
    towing: require("@/assets/icons/Car - Towing.png"),
    jumpstart: require("@/assets/icons/Car - Jump Start-.png"),
    flattire: require("@/assets/icons/Car - Flat Tire-.png"),
    fueldelivery: require("@/assets/icons/Car - Fuel Delivery-.png"),
    mobilemechanic: require("@/assets/icons/Car - Mobile Mechanic-.png"),
    autoglass: require("@/assets/icons/Car - Auto Glass.png"),
    bodyrepair: require("@/assets/icons/Car - Body Repair-.png"),
    overheating: require("@/assets/icons/Car - Overheating.png"),
    evcharging: require("@/assets/icons/Car - EV Charging.png"),
    motorcyclehelp: require("@/assets/icons/Car - Motorcycle Help.png"),
    "plumbing(home)": require("@/assets/icons/Home - Plumbing.png"),
    "electrical(home)": require("@/assets/icons/Home - Electrical.png"),
    "locksmith(home)": require("@/assets/icons/Home - Locksmith.png"),
    garagedoor: require("@/assets/icons/Home - Garage Door.png"),
    "gates&fence": require("@/assets/icons/Home - Gates Fence-.png"),
    "roofing(home)": require("@/assets/icons/Home - Roofing.png"),
    "hvac(home)": require("@/assets/icons/Home - HVAC.png"),
    "waterdamage(home)": require("@/assets/icons/Home - Water Damage.png"),
    "firedamage(home)": require("@/assets/icons/Home - Fire Damage.png"),
    "moldremoval(home)": require("@/assets/icons/Home - Mold Removal.png"),
    appliancerepair: require("@/assets/icons/Home - Appliance Repair.png"),
    pestcontrol: require("@/assets/icons/Home - Pest Control-.png"),
    glassrepair: require("@/assets/icons/Home - Glass Repair.png"),
    treeremoval: require("@/assets/icons/Home - Tree Removal-.png"),
    "securitysystem(home)": require("@/assets/icons/Home - Security System.png"),
    "plumbing(business)": require("@/assets/icons/Business - Plumbing.png"),
    "electrical(business)": require("@/assets/icons/Business - Electrical.png"),
    "locksmith(business)": require("@/assets/icons/Business - Locksmith.png"),
    "hvac(business)": require("@/assets/icons/Business - HVAC.png"),
    "firedamage(business)": require("@/assets/icons/Business - Fire Damage.png"),
    "waterdamage(business)": require("@/assets/icons/Business - Water Damage.png"),
    "moldremoval(business)": require("@/assets/icons/Business - Mold Removal.png"),
    elevatorrepair: require("@/assets/icons/Business - Elevator Repair-.png"),
    itsupport: require("@/assets/icons/Business - IT Support.png"),
    "securitysystem(business)": require("@/assets/icons/Business - Security System.png"),
    doorrepair: require("@/assets/icons/Business - Door Repair-.png"),
    "roofing(business)": require("@/assets/icons/Business - Roofing.png"),
    cleaning: require("@/assets/icons/Business - Cleaning.png"),
    hazardcleanup: require("@/assets/icons/Business - Hazard Cleanup-.png"),
    datarecovery: require("@/assets/icons/Business - Data Recovery-.png"),
  };

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && technician) router.replace("/(tabs)/(root)/contact/map");
  }, [user, loading, technician]);

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current && coords) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );
    }
    setLoadingCoords(false);
  }, [mapRef.current]);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `${Constants.expoConfig?.extra?.expoPublic?.DB_SERVER}/services/category/${id}`
        );
        const result = response.ok ? await response.json() : [];
        setServices(result);
      } catch (err) {
        setServices([
          { id: 1, name: "Locksmith" },
          { id: 8, name: "Other" },
        ]);
      }
    })();
  }, [id]);

  const searchAddress = useCallback(
    async (query: string) => {
      if (!query || query.length < 3) return setSearchAddressResults([]);

      try {
        const searchQuery = `${query} ${city}, ${country}`;
        const url = `${Constants.expoConfig?.extra?.expoPublic?.USER_SERVER}/autocomplete?query=${searchQuery}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK") setSearchAddressResults(data.predictions);
        else setSearchAddressResults([]);
      } catch {
        setSearchAddressResults([]);
      }
    },
    [city, country]
  );

  const fetchCoordinates = useCallback(async (address: string) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        setCoords({
          latitude: data.results[0].geometry.location.lat,
          longitude: data.results[0].geometry.location.lng,
        });
        console.log(
          data.results[0].geometry.location.lat,
          data.results[0].geometry.location.lng
        );
        setAddress(address);
      } else {
        setErrorMsg("Failed to fetch coordinates");
      }
    } catch {
      console.error("Error fetching coordinates");
    }
  }, []);

  const selectAddress = (address: string) => {
    setSearchAddressResults([]);
    fetchCoordinates(address);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Image
          source={require("../../../../assets/images/logo-white.png")}
          style={styles.logo}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fullscreen Map */}
      {loadingCoords ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={{
            latitude: coords?.latitude ?? 0,
            longitude: coords?.longitude ?? 0,
            latitudeDelta: 0.0112,
            longitudeDelta: 0.0121,
          }}
        >
          <Marker coordinate={coords!} title="Current Location">
            <Image
              source={require("../../../../assets/icons/Location_icon.png")}
              style={styles.currentLocationPin}
              resizeMode="contain"
            />
          </Marker>
        </MapView>
      )}

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Address Container */}
        <BlurView intensity={100} tint="light" style={styles.addressContainer}>
          <Text style={styles.addressTitle}>
            It looks like you need a service in
          </Text>
          {errorMsg ? (
            <Text style={styles.error}>{errorMsg}</Text>
          ) : coords ? (
            isEditing ? (
              <View style={styles.searchAddressContainer}>
                <TextInput
                  placeholder="Search for an address"
                  value={searchAddressQuery}
                  onChangeText={(text) => {
                    setSearchAddressQuery(text);
                    searchAddress(text);
                  }}
                  style={styles.addressInput}
                />
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(false);
                    setSearchAddressQuery("");
                    setSearchAddressResults([]);
                    // console.log("editing false")
                  }}
                >
                  <Image
                    source={require("@/assets/icons/close.png")}
                    style={styles.closeAddressInput}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={styles.addressRow}
              >
                <Text
                  style={styles.address}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {address}
                </Text>
                <Image
                  source={require("@/assets/icons/edit.png")}
                  style={styles.changeAddress}
                />
              </TouchableOpacity>
            )
          ) : (
            <Text style={styles.address}>Your Location: Awaiting...</Text>
          )}
        </BlurView>

        {isEditing && searchAddressResults.length > 0 && (
          <FlatList
            style={styles.addressSuggestions}
            data={searchAddressResults}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => selectAddress(item.description)}>
                <Text style={styles.suggestion}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Service List in ScrollView */}
        <ScrollView contentContainerStyle={styles.servicesContainer}>
          <Text style={styles.chooseService}>Choose your {name} service</Text>
          {/* Only display services if available */}
          {services && services.length > 0 ? (
            <>
              {services.map((service) => (
                <View key={service.id} style={styles.serviceButton}>
                  {user && user.verified ? (
                    <Link
                      href={{
                        pathname: `../services/${service.name.toLowerCase().replace(/\s+/g, "-")}`,
                        params: { id: service.id, name: service.name },
                      }}
                    >
                      <View style={styles.serviceContent}>
                        <Image
                          source={
                            serviceImages[
                              service.name.toLowerCase().replace(/\s+/g, "")
                            ]
                          }
                          style={styles.serviceImage}
                        />
                        <Text style={styles.serviceText}>{service.name}</Text>
                      </View>
                    </Link>
                  ) : (
                    <TouchableOpacity
                      style={styles.serviceContent}
                      onPress={() =>
                        showModal(
                          "Please verify your account",
                          "You must be verified to access this service. Please check your email for a verification link and sign in again."
                        )
                      }
                    >
                      <Image
                        source={
                          serviceImages[
                            service.name.toLowerCase().replace(/\s+/g, "")
                          ]
                        }
                        style={styles.serviceImage}
                      />
                      <Text style={styles.serviceText}>{service.name}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </>
          ) : (
            <View style={styles.servicesContainer}>
              <Text>Loading ...</Text>
            </View>
          )}
        </ScrollView>
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
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    height: "70%",
  },
  currentLocationPin: {
    width: 50,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    height: "35%",
  },
  addressContainer: {
    position: "absolute",
    top: -100,
    left: 20,
    right: 20,
    backgroundColor:
      Platform.OS === "ios" ? "transparent" : "rgba(255, 255, 255, 0.5)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    // elevation: 5,
    zIndex: 10,
    alignItems: "center",
  },
  addressTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 5,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  address: {
    fontSize: 16,
    textAlign: "center",
    maxWidth: 300,
    overflow: "hidden",
  },
  changeAddress: {
    position: "absolute",
    right: 10,
    marginTop: 10,
  },
  searchAddressContainer: {
    width: "100%",
  },
  addressInput: {
    width: "100%",
    height: 33,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
    padding: 5,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  addressSuggestions: {
    zIndex: 10,
    position: "absolute",
    width: "100%",
    top: 0,
    padding: 8,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  suggestion: {
    padding: 8,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  closeAddressInput: {
    position: "absolute",
    right: 10,
    bottom: 4,
  },
  error: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginBottom: 20,
  },
  servicesContainer: {
    alignItems: "center",
  },
  chooseService: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  serviceButton: {
    width: "90%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  serviceContent: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    width: "100%",
    padding: 15,
    backgroundColor: colors.primary,
    borderRadius: 50,
  },
  serviceImage: {
    width: 20,
    height: 15,
  },
  serviceText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loading: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "80%",
    height: "30%",
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
});
