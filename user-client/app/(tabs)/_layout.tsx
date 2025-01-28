import { usePathname, Tabs } from 'expo-router';
import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import colors from "../../assets/colors/theme";
import Header from '../components/Header';

export default function TabLayout() {
  const pathname = usePathname();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarShowLabel: false,
          headerShown: false,
          tabBarStyle: {
            height: 100,
          },
          tabBarItemStyle: {
            padding: 30,
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarLabelStyle: {
            fontSize: 14,
          },
        }}
      >
        <Tabs.Screen
          name="(root)"
          options={{
            tabBarIcon: ({ color }) => (
              <View style={styles.tabContainer}>
                <Image
                  source={require('../../assets/icons/Toolbox.png')}
                  style={[styles.icon, { tintColor: color }]}
                />
                <Text style={[styles.tabText, { color }]}>Service</Text>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            tabBarIcon: ({ color }) => (
              <View style={styles.tabContainer}>
                <Image
                  source={require('../../assets/icons/ListDashes.png')}
                  style={[styles.icon, { tintColor: color }]}
                />
                <Text style={[styles.tabText, { color }]}>Orders</Text>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="support"
          options={{
            tabBarIcon: ({ color }) => (
              <View style={styles.tabContainer}>
                <Image
                  source={require('../../assets/icons/support.png')}
                  style={[styles.icon, { tintColor: color }]}
                />
                <Text style={[styles.tabText, { color }]}>Support</Text>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  icon: {
    width: 32,
    height: 32,
    marginBottom: 5,
  },
  tabText: {
    fontSize: 15,
    fontWeight: 500,
    textAlign: 'center',
  },
});
