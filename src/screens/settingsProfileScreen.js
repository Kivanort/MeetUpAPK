// SettingsProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const SettingsProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [telegramModalVisible, setTelegramModalVisible] = useState(false);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Поля для смены пароля
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Поля для Telegram
  const [telegramUsername, setTelegramUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [telegramStatus, setTelegramStatus] = useState(null);
  
  // Ошибки
  const [passwordErrors, setPasswordErrors] = useState({});
  const [telegramErrors, setTelegramErrors] = useState({});

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
        
        // Проверяем статус Telegram
        if (userData.telegram) {
          setTelegramStatus(userData.telegram);
        }
        
        // Проверяем статус удаления
        if (userData.scheduledForDeletion) {
          const deletionTime = new Date(userData.scheduledForDeletion);
          setDeletionInfo({
            time: deletionTime,
            active: true,
          });
        }
        
        // Настройки уведомлений
        setNotificationsEnabled(userData.notifications !== false);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const validatePassword = () => {
    const errors = {};
    
    if (!currentPassword) {
      errors.current = 'Введите текущий пароль';
    } else if (currentPassword.length < 6) {
      errors.current = 'Пароль слишком короткий';
    }
    
    if (!newPassword) {
      errors.new = 'Введите новый пароль';
    } else if (newPassword.length < 8) {
      errors.new = 'Пароль должен содержать минимум 8 символов';
    } else if (!/[a-zа-я]/i.test(newPassword)) {
      errors.new = 'Пароль должен содержать буквы';
    } else if (!/\d/.test(newPassword)) {
      errors.new = 'Пароль должен содержать цифры';
    }
    
    if (newPassword !== confirmPassword) {
      errors.confirm = 'Пароли не совпадают';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const changePassword = async () => {
    if (!validatePassword()) {
      return;
    }
    
    try {
      // Здесь должна быть реальная проверка текущего пароля
      // и обновление в базе данных
      
      Alert.alert('Успех', 'Пароль успешно изменен');
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось изменить пароль');
    }
  };

  const validateTelegramUsername = () => {
    const errors = {};
    
    if (!telegramUsername.trim()) {
      errors.username = 'Введите Telegram username';
    } else if (telegramUsername.length < 5) {
      errors.username = 'Username слишком короткий';
    } else if (telegramUsername.includes('@')) {
      errors.username = 'Не используйте символ @';
    }
    
    setTelegramErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const bindTelegramAccount = () => {
    if (!validateTelegramUsername()) {
      return;
    }
    
    // Симуляция привязки Telegram
    setTelegramModalVisible(true);
    
    // В реальном приложении здесь будет запрос к API
    setTimeout(() => {
      const demoCode = Math.floor(100000 + Math.random() * 900000).toString();
      Alert.alert(
        'Код отправлен',
        `Демо-код для @${telegramUsername}: ${demoCode}\n\nВ реальном приложении код будет отправлен в Telegram`,
        [{ text: 'OK', onPress: () => setVerificationModalVisible(true) }]
      );
      setTelegramModalVisible(false);
    }, 2000);
  };

  const verifyTelegramCode = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Ошибка', 'Введите 6-значный код');
      return;
    }
    
    // Симуляция верификации
    const newTelegramStatus = {
      username: telegramUsername,
      verified: true,
    };
    
    setTelegramStatus(newTelegramStatus);
    setVerificationModalVisible(false);
    setVerificationCode('');
    setTelegramUsername('');
    
    // Обновляем данные пользователя
    if (user) {
      const updatedUser = {
        ...user,
        telegram: newTelegramStatus,
      };
      setUser(updatedUser);
      AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
    
    Alert.alert('Успех', 'Telegram аккаунт успешно привязан');
  };

  const unbindTelegramAccount = () => {
    Alert.alert(
      'Отвязать Telegram',
      'Вы уверены, что хотите отвязать Telegram аккаунт?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отвязать',
          style: 'destructive',
          onPress: () => {
            setTelegramStatus(null);
            if (user) {
              const updatedUser = { ...user };
              delete updatedUser.telegram;
              setUser(updatedUser);
              AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
            Alert.alert('Успех', 'Telegram аккаунт отвязан');
          },
        },
      ]
    );
  };

  const sendVerificationCode = () => {
    // Симуляция отправки кода
    const demoCode = Math.floor(100000 + Math.random() * 900000).toString();
    Alert.alert(
      'Код отправлен',
      `Демо-код для подтверждения: ${demoCode}\n\nВ реальном приложении код будет отправлен в Telegram`
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удаление аккаунта',
      'Ваш аккаунт будет немедленно деактивирован. Все данные будут полностью удалены через 30 дней. В течение этого времени вы можете отменить удаление.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              // Помечаем аккаунт для удаления
              const deletionDate = new Date();
              deletionDate.setDate(deletionDate.getDate() + 30);
              
              if (user) {
                const updatedUser = {
                  ...user,
                  scheduledForDeletion: deletionDate.getTime(),
                  active: false,
                  status: 'deactivated',
                };
                
                await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
                setUser(updatedUser);
                setDeletionInfo({
                  time: deletionDate,
                  active: true,
                });
                
                Alert.alert(
                  'Аккаунт помечен на удаление',
                  'Ваш аккаунт будет удален через 30 дней. В течение этого времени вы можете отменить удаление.',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              }
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить аккаунт');
            }
          },
        },
      ]
    );
  };

  const cancelDeletion = async () => {
    try {
      if (user) {
        const updatedUser = { ...user };
        delete updatedUser.scheduledForDeletion;
        updatedUser.active = true;
        updatedUser.status = 'online';
        
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setDeletionInfo(null);
        
        Alert.alert('Успех', 'Удаление аккаунта отменено');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отменить удаление');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('currentUser');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const toggleNotifications = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    
    if (user) {
      const updatedUser = {
        ...user,
        notifications: newValue,
      };
      setUser(updatedUser);
      AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  const formatDeletionTime = (date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `Осталось ${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
    }
    return 'Удаление сегодня';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView}>
          {/* Кнопка назад */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#00FFFF" />
          </TouchableOpacity>

          <View style={styles.settingsCard}>
            {/* Заголовок */}
            <LinearGradient
              colors={['#00FFFF', '#9400D3']}
              style={styles.titleGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.titleText}>Настройки профиля</Text>
            </LinearGradient>

            <View style={styles.settingsOptions}>
              {/* Telegram Integration */}
              <View style={styles.settingsSection}>
                <View style={styles.sectionLabel}>
                  <Icon name="telegram" size={20} color="#0088cc" />
                  <Text style={styles.sectionLabelText}>Telegram интеграция</Text>
                </View>

                {telegramStatus ? (
                  <View style={[
                    styles.telegramStatusContainer,
                    telegramStatus.verified ? styles.telegramVerified : styles.telegramPending
                  ]}>
                    <Icon name="telegram" size={24} color="#0088cc" />
                    <View style={styles.telegramInfo}>
                      <Text style={styles.telegramUsername}>@{telegramStatus.username}</Text>
                      <Text style={[
                        styles.telegramStatusText,
                        { color: telegramStatus.verified ? '#2ED573' : '#FFA500' }
                      ]}>
                        <Icon 
                          name={telegramStatus.verified ? "check-circle" : "schedule"} 
                          size={14} 
                          color={telegramStatus.verified ? '#2ED573' : '#FFA500'} 
                        />
                        {telegramStatus.verified ? ' Подтвержден' : ' Ожидает подтверждения'}
                      </Text>
                    </View>
                    <View style={styles.telegramActions}>
                      {!telegramStatus.verified && (
                        <TouchableOpacity 
                          style={[styles.telegramButton, styles.verifyButton]}
                          onPress={sendVerificationCode}
                        >
                          <Icon name="mail" size={16} color="#FFF" />
                          <Text style={styles.telegramButtonText}>Код</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={[styles.telegramButton, styles.unbindButton]}
                        onPress={unbindTelegramAccount}
                      >
                        <Icon name="link-off" size={16} color="#FFF" />
                        <Text style={styles.telegramButtonText}>Отвязать</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.bindTelegramButton}
                      onPress={() => setTelegramModalVisible(true)}
                    >
                      <Icon name="link" size={20} color="#FFF" />
                      <Text style={styles.bindTelegramText}>Привязать Telegram аккаунт</Text>
                    </TouchableOpacity>
                    <Text style={styles.telegramHint}>
                      Привяжите Telegram для восстановления пароля и получения уведомлений
                    </Text>
                  </>
                )}
              </View>

              {/* Безопасность аккаунта */}
              <View style={styles.settingsSection}>
                <View style={styles.sectionLabel}>
                  <Icon name="lock" size={20} color="#00FFFF" />
                  <Text style={styles.sectionLabelText}>Безопасность аккаунта</Text>
                </View>

                <TouchableOpacity 
                  style={styles.changePasswordButton}
                  onPress={() => setPasswordModalVisible(true)}
                >
                  <Icon name="key" size={20} color="#00FFFF" />
                  <Text style={styles.changePasswordText}>Сменить пароль</Text>
                </TouchableOpacity>
              </View>

              {/* Уведомления */}
              <View style={styles.settingsSection}>
                <View style={styles.sectionLabel}>
                  <Icon name="notifications" size={20} color="#00FFFF" />
                  <Text style={styles.sectionLabelText}>Уведомления</Text>
                </View>

                <View style={styles.notificationContainer}>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={toggleNotifications}
                    trackColor={{ false: '#767577', true: '#00FFFF' }}
                    thumbColor={notificationsEnabled ? '#FFF' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                  />
                  <Text style={styles.notificationLabel}>Push-уведомления</Text>
                </View>
              </View>

              {/* Сессия */}
              <View style={styles.settingsSection}>
                <View style={styles.sectionLabel}>
                  <Icon name="exit-to-app" size={20} color="#FF9500" />
                  <Text style={styles.sectionLabelText}>Сессия</Text>
                </View>

                <TouchableOpacity 
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <Icon name="logout" size={20} color="#FFF" />
                  <Text style={styles.logoutText}>Выйти из аккаунта</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Информация об отложенном удалении */}
            {deletionInfo?.active && (
              <View style={styles.deletionInfo}>
                <View style={styles.deletionTitle}>
                  <Icon name="warning" size={20} color="#FF4757" />
                  <Text style={styles.deletionTitleText}>Аккаунт помечен на удаление</Text>
                </View>
                <Text style={styles.deletionText}>
                  Ваш аккаунт будет полностью удален через:
                </Text>
                <View style={styles.deletionTimer}>
                  <Text style={styles.deletionTimerText}>
                    {formatDeletionTime(deletionInfo.time)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.cancelDeletionButton}
                  onPress={cancelDeletion}
                >
                  <Icon name="undo" size={18} color="#FFF" />
                  <Text style={styles.cancelDeletionText}>Отменить удаление</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Кнопка удаления аккаунта */}
            {!deletionInfo?.active && (
              <View style={styles.deleteAccountRow}>
                <TouchableOpacity 
                  style={styles.deleteAccountButton}
                  onPress={handleDeleteAccount}
                >
                  <Icon name="delete-forever" size={20} color="#FFF" />
                  <Text style={styles.deleteAccountText}>Удалить аккаунт</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Модальное окно смены пароля */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={passwordModalVisible}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Смена пароля</Text>
            
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Текущий пароль</Text>
              <TextInput
                style={[styles.formInput, passwordErrors.current && styles.inputError]}
                placeholder="Введите текущий пароль"
                placeholderTextColor="#888"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              {passwordErrors.current && (
                <Text style={styles.errorText}>{passwordErrors.current}</Text>
              )}
            </View>
            
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Новый пароль</Text>
              <TextInput
                style={[styles.formInput, passwordErrors.new && styles.inputError]}
                placeholder="Введите новый пароль"
                placeholderTextColor="#888"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              {passwordErrors.new && (
                <Text style={styles.errorText}>{passwordErrors.new}</Text>
              )}
              <Text style={styles.formHint}>
                Пароль должен содержать минимум 8 символов, буквы и цифры
              </Text>
            </View>
            
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Подтвердите новый пароль</Text>
              <TextInput
                style={[styles.formInput, passwordErrors.confirm && styles.inputError]}
                placeholder="Повторите новый пароль"
                placeholderTextColor="#888"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              {passwordErrors.confirm && (
                <Text style={styles.errorText}>{passwordErrors.confirm}</Text>
              )}
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordErrors({});
                }}
              >
                <Text style={styles.cancelButtonText}>Отменить</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={changePassword}
              >
                <Icon name="save" size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно привязки Telegram */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={telegramModalVisible}
        onRequestClose={() => setTelegramModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.telegramModalHeader}>
              <Icon name="telegram" size={28} color="#0088cc" />
              <Text style={styles.telegramModalTitle}>Привязка Telegram</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              Введите ваш Telegram username (без @) для привязки аккаунта.
              После отправки кода подтверждения вы получите 6-значный код в Telegram.
            </Text>
            
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Telegram username</Text>
              <TextInput
                style={[styles.formInput, telegramErrors.username && styles.inputError]}
                placeholder="например, username"
                placeholderTextColor="#888"
                value={telegramUsername}
                onChangeText={setTelegramUsername}
                maxLength={32}
              />
              {telegramErrors.username && (
                <Text style={styles.errorText}>{telegramErrors.username}</Text>
              )}
              <Text style={styles.formHint}>Без символа @ в начале</Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTelegramModalVisible(false);
                  setTelegramUsername('');
                  setTelegramErrors({});
                }}
              >
                <Text style={styles.cancelButtonText}>Отменить</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.telegramBindButton]}
                onPress={bindTelegramAccount}
              >
                <Icon name="link" size={18} color="#FFF" />
                <Text style={styles.telegramBindButtonText}>Привязать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модальное окно верификации Telegram */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={verificationModalVisible}
        onRequestClose={() => setVerificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.telegramModalHeader}>
              <Icon name="telegram" size={28} color="#0088cc" />
              <Text style={styles.telegramModalTitle}>Подтверждение Telegram</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              Введите 6-значный код, который был отправлен вам в Telegram.
              Код действителен 10 минут.
            </Text>
            
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Код подтверждения</Text>
              <TextInput
                style={styles.formInput}
                placeholder="000000"
                placeholderTextColor="#888"
                value={verificationCode}
                onChangeText={setVerificationCode}
                maxLength={6}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.resendButton]}
                onPress={sendVerificationCode}
              >
                <Icon name="refresh" size={18} color="#FFF" />
                <Text style={styles.resendButtonText}>Отправить код повторно</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.verifyButtonModal]}
                onPress={verifyTelegramCode}
              >
                <Icon name="check-circle" size={18} color="#FFF" />
                <Text style={styles.verifyButtonText}>Подтвердить</Text>
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
    backgroundColor: '#0c0c0c',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(35, 35, 45, 0.8)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsCard: {
    backgroundColor: 'rgba(35, 35, 45, 0.95)',
    borderRadius: 20,
    margin: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleGradient: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.02,
    color: 'transparent',
  },
  settingsOptions: {
    width: '100%',
    gap: 25,
  },
  settingsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  sectionLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
    letterSpacing: 0.02,
  },
  telegramStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  telegramVerified: {
    backgroundColor: 'rgba(46, 213, 115, 0.1)',
    borderColor: 'rgba(46, 213, 115, 0.2)',
  },
  telegramPending: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderColor: 'rgba(255, 165, 0, 0.2)',
  },
  telegramInfo: {
    flex: 1,
  },
  telegramUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  telegramStatusText: {
    fontSize: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telegramActions: {
    flexDirection: 'row',
    gap: 8,
  },
  telegramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyButton: {
    backgroundColor: 'rgba(46, 213, 115, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(46, 213, 115, 0.3)',
  },
  unbindButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  telegramButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  bindTelegramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  bindTelegramText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  telegramHint: {
    fontSize: 13,
    color: '#A4B0BE',
    marginTop: 10,
    lineHeight: 16,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  changePasswordText: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
  },
  notificationLabel: {
    fontSize: 15,
    color: '#E0E0E0',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  logoutText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  deletionInfo: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 14,
    padding: 20,
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  deletionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  deletionTitleText: {
    color: '#FF4757',
    fontSize: 17,
    fontWeight: '700',
  },
  deletionText: {
    color: '#A4B0BE',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  deletionTimer: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  deletionTimerText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cancelDeletionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(46, 213, 115, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(46, 213, 115, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  cancelDeletionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteAccountRow: {
    marginTop: 40,
    alignItems: 'center',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  deleteAccountText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'rgba(35, 35, 45, 0.95)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#00FFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  telegramModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
  },
  telegramModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0088cc',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#A4B0BE',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  formField: {
    marginBottom: 20,
  },
  formLabel: {
    color: '#B0B0B0',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 2,
    borderColor: '#2A2A3A',
    borderRadius: 10,
    padding: 14,
    color: '#FFF',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#FF4757',
    backgroundColor: 'rgba(255, 71, 87, 0.05)',
  },
  errorText: {
    color: '#FF4757',
    fontSize: 12,
    marginTop: 5,
  },
  formHint: {
    color: '#747D8C',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  telegramBindButton: {
    backgroundColor: 'rgba(0, 136, 204, 0.2)',
  },
  telegramBindButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    backgroundColor: 'rgba(0, 136, 204, 0.2)',
  },
  resendButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyButtonModal: {
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default SettingsProfileScreen;
