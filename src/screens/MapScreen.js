import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { setLocation } from '../store/slices/userSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const friends = useSelector((state) => state.friends.list);

  // Состояния
  const [region, setRegion] = useState({
    latitude: 55.7558,
    longitude: 37.6173,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const [isIncognitoMode, setIsIncognitoMode] = useState(false);
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [displayPanelVisible, setDisplayPanelVisible] = useState(false);
  const [chatOverlayVisible, setChatOverlayVisible] = useState(false);
  const [pedometerOverlayVisible, setPedometerOverlayVisible] = useState(false);
  const [meetupOverlayVisible, setMeetupOverlayVisible] = useState(false);
  const [routeOverlayVisible, setRouteOverlayVisible] = useState(false);
  const [userCardVisible, setUserCardVisible] = useState(false);
  const [balloonMenuVisible, setBalloonMenuVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [showFriendRoutes, setShowFriendRoutes] = useState(true);
  
  // Настройки фильтров
  const [filterSettings, setFilterSettings] = useState({
    friends: true,
    online: true,
    nearby: true,
    new: true,
    radius: 5,
  });
  
  // Настройки отображения
  const [displaySettings, setDisplaySettings] = useState({
    all: true,
    friends: true,
    online: true,
    new: true,
    friendMarker: 'blue',
  });
  
  // Для анимации выезжающего меню
  const balloonMenuTranslateY = useRef(new Animated.Value(height)).current;
  const balloonMenuHeight = useRef(new Animated.Value(120)).current;
  
  // Ссылки
  const mapRef = useRef(null);
  
  // Инициализация геолокации
  useEffect(() => {
    getLocation();
  }, []);
  
  // Запуск автообновления
  useEffect(() => {
    const interval = setInterval(() => {
      updateLocation();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Анимация выезжающего меню
  useEffect(() => {
    if (balloonMenuVisible) {
      Animated.spring(balloonMenuTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    } else {
      Animated.spring(balloonMenuTranslateY, {
        toValue: height,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    }
  }, [balloonMenuVisible]);
  
  // Получение местоположения
  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Разрешение на доступ к местоположению не предоставлено');
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      dispatch(setLocation(newLocation));
      setRegion({
        ...newLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      // Центрируем карту
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...newLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } catch (error) {
      console.error('Ошибка получения местоположения:', error);
    }
  };
  
  // Обновление местоположения
  const updateLocation = async () => {
    try {
      let location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      dispatch(setLocation(newLocation));
    } catch (error) {
      console.error('Ошибка обновления местоположения:', error);
    }
  };
  
  // Центрирование на пользователе
  const centerOnUser = () => {
    if (user.location && mapRef.current) {
      mapRef.current.animateToRegion({
        ...user.location,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
      
      // Подсветка местоположения
      setTimeout(() => {
        if (mapRef.current && user.location) {
          mapRef.current.animateToRegion({
            ...user.location,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 500);
        }
      }, 1100);
    }
  };
  
  // Переключение режима инкогнито
  const toggleIncognitoMode = () => {
    setIsIncognitoMode(!isIncognitoMode);
    Alert.alert(
      'Режим инкогнито',
      isIncognitoMode ? 'Ваше местоположение теперь видно на карте' : 'Ваше местоположение скрыто на карте'
    );
  };
  
  // Показать карточку пользователя
  const showUserCard = (friend) => {
    setSelectedUser(friend);
    setUserCardVisible(true);
  };
  
  // Показать выезжающее меню
  const showBalloonMenu = (friend) => {
    setSelectedUser(friend);
    setBalloonMenuVisible(true);
  };
  
  // Скрыть выезжающее меню
  const hideBalloonMenu = () => {
    setBalloonMenuVisible(false);
  };
  
  // Построить маршрут
  const buildRoute = () => {
    if (!selectedUser || !user.location) {
      Alert.alert('Ошибка', 'Не удалось построить маршрут');
      return;
    }
    
    // Для демонстрации создаем простой маршрут
    const route = {
      coordinates: [
        user.location,
        { latitude: selectedUser.latitude, longitude: selectedUser.longitude }
      ],
      strokeColor: '#34eb89',
      strokeWidth: 4,
    };
    
    setCurrentRoute(route);
    setRouteOverlayVisible(true);
    hideBalloonMenu();
    
    Alert.alert('Маршрут построен', `Маршрут до ${selectedUser.name} успешно построен`);
  };
  
  // Открыть чат с пользователем
  const openChat = () => {
    if (selectedUser) {
      Alert.alert('Чат', `Открывается чат с ${selectedUser.name}`);
      // В реальном приложении здесь будет навигация на экран чата
      setUserCardVisible(false);
      setBalloonMenuVisible(false);
    }
  };
  
  // Создать встречу
  const createMeetup = () => {
    Alert.alert('Создание встречи', 'Функционал создания встречи');
    // В реальном приложении здесь будет открытие формы создания встречи
  };
  
  // Открыть шагомер
  const openPedometer = () => {
    Alert.alert('Шагомер', 'Функционал шагомера');
    // В реальном приложении здесь будет открытие экрана шагомера
  };
  
  // Отфильтрованные друзья для отображения
  const getFilteredFriends = () => {
    return friends.filter(friend => {
      if (!filterSettings.friends) return false;
      if (filterSettings.online && friend.status !== 'online') return false;
      if (filterSettings.new && !friend.isNew) return false;
      
      // Фильтр по расстоянию
      if (filterSettings.nearby && user.location) {
        const distance = calculateDistance(
          user.location,
          friend.location
        );
        if (distance > filterSettings.radius) return false;
      }
      
      return true;
    });
  };
  
  // Расчет расстояния между точками
  const calculateDistance = (pos1, pos2) => {
    if (!pos1 || !pos2) return Infinity;
    
    const R = 6371;
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Цвет маркера в зависимости от настроек
  const getMarkerColor = (friend) => {
    if (friend.id === user.uid) {
      return isIncognitoMode ? '#FF4444' : '#2CB4FF';
    }
    
    const isOnline = friend.status === 'online';
    switch(displaySettings.friendMarker) {
      case 'green': return isOnline ? '#34eb89' : '#2a7a2a';
      case 'red': return isOnline ? '#ff4444' : '#992222';
      case 'purple': return isOnline ? '#B970FE' : '#663399';
      case 'gold': return isOnline ? '#FFD700' : '#B8860B';
      default: return isOnline ? '#2CB4FF' : '#1a5a7a';
    }
  };
  
  // Инициализация свайпа для выезжающего меню
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          balloonMenuTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 50) {
          hideBalloonMenu();
        } else {
          Animated.spring(balloonMenuTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1222" />
      
      {/* Заголовок */}
      <View style={styles.header}>
        <View style={styles.logoTitle}>
          <Text style={styles.appLogo}>meetup</Text>
          <Text style={styles.appSubtitle}>Карта друзей</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => Alert.alert('Профиль', 'Переход в профиль')}
        >
          <Icon name="person" size={24} color="#fff" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Контейнер карты */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          showsUserLocation={!isIncognitoMode}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          customMapStyle={mapStyle}
        >
          {/* Маркер текущего пользователя (если не в режиме инкогнито) */}
          {!isIncognitoMode && user.location && (
            <Marker
              coordinate={user.location}
              title="Вы"
              description="Ваше местоположение"
            >
              <View style={[styles.userMarker, { borderColor: '#2CB4FF' }]}>
                <Icon name="person" size={20} color="#fff" />
              </View>
            </Marker>
          )}
          
          {/* Маркеры друзей */}
          {getFilteredFriends().map(friend => (
            <Marker
              key={friend.id}
              coordinate={friend.location}
              title={friend.name}
              description={friend.status === 'online' ? 'В сети' : 'Не в сети'}
              onPress={() => showBalloonMenu(friend)}
            >
              <View style={[
                styles.friendMarker,
                { 
                  backgroundColor: getMarkerColor(friend),
                  borderColor: getMarkerColor(friend),
                }
              ]}>
                <Text style={styles.markerInitials}>
                  {friend.name ? friend.name.substring(0, 2).toUpperCase() : '??'}
                </Text>
              </View>
            </Marker>
          ))}
          
          {/* Текущий маршрут */}
          {currentRoute && (
            <Polyline
              coordinates={currentRoute.coordinates}
              strokeColor={currentRoute.strokeColor}
              strokeWidth={currentRoute.strokeWidth}
            />
          )}
          
          {/* Круг вокруг пользователя для фильтра "рядом" */}
          {filterSettings.nearby && user.location && (
            <Circle
              center={user.location}
              radius={filterSettings.radius * 1000}
              fillColor="rgba(44, 180, 255, 0.1)"
              strokeColor="rgba(44, 180, 255, 0.3)"
              strokeWidth={1}
            />
          )}
        </MapView>
        
        {/* Панель управления справа */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={() => setChatOverlayVisible(true)}
          >
            <Icon name="chat" size={24} color="#2CB4FF" />
            <View style={styles.chatNotificationBadge}>
              <Text style={styles.chatNotificationBadgeText}>5</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={openPedometer}
          >
            <Icon name="directions_walk" size={24} color="#2CB4FF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.mapControlButton, isIncognitoMode && styles.mapControlButtonActive]}
            onPress={toggleIncognitoMode}
          >
            <Icon 
              name={isIncognitoMode ? "visibility_off" : "visibility_off"} 
              size={24} 
              color={isIncognitoMode ? "#fff" : "#2CB4FF"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={() => setDisplayPanelVisible(true)}
          >
            <Icon name="people" size={24} color="#2CB4FF" />
          </TouchableOpacity>
        </View>
        
        {/* Панель маршрутов слева */}
        <View style={styles.routeControls}>
          <TouchableOpacity 
            style={styles.routeButton}
            onPress={() => setShowFriendRoutes(!showFriendRoutes)}
          >
            <Icon name="route" size={24} color="#34eb89" />
          </TouchableOpacity>
          
          {currentRoute && (
            <TouchableOpacity 
              style={styles.routeButton}
              onPress={() => setCurrentRoute(null)}
            >
              <Icon name="clear" size={24} color="#34eb89" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Плавающие кнопки внизу */}
        <View style={styles.floatingButtons}>
          <TouchableOpacity 
            style={styles.fabSecondary}
            onPress={centerOnUser}
          >
            <Icon name="navigation" size={24} color="#2CB4FF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.fabOrange}
            onPress={createMeetup}
          >
            <Icon name="event" size={24} color="#fff" />
            <Text style={styles.fabOrangeText}>Создать встречу</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.fabSecondary}
            onPress={() => Alert.alert('Добавить друга', 'Функционал добавления друга')}
          >
            <Icon name="person_add" size={24} color="#2CB4FF" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Карточка пользователя */}
      <Modal
        visible={userCardVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUserCardVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.userCard}>
            <TouchableOpacity 
              style={styles.userCardClose}
              onPress={() => setUserCardVisible(false)}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.userCardHeader}>
              <View style={styles.userCardAvatar}>
                <Text style={styles.userCardAvatarText}>
                  {selectedUser?.name ? selectedUser.name.substring(0, 2).toUpperCase() : '??'}
                </Text>
              </View>
              <View style={styles.userCardInfo}>
                <Text style={styles.userCardName}>{selectedUser?.name || 'Пользователь'}</Text>
                <View style={styles.userCardStatus}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: selectedUser?.status === 'online' ? '#34eb89' : '#888' }
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: selectedUser?.status === 'online' ? '#34eb89' : '#888' }
                  ]}>
                    {selectedUser?.status === 'online' ? 'В сети' : 'Не в сети'}
                  </Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.userCardDetails}>
              {selectedUser?.description || 'Нет описания профиля'}
            </Text>
            
            <View style={styles.userCardActions}>
              <TouchableOpacity 
                style={[styles.userCardButton, styles.chatButton]}
                onPress={openChat}
              >
                <Icon name="chat" size={20} color="#2CB4FF" />
                <Text style={styles.userCardButtonText}>Написать</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.userCardButton, styles.routeButton]}
                onPress={buildRoute}
              >
                <Icon name="directions" size={20} color="#34eb89" />
                <Text style={styles.userCardButtonText}>Маршрут</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.userCardButton, styles.profileButton]}
                onPress={() => Alert.alert('Профиль', 'Переход в профиль пользователя')}
              >
                <Icon name="person" size={20} color="#fff" />
                <Text style={styles.userCardButtonText}>Профиль</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Выезжающее меню (балун) */}
      <Animated.View 
        style={[
          styles.balloonMenu,
          {
            transform: [{ translateY: balloonMenuTranslateY }],
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.balloonMenuSwipeHandle} />
        <View style={styles.balloonMenuHeader}>
          <Text style={styles.balloonMenuTitle}>Быстрые действия</Text>
          <TouchableOpacity 
            style={styles.balloonMenuClose}
            onPress={hideBalloonMenu}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.balloonMenuContent}>
          <View style={styles.balloonMenuIcon}>
            <Icon name="chat" size={24} color="#fff" />
          </View>
          <View style={styles.balloonMenuInfo}>
            <Text style={styles.balloonMenuUserName}>
              {selectedUser?.name || 'Пользователь'}
            </Text>
            <View style={styles.balloonMenuDistance}>
              <Icon name="straight" size={16} color="#9FAFD4" />
              <Text style={styles.balloonMenuDistanceValue}>
                {selectedUser && user.location 
                  ? calculateDistance(user.location, selectedUser.location) < 1
                    ? `${Math.round(calculateDistance(user.location, selectedUser.location) * 1000)} м`
                    : `${calculateDistance(user.location, selectedUser.location).toFixed(1)} км`
                  : '...'}
              </Text>
              <Text style={styles.balloonMenuDistanceText}>от вас</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.balloonMenuRouteButton}
            onPress={buildRoute}
          >
            <Icon name="directions" size={20} color="#fff" />
            <Text style={styles.balloonMenuRouteButtonText}>Маршрут</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      {/* Модальное окно фильтров */}
      <Modal
        visible={filterPanelVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterPanelVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterPanel}>
            <Text style={styles.filterPanelTitle}>Фильтры карты</Text>
            
            <View style={styles.filterOption}>
              <Switch
                value={filterSettings.friends}
                onValueChange={(value) => setFilterSettings({...filterSettings, friends: value})}
                trackColor={{ false: '#767577', true: '#2CB4FF' }}
                thumbColor={filterSettings.friends ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.filterOptionText}>Друзья</Text>
            </View>
            
            <View style={styles.filterOption}>
              <Switch
                value={filterSettings.online}
                onValueChange={(value) => setFilterSettings({...filterSettings, online: value})}
                trackColor={{ false: '#767577', true: '#2CB4FF' }}
                thumbColor={filterSettings.online ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.filterOptionText}>Только онлайн</Text>
            </View>
            
            <View style={styles.filterOption}>
              <Switch
                value={filterSettings.nearby}
                onValueChange={(value) => setFilterSettings({...filterSettings, nearby: value})}
                trackColor={{ false: '#767577', true: '#2CB4FF' }}
                thumbColor={filterSettings.nearby ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.filterOptionText}>Рядом со мной</Text>
            </View>
            
            <View style={styles.filterOption}>
              <Switch
                value={filterSettings.new}
                onValueChange={(value) => setFilterSettings({...filterSettings, new: value})}
                trackColor={{ false: '#767577', true: '#2CB4FF' }}
                thumbColor={filterSettings.new ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.filterOptionText}>Новые пользователи</Text>
            </View>
            
            <View style={styles.radiusContainer}>
              <Text style={styles.radiusLabel}>
                Радиус поиска: {filterSettings.radius} км
              </Text>
              <TextInput
                style={styles.radiusInput}
                value={filterSettings.radius.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text) || 1;
                  setFilterSettings({...filterSettings, radius: Math.min(50, Math.max(1, value))});
                }}
                keyboardType="numeric"
              />
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setFilterPanelVisible(false)}
            >
              <Text style={styles.closeButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Модальное окно отображения */}
      <Modal
        visible={displayPanelVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDisplayPanelVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.displayPanel}>
            <Text style={styles.displayPanelTitle}>Отображение пользователей</Text>
            
            <View style={styles.displayOption}>
              <View style={styles.displayOptionLeft}>
                <View style={[styles.displayColorIndicator, styles.colorAll]} />
                <Text style={styles.displayOptionText}>Все пользователи</Text>
              </View>
              <Switch
                value={displaySettings.all}
                onValueChange={(value) => setDisplaySettings({...displaySettings, all: value})}
                trackColor={{ false: '#767577', true: '#2CB4FF' }}
                thumbColor={displaySettings.all ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.displayOption}>
              <View style={styles.displayOptionLeft}>
                <View style={[styles.displayColorIndicator, styles.colorFriends]} />
                <Text style={styles.displayOptionText}>Только друзья</Text>
              </View>
              <Switch
                value={displaySettings.friends}
                onValueChange={(value) => setDisplaySettings({...displaySettings, friends: value})}
                trackColor={{ false: '#767577', true: '#2CB4FF' }}
                thumbColor={displaySettings.friends ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.displayOption}>
              <View style={styles.displayOptionLeft}>
                <View style={[styles.displayColorIndicator, styles.colorOnline]} />
                <Text style={styles.displayOptionText}>Только онлайн</Text>
              </View>
              <Switch
                value={displaySettings.online}
                onValueChange={(value) => setDisplaySettings({...displaySettings, online: value})}
                trackColor={{ false: '#767577', true: '#2CB4FF' }}
                thumbColor={displaySettings.online ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.displayOption}>
              <View style={styles.displayOptionLeft}>
                <View style={[styles.displayColorIndicator, styles.colorNew]} />
                <Text style={styles.displayOptionText}>Новые пользователи</Text>
              </View>
              <Switch
                value={displaySettings.new}
                onValueChange={(value) => setDisplaySettings({...displaySettings, new: value})}
                trackColor={{ false: '#767577', true: '#2CB4FF' }}
                thumbColor={displaySettings.new ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setDisplayPanelVisible(false)}
            >
              <Text style={styles.closeButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Индикатор автообновления */}
      <View style={styles.autoUpdateIndicator}>
        <Icon name="autorenew" size={16} color="#34eb89" />
        <Text style={styles.autoUpdateText}>Автообновление: 30с</Text>
      </View>
    </SafeAreaView>
  );
}

