import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Platform, SafeAreaView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import colors from '../../assets/colors/theme';
import { Link, useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { technician } = useAuth();
  const [photo, setPhoto] = useState(require('../../assets/images/Default_pfp.jpg'));
  const router = useRouter();
  const pathname = usePathname();

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    if (technician?.photo && isValidUrl(technician.photo)) {
      setPhoto({ uri: technician.photo });
    } else {
      setPhoto(require('../../assets/images/Default_pfp.jpg'));
    }
  }, [technician]);

  return (
    <SafeAreaView style={styles.container}>
      <BlurView intensity={100} style={styles.blurContainer}>
        <View style={[styles.headerContent, pathname === "/" && { justifyContent: "flex-end"}, pathname.includes("map") && { justifyContent: "center"}]}>
            {pathname.includes("map") && <Text style={styles.title}>Order in progress</Text>}
            <Link href="/(tabs)/profile" style={pathname.includes("map") && styles.profileImageMap}>
                <Image
                source={photo}
                style={styles.profileImage}
                />
            </Link>
        </View>
      </BlurView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
  },
  blurContainer: {
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: '100%',
    alignItems: 'flex-start',
    padding: 15,
    paddingHorizontal: 20,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: {
    margin: 4,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    width: 200
  },
  profileImage: {
    width: 40,
    height: 40,
    right: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileImageMap: {
    position: "absolute",
    alignSelf: "center",
    right: 20,
    bottom: 15
  },
});

export default Header;
