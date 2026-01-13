// ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';

const { width, height } = Dimensions.get('window');

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [aboutText, setAboutText] = useState('');
  const [stats, setStats] = useState({
    friendsCount: 0,
    kmThisWeek: 0,
    onlineHours: 0,
  });
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');

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
        setAboutText(userData.about || '');
        
        // Загрузка статистики
        const statsData = await calculateRealStats(userData);
        setStats(statsData);
        
        // Проверка Telegram
        if (userData.telegram) {
          setTelegramConnected(true);
          setTelegramUsername(userData.telegram.username);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const calculateRealStats = async (userData) => {
    // Реализация расчета статистики
    // Для демо - случайные значения
    return {
      friendsCount: Math.floor(Math.random() * 50) + 1,
      kmThisWeek: (Math.random() * 100).toFixed(1),
      onlineHours: Math.floor(Math.random() * 100) + 1,
    };
  };

  const toggleInvisible = async () => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      invisible: !user.invisible,
    };
    
    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const updateAboutText = async (text) => {
    if (text.length <= 140) {
      setAboutText(text);
      
      if (user) {
        const updatedUser = {
          ...user,
          about: text,
        };
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    }
  };

  const copyReferralLink = async () => {
    const link = 'https://kivanort.github.io/@Ivan';
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(link);
    } else {
      await Clipboard.setString(link);
    }
    Alert.alert('Успех', 'Ссылка скопирована в буфер обмена');
  };

  const shareProfile = async () => {
    // Открываем экран ShareProfileScreen вместо стандартного шаринга
    navigation.navigate('ShareProfileScreen');
  };

  const shareQRCode = async () => {
    // Реализация шаринга QR кода
    Alert.alert('Информация', 'Функция шаринга QR кода в разработке');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удаление аккаунта',
      'Вы уверены, что хотите удалить аккаунт? Все данные будут удалены через 30 дней.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('currentUser');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Загрузка...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Кнопка назад */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.profileCard}>
          {/* Аватар */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              style={styles.avatar}
              onPress={() => Alert.alert('Загрузка фото', 'Функция в разработке')}
            >
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="person" size={50} color="#888" />
                </View>
              )}
            </TouchableOpacity>
            
            {/* Кнопка поделиться */}
            <TouchableOpacity style={styles.shareButton} onPress={shareProfile}>
              <Icon name="share" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Ник и ID */}
          <Text style={styles.nickname}>{user.nickname || 'Пользователь'}</Text>
          <Text style={styles.userId}>ID: {user.id?.substring(0, 8)}...</Text>

          {/* Telegram статус */}
          {telegramConnected && (
            <View style={styles.telegramStatus}>
              <Icon name="telegram" size={20} color="#0088cc" />
              <Text style={styles.telegramText}>
                Telegram: <Text style={styles.telegramUsername}>@{telegramUsername}</Text>
              </Text>
            </View>
          )}

          {/* Статус онлайн */}
          <View style={styles.statusRow}>
            <View style={[
              styles.statusIndicator, 
              user.invisible ? styles.statusInvisible : styles.statusOnline
            ]} />
            <Text style={styles.statusText}>
              {user.invisible ? 'Скрыт' : 'В сети'}
            </Text>
          </View>

          {/* О себе */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>О себе</Text>
            <View style={styles.aboutContainer}>
              <TextInput
                style={styles.aboutInput}
                multiline
                placeholder="Расскажите о себе..."
                placeholderTextColor="#888"
                value={aboutText}
                onChangeText={updateAboutText}
                maxLength={140}
              />
              <Text style={styles.charCounter}>
                {aboutText.length}/140
              </Text>
            </View>
          </View>

          {/* Статистика */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.friendsCount}</Text>
              <Text style={styles.statLabel}>Друзей</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.kmThisWeek}</Text>
              <Text style={styles.statLabel}>Пройдено за неделю, км</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.onlineHours}</Text>
              <Text style={styles.statLabel}>Время в онлайне, ч</Text>
            </View>
          </View>

          {/* Реферальная секция */}
          <View style={styles.referralSection}>
            <View style={styles.referralTitle}>
              <Icon name="person-add" size={20} color="#00FFFF" />
              <Text style={styles.referralTitleText}>Пригласить друзей</Text>
            </View>
            
            <View style={styles.referralLinkContainer}>
              <TouchableOpacity 
                style={styles.referralInput}
                onPress={copyReferralLink}
              >
                <Text style={styles.referralLinkText} numberOfLines={1}>
                  https://kivanort.github.io/@Ivan
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.copyButton} onPress={copyReferralLink}>
                <Text style={styles.buttonText}>Копировать</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.qrButton}
                onPress={() => setQrModalVisible(true)}
              >
                <Icon name="qr-code" size={18} color="#FFF" />
                <Text style={styles.buttonText}>Мой QR</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.referralInfo}>
              Отправьте эту ссылку или QR-код друзьям. При регистрации по ссылке они автоматически добавятся к вам в друзья.
            </Text>
          </View>

          {/* Кнопки действий */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.invisibleButton]}
              onPress={toggleInvisible}
            >
              <Icon 
                name={user.invisible ? "visibility" : "visibility-off"} 
                size={20} 
                color="#00FFFF" 
              />
              <Text style={styles.actionButtonText}>
                {user.invisible ? 'Показать местоположение' : 'Скрыть местоположение'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.settingsButton]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="settings" size={20} color="#888" />
              <Text style={styles.actionButtonText}>Настройки профиля</Text>
            </TouchableOpacity>
          </View>

          {/* Кнопка Telegram */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.telegramButton]}
            onPress={() => navigation.navigate('TelegramSettings')}
          >
            <Icon name="telegram" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Telegram</Text>
          </TouchableOpacity>

          {/* Разделитель */}
          <View style={styles.divider} />

          {/* Дополнительная информация */}
          <View style={styles.extraInfo}>
            <Text style={styles.extraText}>
              Дата регистрации: {new Date(user.registeredAt).toLocaleDateString('ru-RU')}
            </Text>
            <Text style={styles.extraText}>
              Последний вход: Только что
            </Text>
            {user.email && (
              <Text style={styles.extraText}>
                Email: {user.email}
              </Text>
            )}
          </View>

          {/* Кнопка удаления аккаунта */}
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
          >
            <Icon name="delete-forever" size={20} color="#FFF" />
            <Text style={styles.deleteButtonText}>Удалить аккаунт</Text>
          </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Мой QR-код для друзей</Text>
            
            <View style={styles.qrContainer}>
              <QRCode
                value={`meetup://add-friend/${user.id}/${encodeURIComponent(user.nickname || 'Пользователь')}`}
                size={200}
                backgroundColor="#FFF"
                color="#000"
              />
            </View>
            
            <Text style={styles.modalDescription}>
              Покажите этот QR-код другу для добавления в друзья
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Закрыть</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.shareButtonModal]}
                onPress={shareQRCode}
              >
                <Icon name="share" size={18} color="#FFF" />
                <Text style={styles.modalButtonText}>Поделиться</Text>
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
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 46,
    height: 46,
    backgroundColor: 'rgba(36,36,36,0.88)',
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  profileCard: {
    backgroundColor: 'rgba(30,30,30,0.9)',
    borderRadius: 16,
    margin: 20,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00FFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    position: 'absolute',
    right: -10,
    bottom: 5,
    width: 42,
    height: 42,
    backgroundColor: 'rgba(0, 255, 255, 0.9)',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  nickname: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 5,
  },
  userId: {
    fontSize: 12,
    color: '#888',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  telegramStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 136, 204, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 136, 204, 0.2)',
  },
  telegramText: {
    color: '#FFF',
    fontSize: 14,
  },
  telegramUsername: {
    fontWeight: '600',
    color: '#0088cc',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusIndicator: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#222',
  },
  statusOnline: {
    backgroundColor: '#00FFFF',
  },
  statusInvisible: {
    backgroundColor: '#FF0000',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    opacity: 0.88,
  },
  aboutSection: {
    width: '100%',
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    marginBottom: 6,
  },
  aboutContainer: {
    position: 'relative',
  },
  aboutInput: {
    width: '100%',
    minHeight: 68,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#efefef',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  charCounter: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    fontSize: 12,
    color: '#888',
    backgroundColor: 'rgba(36,36,36,0.71)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 28,
    gap: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(30,30,30,0.7)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minWidth: 77,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    opacity: 0.76,
  },
  referralSection: {
    width: '100%',
    marginVertical: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  referralTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  referralTitleText: {
    fontSize: 14,
    color: '#00FFFF',
    fontWeight: '600',
  },
  referralLinkContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  referralInput: {
    flex: 1,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 8,
  },
  referralLinkText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 255, 255, 0.9)',
    borderRadius: 8,
    justifyContent: 'center',
  },
  qrButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '500',
  },
  referralInfo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginTop: 29,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 13,
    borderRadius: 12,
  },
  invisibleButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
  },
  settingsButton: {
    backgroundColor: 'rgba(51,51,51,0.9)',
  },
  telegramButton: {
    backgroundColor: 'rgba(0, 136, 204, 0.9)',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(51,51,51,0.3)',
    marginVertical: 24,
  },
  extraInfo: {
    width: '100%',
    gap: 5,
  },
  extraText: {
    fontSize: 12,
    color: '#888',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4444',
    paddingVertical: 13,
    borderRadius: 12,
    width: '100%',
    maxWidth: 270,
    marginTop: 16,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(30,30,30,0.9)',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 350,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    color: '#00FFFF',
    fontWeight: '600',
    marginBottom: 16,
  },
  qrContainer: {
    padding: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginVertical: 16,
  },
  modalDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  shareButtonModal: {
    backgroundColor: 'rgba(0, 255, 255, 0.9)',
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: '500',
  },
});

export default ProfileScreen;