const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#0B1222"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#746855"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#242f3e"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#263c3f"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#6b9a76"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#38414e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#212a37"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9ca5b3"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#746855"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#1f2835"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#f3d19c"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2f3948"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#515c6d"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1222',
  },
  header: {
    backgroundColor: '#181F31',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  logoTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appLogo: {
    fontSize: 24,
    fontWeight: '800',
    backgroundGradient: 'linear-gradient(135deg, #2CB4FF 0%, #B970FE 100%)',
    backgroundClip: 'text',
    textFillColor: 'transparent',
  },
  appSubtitle: {
    color: '#9FAFD4',
    fontSize: 14,
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2CB4FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 100,
    gap: 10,
  },
  mapControlButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#181F31',
    borderWidth: 2,
    borderColor: '#2CB4FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  mapControlButtonActive: {
    backgroundColor: '#2CB4FF',
  },
  chatNotificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatNotificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  routeControls: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    zIndex: 99,
    gap: 10,
  },
  routeButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#181F31',
    borderWidth: 2,
    borderColor: '#34eb89',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: 20,
    zIndex: 100,
  },
  fabSecondary: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#181F31',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  fabOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFA500',
    borderRadius: 16,
    minHeight: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  fabOrangeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  userMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2CB4FF',
    borderWidth: 3,
    borderColor: '#2CB4FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  friendMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  markerInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  userCard: {
    backgroundColor: '#181F31',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    position: 'relative',
  },
  userCardClose: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
  },
  userCardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  userCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
  },
  userCardDetails: {
    fontSize: 14,
    color: '#9FAFD4',
    marginBottom: 20,
    lineHeight: 20,
  },
  userCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  userCardButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatButton: {
    backgroundColor: 'rgba(44, 180, 255, 0.2)',
  },
  routeButton: {
    backgroundColor: 'rgba(52, 235, 137, 0.2)',
  },
  profileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  userCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  balloonMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#181F31',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  balloonMenuSwipeHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  balloonMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  balloonMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  balloonMenuClose: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balloonMenuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  balloonMenuIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2CB4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balloonMenuInfo: {
    flex: 1,
  },
  balloonMenuUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  balloonMenuDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balloonMenuDistanceValue: {
    color: '#34eb89',
    fontWeight: '600',
    fontSize: 14,
  },
  balloonMenuDistanceText: {
    fontSize: 14,
    color: '#9FAFD4',
  },
  balloonMenuRouteButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#34eb89',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
  },
  balloonMenuRouteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterPanel: {
    backgroundColor: '#181F31',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 300,
  },
  filterPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  filterOptionText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  radiusContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  radiusLabel: {
    color: '#9FAFD4',
    fontSize: 12,
    marginBottom: 8,
  },
  radiusInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    padding: 10,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  displayPanel: {
    backgroundColor: '#181F31',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 300,
  },
  displayPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  displayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  displayOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  displayColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#181F31',
  },
  colorAll: {
    backgroundColor: '#2CB4FF',
  },
  colorFriends: {
    backgroundColor: '#2CB4FF',
  },
  colorOnline: {
    backgroundColor: '#34eb89',
  },
  colorNew: {
    backgroundColor: '#FFD166',
  },
  displayOptionText: {
    fontSize: 14,
    color: '#fff',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  autoUpdateIndicator: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
  },
  autoUpdateText: {
    color: '#34eb89',
    fontSize: 12,
  },
});

// Примечание: Для градиентного текста в React Native требуется дополнительная библиотека
// Например, react-native-linear-gradient или mask-view
