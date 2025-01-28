import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image, TextInput, Alert, Keyboard, KeyboardAvoidingView, TouchableWithoutFeedback, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTechnician } from "../../../context/TechnicianContext";

const Review: React.FC = () => {
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState('');
  const [, setReviewData] = useState<{ rating: number; description: string | null }>({
    rating: 0,
    description: null,
  });
  const router = useRouter();

  const { technician, setTechnician } = useTechnician()

  const commentsMap: { [key: number]: string } = {
    1: 'Poor',
    2: 'Fair',
    3: 'OK',
    4: 'Good',
    5: 'Excellent',
  };

  const handlePress = (value: number) => {
    setRating(value);
  };

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a comment before submitting.');
      return;
    }

    const data = { rating, description };
    setReviewData(data);
    Alert.alert('Review Data:', JSON.stringify(data));

    setDescription('');
    setTechnician(null);
    router.replace("/");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.container}>
      
      <SafeAreaView style={styles.technicianContainer}>
        {technician && (
          <Image
            source={{
              uri: technician.photo,
            }}
            style={styles.technicianPhoto}
          />
        )}
        {technician && <Text style={styles.technicianName}>{technician.firstName}</Text>}
      </SafeAreaView>
      <SafeAreaView style={styles.ratingContainer}>
        <Text style={styles.comment}>{commentsMap[rating]}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((value) => (
            <TouchableOpacity key={value} onPress={() => handlePress(value)}>
              <AntDesign
                name={value <= rating ? 'star' : 'staro'}
                size={70}
                color={value <= rating ? '#FFD700' : '#ccc'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingText}>{rating} / 5</Text>
        <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}>
          <TextInput
          style={styles.descriptionInput}
          placeholder={`Leave a comment for your ${rating}-star rating`}
          placeholderTextColor={"#aaa"}
          value={description}
          onChangeText={setDescription}
          onEndEditing={() =>  Keyboard.dismiss()}
          />
        </KeyboardAvoidingView>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>DONE</Text>
        </TouchableOpacity>
      </SafeAreaView>
      
    </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ddd',
    alignItems: 'center',
  },
  technicianContainer: {
    width: "100%",
    alignItems: 'center',
  },
  technicianPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    margin: 20,
  },
  technicianName: {
    fontSize: 28,
    marginBottom: 30,
  },
  ratingContainer: {
    flex: 1,
    width: "100%",
    alignItems: 'center',
    backgroundColor: "white",
  },
  comment: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 30
  },
  starsContainer: {
    width: "100%",
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    marginVertical: 16,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  inputContainer: {
    flex: 1,
    width: "100%",
    alignItems: 'center',
  },
  descriptionInput: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  submitButton: {
    backgroundColor: '#222',
    padding: 18,
    width: "90%",
    alignItems: "center",
    borderRadius: 5,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default Review;