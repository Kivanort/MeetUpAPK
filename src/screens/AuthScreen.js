import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
  StatusBar,
  BackHandler
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function AuthScreen({ navigation }) {
  // Состояния для навигации между экранами
  const [currentView, setCurrentView] = useState('main'); // 'main', 'login', 'register', 'forgot-email', 'forgot-code', 'new-password', 'forgot-telegram', 'forgot-telegram-code'
  
  // Состояния для форм
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  const [registerNickname, setRegisterNickname] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [avatar, setAvatar] = useState(null);
  
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [telegramUsername, setTelegramUsername] = useState('');
  const [tgResetCode, setTgResetCode] = useState(['', '', '', '', '', '']);
  
  // Состояния для UI
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [referralInfo, setReferralInfo] = useState(null);
  const [timer, setTimer] = useState(300); // 5 минут
  const [tgTimer, setTgTimer] = useState(600); // 10 минут
  const [timerActive, setTimerActive] = useState(false);
  const [tgTimerActive, setTgTimerActive] = useState(false);
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  
  // Анимации
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Запуск анимации при монтировании
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
    
    // Проверка реферального кода
    checkReferralCode();
    
    // Проверка авторизации
    checkAuth();
    
    // Настройка обработчика кнопки "Назад" на Android
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }
  }, []);
  
  // Таймер для кода восстановления
  useEffect(() => {
    let interval;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer]);
  
  // Таймер для Telegram кода
  useEffect(() => {
    let interval;
    if (tgTimerActive && tgTimer > 0) {
      interval = setInterval(() => {
        setTgTimer(prev => prev - 1);
      }, 1000);
    } else if (tgTimer === 0) {
      setTgTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [tgTimerActive, tgTimer]);
  
  const handleBackPress = () => {
    if (currentView !== 'main') {
      setCurrentView('main');
      return true;
    }
    return false;
  };
  
  const checkAuth = async () => {
    try {
      const user = await AsyncStorage.getItem('current_user');
      if (user) {
        navigation.replace('Main');
      }
    } catch (error) {
      console.log('Ошибка проверки авторизации:', error);
    }
  };
  
  const checkReferralCode = () => {
    // Здесь будет логика проверки реферального кода из deep link
    // Пока что просто демо
    // const refCode = 'DEMO123';
    // setReferralInfo(`Регистрация по приглашению от друга`);
  };
  
  const handleLogin = async () => {
    setLoading(true);
    setErrors({});
    
    try {
      // Демо-пользователь для тестирования
      if (loginEmail === 'moderator2025@mail.ru' && loginPassword === 'TestMeetUp2025') {
        const user = {
          id: 'beta_moderator_001',
          email: 'moderator2025@mail.ru',
          nickname: 'Moderator2025',
          role: 'moderator',
          avatar: '',
          referralCode: 'BETA-MOD-2025',
        };
        
        await AsyncStorage.setItem('current_user', JSON.stringify(user));
        navigation.replace('Main');
        return;
      }
      
      // Здесь будет реальная логика авторизации
      // Пока что проверяем локально
      const usersJson = await AsyncStorage.getItem('users');
      const users = usersJson ? JSON.parse(usersJson) : [];
      
      const user = users.find(u => 
        (u.email === loginEmail || u.nickname === loginEmail) && 
        u.password === loginPassword
      );
      
      if (user) {
        await AsyncStorage.setItem('current_user', JSON.stringify(user));
        navigation.replace('Main');
      } else {
        setErrors({ login: 'Неверный email или пароль' });
      }
    } catch (error) {
      setErrors({ login: 'Ошибка входа. Попробуйте снова.' });
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegister = async () => {
    setLoading(true);
    setErrors({});
    
    // Валидация
    const validationErrors = {};
    
    if (!registerNickname || registerNickname.length < 3) {
      validationErrors.nickname = 'Никнейм должен быть не менее 3 символов';
    }
    
    if (!registerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail)) {
      validationErrors.email = 'Некорректный email';
    }
    
    if (!registerPassword || registerPassword.length < 8) {
      validationErrors.password = 'Пароль должен быть не менее 8 символов';
    } else if (!/[a-zA-Z]/.test(registerPassword)) {
      validationErrors.password = 'Пароль должен содержать буквы';
    } else if (!/\d/.test(registerPassword)) {
      validationErrors.password = 'Пароль должен содержать цифры';
    }
    
    if (registerPassword !== registerConfirmPassword) {
      validationErrors.confirm = 'Пароли не совпадают';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }
    
    try {
      // Проверяем, не занят ли email
      const usersJson = await AsyncStorage.getItem('users');
      const users = usersJson ? JSON.parse(usersJson) : [];
      
      if (users.some(u => u.email === registerEmail)) {
        setErrors({ email: 'Email уже используется' });
        setLoading(false);
        return;
      }
      
      // Создаем нового пользователя
      const newUser = {
        id: Date.now().toString(),
        email: registerEmail,
        nickname: registerNickname,
        password: registerPassword, // В реальном приложении нужно хэшировать!
        avatar: avatar,
        referralCode: generateReferralCode(),
        createdAt: new Date().toISOString(),
        referredBy: referralInfo ? 'DEMO123' : null,
      };
      
      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));
      await AsyncStorage.setItem('current_user', JSON.stringify(newUser));
      
      // Показываем уведомление об успешной регистрации
      Alert.alert('Успех!', 'Регистрация прошла успешно', [
        { text: 'OK', onPress: () => navigation.replace('Main') }
      ]);
      
    } catch (error) {
      setErrors({ general: 'Ошибка регистрации. Попробуйте снова.' });
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const generateReferralCode = () => {
    return 'REF' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };
  
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Необходимо разрешение для доступа к галерее');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    
    if (!result.canceled) {
      setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };
  
  const handleForgotEmail = async () => {
    setLoading(true);
    setErrors({});
    
    try {
      // Демо-логика отправки кода
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Сохраняем email для восстановления
      await AsyncStorage.setItem('reset_email', forgotEmail);
      
      // Переходим к вводу кода
      setCurrentView('forgot-code');
      setTimer(300);
      setTimerActive(true);
      
    } catch (error) {
      setErrors({ forgotEmail: 'Ошибка отправки кода' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCodeSubmit = async () => {
    const code = resetCode.join('');
    
    if (code.length !== 6) {
      setErrors({ code: 'Введите полный 6-значный код' });
      return;
    }
    
    // Демо-проверка кода (всегда верный код "123456")
    if (code === '123456') {
      setCurrentView('new-password');
    } else {
      setErrors({ code: 'Неверный код' });
    }
  };
  
  const handleCodeInput = (text, index) => {
    if (/^\d$/.test(text) || text === '') {
      const newCode = [...resetCode];
      newCode[index] = text;
      setResetCode(newCode);
      
      // Автопереход к следующему полю
      if (text && index < 5) {
        // Находим следующий TextInput
        // Этот переход будет обработан в onKeyPress
      }
    }
  };
  
  const handleNewPasswordSubmit = async () => {
    if (!newPassword || newPassword.length < 8) {
      setErrors({ newPassword: 'Пароль должен быть не менее 8 символов' });
      return;
    }
    
    if (newPassword !== newPasswordConfirm) {
      setErrors({ newPasswordConfirm: 'Пароли не совпадают' });
      return;
    }
    
    setLoading(true);
    
    try {
      // Демо-логика сброса пароля
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Успех!', 'Пароль успешно изменен', [
        { text: 'OK', onPress: () => {
          setCurrentView('login');
          setResetCode(['', '', '', '', '', '']);
          setNewPassword('');
          setNewPasswordConfirm('');
        }}
      ]);
      
    } catch (error) {
      setErrors({ general: 'Ошибка смены пароля' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleTelegramReset = async () => {
    if (!telegramUsername) {
      setErrors({ telegramUsername: 'Введите Telegram username' });
      return;
    }
    
    setLoading(true);
    
    try {
      // Демо-логика отправки кода в Telegram
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentView('forgot-telegram-code');
      setTgTimer(600);
      setTgTimerActive(true);
      
    } catch (error) {
      setErrors({ telegramUsername: 'Ошибка отправки кода' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleTgCodeSubmit = async () => {
    const code = tgResetCode.join('');
    
    if (code.length !== 6) {
      setErrors({ tgCode: 'Введите полный 6-значный код' });
      return;
    }
    
    // Демо-проверка кода (всегда верный код "123456")
    if (code === '123456') {
      setCurrentView('new-password');
    } else {
      setErrors({ tgCode: 'Неверный код' });
    }
  };
  
  const handleTgCodeInput = (text, index) => {
    if (/^\d$/.test(text) || text === '') {
      const newCode = [...tgResetCode];
      newCode[index] = text;
      setTgResetCode(newCode);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Рендер главного экрана
  const renderMainView = () => (
    <Animated.View 
      style={[
        styles.viewContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.logoSection}>
        <View style={styles.logoIcon}>
          <MaterialIcons name="map" size={40} color="#00FFFF" />
        </View>
        <Text style={styles.mainTitle}>Карта друзей</Text>
      </View>
      
      {referralInfo && (
        <View style={styles.referralBadge}>
          <MaterialIcons name="person_add" size={16} color="#00FFFF" />
          <Text style={styles.referralText}>{referralInfo}</Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.buttonPrimary}
        onPress={() => setCurrentView('login')}
      >
        <LinearGradient
          colors={['#00FFFF', '#9400D3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <MaterialIcons name="vpn_key" size={20} color="white" />
          <Text style={styles.buttonPrimaryText}>Войти</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.buttonPrimary}
        onPress={() => setCurrentView('register')}
      >
        <LinearGradient
          colors={['#00FFFF', '#9400D3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <MaterialIcons name="person_add" size={20} color="white" />
          <Text style={styles.buttonPrimaryText}>Зарегистрироваться</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>или</Text>
        <View style={styles.dividerLine} />
      </View>
      
      <TouchableOpacity 
        style={styles.buttonSecondary}
        onPress={() => Alert.alert('Внимание', 'Интеграция с Google будет добавлена позже')}
      >
        <Text style={[styles.buttonSecondaryText, { color: '#4285F4', fontWeight: 'bold' }]}>G</Text>
        <Text style={styles.buttonSecondaryText}>Войти через Google</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.buttonSecondary}
        onPress={() => Alert.alert('Внимание', 'Интеграция с Apple будет добавлена позже')}
      >
        <MaterialIcons name="apple" size={20} color="white" />
        <Text style={styles.buttonSecondaryText}>Войти через Apple</Text>
      </TouchableOpacity>
    </Animated.View>
  );
  
  // Рендер формы входа
  const renderLoginView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.viewContainer}>
        <Text style={styles.formTitle}>Вход</Text>
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="person" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email или никнейм"
              placeholderTextColor="#666666"
              value={loginEmail}
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Пароль"
              placeholderTextColor="#666666"
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry={!showLoginPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.togglePassword}
              onPress={() => setShowLoginPassword(!showLoginPassword)}
            >
              <MaterialIcons 
                name={showLoginPassword ? "visibility" : "visibility_off"} 
                size={20} 
                color="#888888" 
              />
            </TouchableOpacity>
          </View>
          {errors.login && (
            <View style={[styles.message, styles.errorMessage]}>
              <MaterialIcons name="error" size={16} color="#FF4444" />
              <Text style={styles.errorText}>{errors.login}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient
            colors={['#00FFFF', '#9400D3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color="white" />
                <Text style={styles.buttonPrimaryText}>Войти</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.formLinks}>
          <TouchableOpacity onPress={() => setShowMethodSelection(true)}>
            <Text style={styles.formLink}>Забыли пароль?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentView('register')}>
            <Text style={styles.formLink}>Нет аккаунта? Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
  
  // Рендер формы регистрации
  const renderRegisterView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.viewContainer}>
        <Text style={styles.formTitle}>Регистрация</Text>
        
        {referralInfo && (
          <View style={styles.referralBadge}>
            <MaterialIcons name="person_add" size={16} color="#00FFFF" />
            <Text style={styles.referralText}>{referralInfo}</Text>
          </View>
        )}
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="person" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Никнейм"
              placeholderTextColor="#666666"
              value={registerNickname}
              onChangeText={setRegisterNickname}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.nickname && (
            <View style={[styles.message, styles.errorMessage]}>
              <MaterialIcons name="error" size={16} color="#FF4444" />
              <Text style={styles.errorText}>{errors.nickname}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="email" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666666"
              value={registerEmail}
              onChangeText={setRegisterEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.email && (
            <View style={[styles.message, styles.errorMessage]}>
              <MaterialIcons name="error" size={16} color="#FF4444" />
              <Text style={styles.errorText}>{errors.email}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Пароль"
              placeholderTextColor="#666666"
              value={registerPassword}
              onChangeText={setRegisterPassword}
              secureTextEntry={!showRegisterPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.togglePassword}
              onPress={() => setShowRegisterPassword(!showRegisterPassword)}
            >
              <MaterialIcons 
                name={showRegisterPassword ? "visibility" : "visibility_off"} 
                size={20} 
                color="#888888" 
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <View style={[styles.message, styles.errorMessage]}>
              <MaterialIcons name="error" size={16} color="#FF4444" />
              <Text style={styles.errorText}>{errors.password}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="check_circle" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Подтвердите пароль"
              placeholderTextColor="#666666"
              value={registerConfirmPassword}
              onChangeText={setRegisterConfirmPassword}
              secureTextEntry={!showRegisterPassword}
              autoCapitalize="none"
            />
          </View>
          {errors.confirm && (
            <View style={[styles.message, styles.errorMessage]}>
              <MaterialIcons name="error" size={16} color="#FF4444" />
              <Text style={styles.errorText}>{errors.confirm}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarPreview} onPress={pickImage}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <MaterialIcons name="person" size={28} color="#888888" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.buttonAvatar} onPress={pickImage}>
            <MaterialIcons name="photo_camera" size={16} color="white" />
            <Text style={styles.buttonAvatarText}>Добавить фото</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={handleRegister}
          disabled={loading}
        >
          <LinearGradient
            colors={['#00FFFF', '#9400D3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="person_add" size={20} color="white" />
                <Text style={styles.buttonPrimaryText}>Создать аккаунт</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.formLinks}>
          <TouchableOpacity onPress={() => setCurrentView('login')}>
            <Text style={styles.formLink}>Уже есть аккаунт? Войти</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
  
  // Рендер формы восстановления по email
  const renderForgotEmailView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.viewContainer}>
        <Text style={styles.formTitle}>Восстановление пароля</Text>
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="email" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ваш email"
              placeholderTextColor="#666666"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.forgotEmail && (
            <View style={[styles.message, styles.errorMessage]}>
              <MaterialIcons name="error" size={16} color="#FF4444" />
              <Text style={styles.errorText}>{errors.forgotEmail}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={handleForgotEmail}
          disabled={loading}
        >
          <LinearGradient
            colors={['#00FFFF', '#9400D3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color="white" />
                <Text style={styles.buttonPrimaryText}>Отправить код</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.formLinks}>
          <TouchableOpacity onPress={() => setCurrentView('login')}>
            <Text style={styles.formLink}>Вернуться к входу</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
  
  // Рендер формы ввода кода
  const renderForgotCodeView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.viewContainer}>
        <Text style={styles.formTitle}>Введите код</Text>
        
        <Text style={styles.codeInfo}>
          Код отправлен на <Text style={styles.emailHighlight}>{forgotEmail}</Text>
        </Text>
        
        <View style={styles.codeInputsContainer}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <TextInput
              key={index}
              style={styles.codeInput}
              maxLength={1}
              keyboardType="number-pad"
              value={resetCode[index]}
              onChangeText={(text) => handleCodeInput(text, index)}
              textAlign="center"
              placeholder="0"
              placeholderTextColor="#666666"
            />
          ))}
        </View>
        
        {errors.code && (
          <View style={[styles.message, styles.errorMessage]}>
            <MaterialIcons name="error" size={16} color="#FF4444" />
            <Text style={styles.errorText}>{errors.code}</Text>
          </View>
        )}
        
        {timerActive && (
          <Text style={styles.timer}>
            Отправить код повторно через: {formatTime(timer)}
          </Text>
        )}
        
        <TouchableOpacity 
          style={[styles.buttonSecondary, styles.resendButton]}
          onPress={() => {
            setTimer(300);
            setTimerActive(true);
            Alert.alert('Успех', 'Новый код отправлен');
          }}
          disabled={timerActive}
        >
          <Text style={[
            styles.buttonSecondaryText,
            timerActive && styles.disabledText
          ]}>
            Отправить код повторно
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={handleCodeSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#00FFFF', '#9400D3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="check_circle" size={20} color="white" />
                <Text style={styles.buttonPrimaryText}>Продолжить</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.formLinks}>
          <TouchableOpacity onPress={() => setCurrentView('forgot-email')}>
            <Text style={styles.formLink}>Изменить email</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
  
  // Рендер формы нового пароля
  const renderNewPasswordView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.viewContainer}>
        <Text style={styles.formTitle}>Новый пароль</Text>
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Новый пароль"
              placeholderTextColor="#666666"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.togglePassword}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <MaterialIcons 
                name={showNewPassword ? "visibility" : "visibility_off"} 
                size={20} 
                color="#888888" 
              />
            </TouchableOpacity>
          </View>
          {errors.newPassword && (
            <View style={[styles.message, styles.errorMessage]}>
              <MaterialIcons name="error" size={16} color="#FF4444" />
              <Text style={styles.errorText}>{errors.newPassword}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="check_circle" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Подтвердите пароль"
              placeholderTextColor="#666666"
              value={newPasswordConfirm}
              onChangeText={setNewPasswordConfirm}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
            />
          </View>
          {errors.newPasswordConfirm && (
            <View style={[styles.message, styles.errorMessage]}>
              <MaterialIcons name="error" size={16} color="#FF4444" />
              <Text style={styles.errorText}>{errors.newPasswordConfirm}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={handleNewPasswordSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#00FFFF', '#9400D3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="lock_reset" size={20} color="white" />
                <Text style={styles.buttonPrimaryText}>Сбросить пароль</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
  
  // Рендер формы восстановления через Telegram
  const renderForgotTelegramView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.viewContainer}>
        <Text style={styles.formTitle}>Сброс пароля через Telegram</Text>
        
        <Text style={styles.codeInfo}>
          Введите ваш Telegram username для получения кода
        </Text>
        
        <View style={styles.formGroup}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="telegram" size={20} color="#888888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="@username"
              placeholderTextColor="#666666"
              value={telegramUsername}
              onChangeText={setTelegramUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.telegramUsername && (
            <View style={[styles.message, styles.errorMessage]}>
              <MaterialIcons name="error" size={16} color="#FF4444" />
              <Text style={styles.errorText}>{errors.telegramUsername}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={handleTelegramReset}
          disabled={loading}
        >
          <LinearGradient
            colors={['#0088cc', '#34b7f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color="white" />
                <Text style={styles.buttonPrimaryText}>Отправить код в Telegram</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.formLinks}>
          <TouchableOpacity onPress={() => setCurrentView('forgot-email')}>
            <Text style={styles.formLink}>Сбросить через email</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentView('login')}>
            <Text style={styles.formLink}>Вернуться к входу</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
  
  // Рендер формы ввода Telegram кода
  const renderForgotTelegramCodeView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.viewContainer}>
        <Text style={styles.formTitle}>Код из Telegram</Text>
        
        <Text style={styles.codeInfo}>
          Код отправлен в Telegram <Text style={styles.emailHighlight}>@{telegramUsername}</Text>
        </Text>
        
        <View style={styles.codeInputsContainer}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <TextInput
              key={index}
              style={styles.codeInput}
              maxLength={1}
              keyboardType="number-pad"
              value={tgResetCode[index]}
              onChangeText={(text) => handleTgCodeInput(text, index)}
              textAlign="center"
              placeholder="0"
              placeholderTextColor="#666666"
            />
          ))}
        </View>
        
        {errors.tgCode && (
          <View style={[styles.message, styles.errorMessage]}>
            <MaterialIcons name="error" size={16} color="#FF4444" />
            <Text style={styles.errorText}>{errors.tgCode}</Text>
          </View>
        )}
        
        {tgTimerActive && (
          <Text style={styles.timer}>
            Отправить код повторно через: {formatTime(tgTimer)}
          </Text>
        )}
        
        <TouchableOpacity 
          style={[styles.buttonSecondary, styles.resendButton]}
          onPress={() => {
            setTgTimer(600);
            setTgTimerActive(true);
            Alert.alert('Успех', 'Новый код отправлен в Telegram');
          }}
          disabled={tgTimerActive}
        >
          <Text style={[
            styles.buttonSecondaryText,
            tgTimerActive && styles.disabledText
          ]}>
            Отправить код повторно
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={handleTgCodeSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#0088cc', '#34b7f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons name="check_circle" size={20} color="white" />
                <Text style={styles.buttonPrimaryText}>Продолжить</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.formLinks}>
          <TouchableOpacity onPress={() => setCurrentView('forgot-telegram')}>
            <Text style={styles.formLink}>Изменить Telegram username</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
  
  // Модальное окно выбора метода восстановления
  const renderMethodSelectionModal = () => (
    <Modal
      visible={showMethodSelection}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMethodSelection(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={80} style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите метод восстановления</Text>
            <Text style={styles.modalSubtitle}>
              Как вы хотите получить код для сброса пароля?
            </Text>
            
            <TouchableOpacity 
              style={[styles.buttonPrimary, styles.telegramButton]}
              onPress={() => {
                setShowMethodSelection(false);
                setCurrentView('forgot-telegram');
              }}
            >
              <LinearGradient
                colors={['#0088cc', '#34b7f1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <MaterialIcons name="telegram" size={20} color="white" />
                <Text style={styles.buttonPrimaryText}>Через Telegram</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.buttonPrimary}
              onPress={() => {
                setShowMethodSelection(false);
                setCurrentView('forgot-email');
              }}
            >
              <LinearGradient
                colors={['#00FFFF', '#9400D3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <MaterialIcons name="email" size={20} color="white" />
                <Text style={styles.buttonPrimaryText}>Через Email</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.buttonSecondary}
              onPress={() => setShowMethodSelection(false)}
            >
              <Text style={styles.buttonSecondaryText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
  
  // Определяем, какой экран рендерить
  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return renderLoginView();
      case 'register':
        return renderRegisterView();
      case 'forgot-email':
        return renderForgotEmailView();
      case 'forgot-code':
        return renderForgotCodeView();
      case 'new-password':
        return renderNewPasswordView();
      case 'forgot-telegram':
        return renderForgotTelegramView();
      case 'forgot-telegram-code':
        return renderForgotTelegramCodeView();
      default:
        return renderMainView();
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          {/* Кнопка назад (только не для главного экрана) */}
          {currentView !== 'main' && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setCurrentView('main')}
            >
              <MaterialIcons name="arrow_back" size={24} color="#00FFFF" />
            </TouchableOpacity>
          )}
          
          {renderCurrentView()}
        </View>
      </ScrollView>
      
      {renderMethodSelectionModal()}
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00FFFF" />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    minHeight: height,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 8,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    padding: 8,
  },
  viewContainer: {
    width: '100%',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#00FFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: 'transparent',
    backgroundImage: 'linear-gradient(135deg, #00FFFF, #9400D3)',
  },
  referralBadge: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00FFFF',
    borderRadius: 10,
    padding: 8,
    marginVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  referralText: {
    color: '#00FFFF',
    fontSize: 13,
  },
  buttonPrimary: {
    width: '100%',
    height: 48,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonPrimaryText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondary: {
    width: '100%',
    height: 48,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  buttonSecondaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  dividerText: {
    color: '#888888',
    fontSize: 13,
    marginHorizontal: 12,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 15,
    paddingLeft: 45,
    paddingRight: 45,
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: 14,
  },
  togglePassword: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 4,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  errorMessage: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderLeftColor: '#FF4444',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    flex: 1,
  },
  formLinks: {
    marginTop: 20,
    gap: 10,
  },
  formLink: {
    color: '#00FFFF',
    fontSize: 14,
    textAlign: 'center',
    padding: 6,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  avatarPreview: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#00FFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  buttonAvatar: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 6,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonAvatarText: {
    color: '#ffffff',
    fontSize: 13,
  },
  codeInfo: {
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  emailHighlight: {
    color: '#00FFFF',
    fontWeight: '600',
  },
  codeInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  codeInput: {
    width: 42,
    height: 50,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  timer: {
    textAlign: 'center',
    color: '#888888',
    fontSize: 13,
    marginVertical: 12,
  },
  resendButton: {
    marginTop: 12,
  },
  disabledText: {
    opacity: 0.5,
  },
  telegramButton: {
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  modalBlur: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
    backgroundImage: 'linear-gradient(135deg, #00FFFF, #9400D3)',
  },
  modalSubtitle: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
