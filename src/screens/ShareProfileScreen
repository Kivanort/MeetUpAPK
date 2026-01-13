// ShareProfileScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  Share,
  Platform,
  Animated,
  Easing,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const ShareProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [stars, setStars] = useState([]);
  const animationValues = useRef([]);

  // Анимированные звезды
  useEffect(() => {
    createStars();
  }, []);

  const createStars = () => {
    const starCount = 12;
    const newStars = [];
    const newAnimations = [];

    for (let i = 0; i < starCount; i++) {
      const star = {
        id: i,
        left: 5 + Math.random() * 90,
        top: 5 + Math.random() * 90,
        size: 20 + Math.random() * 25,
        opacity: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
        rotation: Math.random() > 0.5 ? 1 : -1,
      };
      newStars.push(star);

      // Создаем анимированное значение для каждой звезды
      const animValue = new Animated.Value(0);
      newAnimations.push(animValue);

      // Запускаем анимацию
      Animated.loop(
        Animated.sequence([
          Animated.delay(star.delay * 1000),
          Animated.parallel([
            Animated.timing(animValue, {
              toValue: 1,
              duration: star.duration * 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: star.duration * 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
              delay: star.duration * 500,
            }),
          ]),
        ])
      ).start();
    }

    animationValues.current = newAnimations;
    setStars(newStars);
  };

  // Загрузка данных пользователя
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('currentUser');
      if (userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const getShareLink = () => {
    return user ? `https://meetup.com/@${user.nickname}` : 'https://meetup.com';
  };

  const copyLink = async () => {
    const link = getShareLink();
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(link);
    } else {
      await Clipboard.setString(link);
    }
    
    Alert.alert('Успех', 'Ссылка скопирована в буфер обмена');
  };

  const shareSimple = async () => {
    try {
      const link = getShareLink();
      const result = await Share.share({
        message: `Привет! Добавь меня в друзья в приложении MeetUP: ${link}`,
        title: 'Добавь меня в друзья в MeetUP!',
        url: link,
      });
    } catch (error) {
      console.log('Ошибка шаринга:', error);
    }
  };

  const shareTelegram = () => {
    const link = getShareLink();
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Привет! Добавь меня в друзья в MeetUP: ${user?.nickname || ''}`)}`;
    
    Alert.alert(
      'Поделиться в Telegram',
      'Открыть ссылку для Telegram?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Открыть', 
          onPress: () => {
            // В React Native используем Linking для открытия URL
            // Linking.openURL(telegramUrl).catch(err => console.error('Ошибка открытия URL:', err));
            Alert.alert('Информация', 'В реальном приложении здесь будет открываться Telegram');
          }
        },
      ]
    );
  };

  const shareWhatsApp = () => {
    const link = getShareLink();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Привет! Добавь меня в друзья в приложении MeetUP: ${link}`)}`;
    
    Alert.alert(
      'Поделиться в WhatsApp',
      'Открыть ссылку для WhatsApp?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Открыть', 
          onPress: () => {
            Alert.alert('Информация', 'В реальном приложении здесь будет открываться WhatsApp');
          }
        },
      ]
    );
  };

  const shareQRCode = async () => {
    Alert.alert('Поделиться QR-кодом', 'Функция поделиться QR-кодом в разработке');
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#FFF' }}>Загрузка...</Text>
      </View>
    );
  }

  const firstLetter = user.nickname?.charAt(0).toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.container}>
      {/* Анимированные звезды на фоне */}
      {stars.map((star, index) => {
        const animatedStyle = {
          transform: [
            {
              translateY: animationValues.current[index]?.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -15],
              }) || 0,
            },
            {
              rotate: animationValues.current[index]?.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', `${star.rotation * 5}deg`],
              }) || '0deg',
            },
          ],
          opacity: animationValues.current[index] || 0,
        };

        return (
          <Animated.View
            key={star.id}
            style={[
              styles.star,
              {
                left: `${star.left}%`,
                top: `${star.top}%`,
                fontSize: star.size,
                opacity: star.opacity,
              },
              animatedStyle,
            ]}
          >
            <Text style={styles.starText}>⭐</Text>
          </Animated.View>
        );
      })}

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.shareContainer}>
          {/* Кнопка закрытия */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Логотип */}
          <LinearGradient
            colors={['#FFD700', '#FF1493']}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.logoText}>MEETUP</Text>
          </LinearGradient>

          {/* Аватар пользователя */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#FFD700', '#FF1493']}
              style={styles.avatarFrame}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {user.avatar ? (
                <Image 
                  source={{ uri: user.avatar }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>{firstLetter}</Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Информация пользователя */}
          <View style={styles.userInfo}>
            <LinearGradient
              colors={['#FFD700', '#FF1493']}
              style={styles.usernameGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.usernameText}>@{user.nickname?.toUpperCase()}</Text>
            </LinearGradient>
            
            <Text style={styles.userLink} numberOfLines={1}>
              {getShareLink().replace('https://', '')}
            </Text>
          </View>

          {/* Кнопки действий */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.copyButton]}
              onPress={copyLink}
            >
              <Icon name="content-copy" size={22} color="#000" />
              <Text style={styles.actionButtonTextBlack}>Копировать ссылку</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.qrButton]}
              onPress={() => setQrModalVisible(true)}
            >
              <Icon name="qr-code-2" size={22} color="#FFF" />
              <Text style={styles.actionButtonText}>QR-код</Text>
            </TouchableOpacity>
          </View>

          {/* Призыв */}
          <LinearGradient
            colors={['#FFD700', '#FF1493']}
            style={styles.callToActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.callToActionText}>Скорее зови друзей!</Text>
          </LinearGradient>

          {/* Кнопки социальных сетей */}
          <View style={styles.socialShare}>
            <TouchableOpacity 
              style={[styles.socialButton, styles.shareSimpleButton]}
              onPress={shareSimple}
            >
              <Icon name="share" size={24} color="#FFF" />
              <Text style={styles.socialButtonText}>Поделиться просто</Text>
            </TouchableOpacity>
            
            <View style={styles.socialRow}>
              <TouchableOpacity 
                style={[styles.socialButton, styles.telegramButton]}
                onPress={shareTelegram}
              >
                <Icon name="telegram" size={24} color="#FFF" />
                <Text style={styles.socialButtonText}>Телеграм</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.socialButton, styles.whatsappButton]}
                onPress={shareWhatsApp}
              >
                <Icon name="chat" size={24} color="#FFF" />
                <Text style={styles.socialButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Модальное окно QR кода */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={qrModalVisible}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#FFD700', '#FF1493']}
              style={styles.modalTitleGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.modalTitleText}>Мой QR-код</Text>
            </LinearGradient>
            
            <View style={styles.qrContainer}>
              <QRCode
                value={getShareLink()}
                size={200}
                backgroundColor="#FFF"
                color="#000"
              />
            </View>
            
            <Text style={styles.modalDescription}>
              Отсканируйте, чтобы добавить меня в друзья
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.closeModalButton]}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Закрыть</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.shareModalButton]}
                onPress={shareQRCode}
              >
                <Icon name="share" size={18} color="#000" />
                <Text style={styles.modalButtonTextBlack}>Поделиться</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  star: {
    position: 'absolute',
    zIndex: 0,
    pointerEvents: 'none',
  },
  starText: {
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  shareContainer: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoGradient: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 30,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    color: 'transparent',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    marginBottom: 25,
  },
  avatarFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70 - 8,
    borderWidth: 3,
    borderColor: '#000',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 70 - 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
  },
  avatarPlaceholderText: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  usernameGradient: {
    paddingHorizontal: 15,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  usernameText: {
    fontSize: 24,
    fontWeight: '700',
    color: 'transparent',
  },
  userLink: {
    fontSize: 16,
    color: '#AAAAAA',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    marginBottom: 35,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
  },
  copyButton: {
    backgroundColor: '#FFD700',
  },
  qrButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextBlack: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  callToActionGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 35,
  },
  callToActionText: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'transparent',
  },
  socialShare: {
    width: '100%',
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    width: '100%',
  },
  shareSimpleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  telegramButton: {
    flex: 1,
    backgroundColor: '#0088CC',
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25D366',
  },
  socialButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 24,
    padding: 30,
    width: '90%',
    maxWidth: 300,
    alignItems: 'center',
  },
  modalTitleGradient: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalTitleText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'transparent',
  },
  qrContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginVertical: 20,
  },
  modalDescription: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  shareModalButton: {
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalButtonTextBlack: {
    color: '#000',
    fontWeight: '600',
  },
});

export default ShareProfileScreen;
