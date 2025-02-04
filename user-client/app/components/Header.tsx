import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Platform, SafeAreaView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import colors from '../../assets/colors/theme';
import { Link, useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SafeAreaView style={styles.container}>
      <BlurView intensity={100} style={styles.blurContainer}>
        <View style={[
          styles.headerContent,
          pathname === "/" && { justifyContent: "flex-end" },
          pathname.includes("map") && { justifyContent: "center" }
        ]}>
          {pathname !== "/" && !pathname.includes("map") && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Image
                source={require('../../assets/icons/ArrowLeft.png')}
                style={styles.backButtonImage}
              />
            </TouchableOpacity>
          )}
          {pathname.includes("services") && (
            <Text style={styles.title}>These services are the closest to you</Text>
          )}
          {pathname.includes("map") && (
            <Text style={styles.title}>The technician is on their way to you</Text>
          )}
          <Link href="/(tabs)/profile" style={pathname.includes("map") && styles.profileImageMap}>
            <Image
              source={{ uri: user?.photo }}
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
  backButton: {
    width: 40,
    height: 40,
    right: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  backButtonImage: {
    width: 25,
    height: 25,
  },
  title: {
    textAlign: "center",
    fontSize: 18,
    width: 200,
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
    bottom: 21,
  },
});

export default Header;
