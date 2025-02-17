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

const renderStars = (rating: number) => {
    if(!rating) return;
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
    const { technician } = useAuth();
    const [photo, setPhoto] = useState({ uri: technician?.photo || '' });
    const orders = technician?.jobs || [];

    const renderItem = ({ item }: { item: typeof orders[0] }) => (
        <View style={styles.orderCard} key={item.id}>
            <View style={styles.orderHeader}>
                <View style={styles.headerSection}>
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.orderDate}>
                        {new Date(item.date).toLocaleString('en-us', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: false,
                        })}
                    </Text>
                </View>
                <View style={styles.headerSection}>
                    <Text style={styles.label}>Rating</Text>
                    {renderStars(item.TechnicianReview?.rating)}
                </View>
            </View>
            <View style={styles.orderBody}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.orderAddress}>address</Text>
                <Text style={styles.label}>Type of work</Text>
                <Text style={styles.orderAddress}>{item.service.name}</Text>
                <Text style={styles.label}>Client</Text>
                <View style={styles.specialistContainer}>
                    <Image source={{ uri: item.user.photo }} style={styles.specialistPhoto} />
                    <View style={styles.specialistInfo}>
                        <Text style={styles.specialistName}>
                            {item.user.firstName} {item.user.lastName}
                        </Text>
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
                    <Image source={photo} style={styles.profileImage} />
                </Link>
            </View>
            {orders.length === 0 ? (
                <View style={styles.noOrdersContainer}>
                    <Text style={styles.noOrdersText}>No orders done</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.ordersList}>
                    {orders.slice().reverse().map((order) => renderItem({ item: order }))}
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
        justifyContent: 'center',
        padding: 15,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 500,
    },
    headerLink: {
        position: 'absolute',
        right: 15,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
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
