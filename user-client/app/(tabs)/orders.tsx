import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    Text,
    StyleSheet,
    Image,
    View,
    ScrollView,
} from 'react-native';
import colors from '../../assets/colors/theme';
import { Link } from 'expo-router';
import { useAuth } from '../context/AuthContext';

// const orders: any[] = [];
// const orders = [
//   {
//       id: '1',
//       date: '2025-01-16',
//       rating: 4.5,
//       address: '123 Main St, City, Country',
//       specialistName: 'John Doe',
//       specialistPhoto: require('../../assets/images/logo.png'),
//       serviceType: 'Plumbing',
//       company: 'Fast Plumbing Services',
//   },
//   {
//       id: '2',
//       date: '2025-01-10',
//       rating: 3.8,
//       address: '456 Elm St, City, Country',
//       specialistName: 'Jane Smith',
//       specialistPhoto: require('../../assets/images/logo.png'),
//       serviceType: 'Locksmith',
//       company: 'Secure Locks Inc.',
//   },
//   {
//       id: '3',
//       date: '2025-01-05',
//       rating: 4.0,
//       address: '789 Oak St, City, Country',
//       specialistName: 'Robert Brown',
//       specialistPhoto: require('../../assets/images/logo.png'),
//       serviceType: 'Electrical',
//       company: 'Bright Electricians',
//   },
//   {
//       id: '4',
//       date: '2025-01-02',
//       rating: 5.0,
//       address: '101 Pine St, City, Country',
//       specialistName: 'Emily Green',
//       specialistPhoto: require('../../assets/images/logo.png'),
//       serviceType: 'HVAC',
//       company: 'Cool Air Solutions',
//   },
// ];

const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const stars = [];

    for (let i = 0; i < 5; i++) {
        const tintColor = i < fullStars ? undefined : colors.border;
        stars.push(
            <Image
                key={i}
                source={require('../../assets/icons/Rate_Star.png')}
                style={[styles.starIcon, { tintColor }]}
            />
        );
    }

    return (
        <View style={styles.ratingContainer}>
            <Text style={styles.ratingNumber}>{rating.toFixed(1)}</Text>
            <View style={styles.starsContainer}>{stars}</View>
        </View>
    );
};

const OrdersScreen = () => {
    const { user } = useAuth();
    const [ photo, setPhoto ] = useState(require('../../assets/images/Default_pfp.jpg'))
    const orders = user?.jobs || [];
    console.log(orders);

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    };

    useEffect(() => {
        if (user?.photo && isValidUrl(user.photo)) {
            setPhoto({ uri: user.photo });
        } else {
            setPhoto(require('../../assets/images/Default_pfp.jpg'));
        }
    }, [user]);

    const renderItem = ({ item }: { item: typeof orders[0] }) => (
        <View style={styles.orderCard} key={item.id}>
            <View style={styles.orderHeader}>
                <View style={styles.headerSection}>
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.orderDate}>{item.date}</Text>
                </View>
                <View style={styles.headerSection}>
                    <Text style={styles.label}>Rating</Text>
                    {renderStars(item.technician.rating)}
                </View>
            </View>
            <View style={styles.orderBody}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.orderAddress}>address</Text>
                <Text style={styles.label}>Specialist</Text>
                <View style={styles.specialistContainer}>
                    <Image source={{ uri: item.technician.photo }} style={styles.specialistPhoto} />
                    <View style={styles.specialistInfo}>
                        <Text style={styles.label}>{item.service.name}</Text>
                        <Text style={styles.specialistName}>{item.technician.firstName} {item.technician.lastName}</Text>
                        <Text style={styles.company}>By {item.technician.company.name}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Orders</Text>
                <Link href="/(tabs)/profile" style={styles.headerLink}>
                  <Image
                  source={photo}
                  style={styles.profileImage}
                  />
                </Link>
            </View>
            {orders.length === 0 ? (
                <View style={styles.noOrdersContainer}>
                    <Text style={styles.noOrdersText}>No orders available</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.ordersList}>
                    {orders.map((order) => renderItem({ item: order }))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        padding: 15,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: 500,
    },
    headerLink: {
      position: "absolute",
      right: 15,
    },
    profileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "#fff",
    },
    noOrdersContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noOrdersText: {
        fontSize: 18,
        color: colors.text,
    },
    ordersList: {
        padding: 15,
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    headerSection: {
        flexDirection: 'column',
    },
    label: {
        fontSize: 17,
        color: colors.text,
        marginBottom: 2,
    },
    orderDate: {
        fontSize: 17,
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
    starsContainer: {
        flexDirection: 'row',
    },
    starIcon: {
        width: 16,
        height: 16,
        marginRight: 2,
    },
    orderBody: {
        marginTop: 10,
    },
    orderAddress: {
        fontSize: 17,
        marginBottom: 10,
    },
    specialistContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    specialistPhoto: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 20,
    },
    specialistInfo: {
        flexDirection: 'column',
        flex: 1,
    },
    specialistName: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    company: {
        fontSize: 14,
        color: colors.text,
    },
});

export default OrdersScreen;