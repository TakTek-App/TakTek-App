import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, FlatList, Image, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from '../../../context/AuthContext';
import { useCoords } from "../../../context/CoordsContext";
import colors from "../../../../assets/colors/theme";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import { useTechnician } from "@/app/context/TechnicianContext";
import Constants from "expo-constants";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.expoPublic?.GOOGLE_MAPS_API_KEY;

interface Service {
  id: number;
  name: string;
}

export default function Services() {
  const { user, loading } = useAuth();
  const [services, setServices] = useState<Service[]>();
  const [city, setCity] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [searchAddressQuery, setSearchAddressQuery] = useState<string>('');
  const [searchAddressResults, setSearchAddressResults] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  
  const { id, name } = useLocalSearchParams();

  const [loadingCoords, setLoadingCoords] = useState(true);

  const { coords, setCoords, address, setAddress } = useCoords();
  const { technician } = useTechnician();

  const serviceImages: { [key: string]: any } = {
    towing: require('../../../../assets/icons/Tow Truck.png'),
    roadassistance: require('@/assets/icons/Road.png'),
    locksmith: require('../../../../assets/icons/Tool.png'),
    gates: require('../../../../assets/icons/Gates.png'),
    electric: require('../../../../assets/icons/Electric.png'),
    plumbing: require('../../../../assets/icons/plumbing.png'),
    waterdamage: require('../../../../assets/icons/Water Damage.png'),
  };

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && technician) router.replace("/(tabs)/(root)/contact/map");
  }, [user, loading, technician]);

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
    (async () => {
      try {
        const response = await fetch(`${Constants.expoConfig?.extra?.expoPublic?.DB_SERVER}/services/category/${id}`);
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
        setCoords(data.results[0].geometry.location);
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
        <Image source={require("../../../../assets/images/logo-white.png")} style={styles.logo} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Fullscreen Map */}
      {loadingCoords ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
      <MapView ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={{
          latitude: coords?.latitude ?? 0,
          longitude: coords?.longitude ?? 0,
          latitudeDelta: 0.0112,
          longitudeDelta: 0.0121,
        }}
      >
        <Marker
          coordinate={coords!}
          title="Current Location"
        >
          <Image
            source={require("../../../../assets/icons/Location_icon.png")}
            style={styles.currentLocationPin}
            resizeMode="contain"
          />
        </Marker>
      </MapView>)} 

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Address Container */}
        <BlurView style={styles.addressContainer}>
          <Text style={styles.addressTitle}>It looks like you need a service in</Text>
          {errorMsg ? (
            <Text style={styles.error}>{errorMsg}</Text>
          ) : coords ? isEditing ? (
          <View style={styles.searchAddressContainer}>
            <TextInput
              placeholder="Search for an address"
              value={searchAddressQuery}
              onChangeText={(text) => {
                setSearchAddressQuery(text);
                searchAddress(text);
              } }
              style={styles.addressInput}
            />
            <TouchableOpacity onPress={() => {
                  setIsEditing(false)
                  // console.log("editing false")
                }
              }>
              <Image
              source={require('@/assets/icons/close.png')}
              style={styles.closeAddressInput}
            />
            </TouchableOpacity>  
          </View>
          ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.addressRow}>
            <Text style={styles.address} numberOfLines={1} ellipsizeMode="tail">{address}
            </Text>
            <Image
                source={require('../../../../assets/icons/edit.png')}
                style={styles.changeAddress}
            />
          </TouchableOpacity>
          ) : (
          <Text style={styles.address}>Your Location: Awaiting...</Text>
        )}

        {isEditing && searchAddressResults.length > 0 && (
          <FlatList style={styles.addressSuggestions}
            data={searchAddressResults}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => selectAddress(item.description)}>
                <Text style={styles.suggestion}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        )}
        </BlurView>

        {/* Service List in ScrollView */}
        <ScrollView contentContainerStyle={styles.servicesContainer}>
          <Text style={styles.chooseService}>Choose your {name} service</Text>
          {/* Only display services if available */}
          {services && services.length > 0 ? (
            <>
              {services.map((service) => (
                <Link
                  href={{
                    pathname: `../services/${service.name.toLowerCase().replace(/\s+/g, "-")}`,
                    params: { id: service.id, name: service.name },
                  }}
                  key={service.id}
                  style={styles.serviceButton}
                >
                  <View style={styles.serviceContent}>
                    <Image
                      source={serviceImages[service.name.toLowerCase().replace(/\s+/g, '')]}
                      style={styles.serviceImage}
                    />
                    <Text style={styles.serviceText}>{service.name}</Text>
                  </View>
                </Link>
              ))}
            </>
          ) : (
            <View style={styles.servicesContainer}>
              <Text>No services available at the moment.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
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
    maxHeight: "35%",
  },
  addressContainer: {
    position: "absolute",
    top: -100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#fff",
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
    marginBottom: 10
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
    backgroundColor: "#fff"
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
    backgroundColor: "#fff"
  },
  addressSuggestions: {
    position: 'absolute',
    width: "100%",
    top: 90,
    padding: 8,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    borderRadius: 10,
    backgroundColor: '#fff',
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
  }
});
