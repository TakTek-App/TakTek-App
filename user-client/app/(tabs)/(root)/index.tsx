import React, { useEffect, useState } from "react";
import { Text, View, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, FlatList, Image } from "react-native";
import * as Location from "expo-location";
import { Link, useRouter } from "expo-router";
import { useAuth } from '../../context/AuthContext';
import { useCoords } from "../../context/CoordsContext";
import colors from "../../../assets/colors/theme";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import { useTechnician } from "@/app/context/TechnicianContext";

const GOOGLE_MAPS_API_KEY = '';

interface Category {
  id: number;
  name: string;
}

export default function Index() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>();
  const [city, setCity] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [loadingLocation, setLoadinglocation] = useState(true);
  const [searchAddressQuery, setSearchAddressQuery] = useState<string>('');
  const [searchAddressResults, setSearchAddressResults] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const { coords, setCoords, address, setAddress } = useCoords();
  const { technician } = useTechnician();

  const categoryImages: { [key: string]: any } = {
    car: require('../../../assets/icons/Car.png'),
    home: require('../../../assets/icons/HouseLine.png'),
    business: require('../../../assets/icons/BuildingOffice.png'),
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth/login");
      } else {
        // console.log("Logging user from index", user);
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (!loading) {
      if (technician) {
        router.replace("/(tabs)/(root)/contact/map");
      }
    }
  }, [user, loading]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('http://10.0.2.2:3000/categories');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const result = await response.json();
        setCategories(result);
      } catch (err: any) {
        setCategories([
          {
              "id": 1,
              "name": "Car",
          },
          {
              "id": 2,
              "name": "Home",
          },
          {
              "id": 3,
              "name": "Business",
          },
      ])
        // console.log(err.message);
      }
    };

    fetchServices();
  }, []);

  const fetchAddress = async (latitude: number, longitude: number) => {
    console.log(GOOGLE_MAPS_API_KEY); // PENDING
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const formattedAddress = data.results[0].formatted_address.split(', ')[0];
        const addressComponents = data.results[0].address_components;

        let city = '';
        let country = '';

        addressComponents?.forEach((component: any) => {
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          if (component.types.includes('country')) {
            country = component.long_name;
          }
        });

        setCity(city);
        setCountry(country);

        console.log(formattedAddress);
        console.log(city, country);
        setAddress(formattedAddress);
      } else {
        console.error('Geocoding error:', data.status);
        setAddress('No address found');
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      setErrorMsg("Failed to fetch address");
    }
  };

  useEffect(() => {
    setLoadinglocation(true)
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location access is required to fetch the address.');
          return;
        }

        const locationResult = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = locationResult.coords;
        // setCoords({ latitude, longitude });
        setCoords({ latitude: 6.207326920022623, longitude: -75.57076466673648 });

        fetchAddress(latitude, longitude);
      } catch (error) {
        console.error("Error getting location:", error);
      }
    };
    getLocation();
    setLoadinglocation(false)
  }, []);

  const searchAddress = async (query: string) => {
    if (!query) return setSearchAddressResults([]);
    if (query.length < 3) return;

    try {
      query = `${query} ${city}, ${country}`
      const url = `http://localhost:3001/autocomplete?query=${query}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        setSearchAddressResults(data.predictions);
      } else {
        console.error('No results found:', data.status);
        setSearchAddressResults([]);
      }
    } catch (error) {
      console.error('Error searching address:', error);
      setSearchAddressResults([]);
    }
  };

  const fetchCoordinates = async (address: string) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const location = data.results[0].geometry.location;
        setCoords(location);
        console.log('Coordinates:', location);
      } else {
        console.error('Geocoding error:', data.status);
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  };

  const selectAddress = (address: string) => {
    setAddress(address);
    setSearchAddressResults([]);
    fetchCoordinates(address);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Image source={require("../../../assets/images/logo-white.png")} style={styles.logo} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Fullscreen Map */}
      {loadingLocation ? (
        <Text>Loading...</Text>
      ) : (
      <MapView
        onPress={() => setIsEditing(false)}
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
            source={require("../../../assets/icons/Location_icon.png")}
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
          <TextInput
            placeholder="Search for an address"
            value={searchAddressQuery}
            onChangeText={(text) => {
              setSearchAddressQuery(text);
              searchAddress(text);
            }}
            style={styles.addressInput}
          />
          ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.addressRow}>
            <Text style={styles.address} numberOfLines={1} ellipsizeMode="tail">{address}
            </Text>
            <Image
                source={require('../../../assets/icons/edit.png')}
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
          <Text style={styles.chooseService}>Choose your service</Text>
          {/* Only display services if available */}
          {categories && categories.length > 0 ? (
            <>
              {categories.map((category) => (
                <Link
                  href={{
                    pathname: `./categories/${category.name.toLowerCase().replace(/\s+/g, "-")}`,
                    params: { id: category.id, name: category.name },
                  }}
                  key={category.id}
                  style={styles.categoryButton}
                >
                  <Image
                    source={categoryImages[category.name.toLowerCase().replace(/\s+/g, '')]}
                    style={styles.categoryImage}
                  />
                  <Text style={styles.categoryText}>{category.name}</Text>
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
    maxWidth: 400,
    overflow: "hidden",
  },
  changeAddress: {
    position: "absolute",
    right: 10,
    marginTop: 10,
  },
  addressInput: {
    width: "100%",
    height: 33,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 8,
    fontSize: 16,
    padding: 5,
    paddingHorizontal: 10,
    backgroundColor: "#fff"
  },
  addressSuggestions: {
    position: 'absolute',
    top: 90,
    padding: 8,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderRadius: 10,
    // backgroundColor: '#fff',
  },
  suggestion: {
    padding: 8,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    // backgroundColor: '#fff',
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
  categoryButton: {
    width: "90%",
    padding: 15,
    marginVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 50,
    textAlign: "center",
  },
  categoryImage: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  categoryText: {
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
