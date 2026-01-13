// Шагомер для MeetUP (React Native версия)
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const PEDOMETER_TASK = 'pedometer-background-task';
const STORAGE_KEY = 'meetup_pedometer_stats_v2';

class PedometerService {
    constructor() {
        this.isAvailable = false;
        this.isTracking = false;
        
        // Статистика шагов
        this.stats = {
            today: 0,
            week: 0,
            month: 0,
            totalDistance: 0,
            lastUpdate: Date.now(),
            goal: 10000, // цель по умолчанию: 10,000 шагов
            lastBackgroundUpdate: Date.now(),
            stepHistory: {} // История по дням { '2024-01-14': 5000 }
        };
        
        // Подписка на обновления шагомера
        this.subscription = null;
        
        // Инициализация фоновой задачи
        this.initializeBackgroundTask();
    }
    
    // Проверка доступности шагомера
    checkAvailability = async () => {
        try {
            const isAvailable = await Pedometer.isAvailableAsync();
            this.isAvailable = isAvailable;
            console.log(`Шагомер доступен: ${isAvailable}`);
            return isAvailable;
        } catch (error) {
            console.warn('Ошибка проверки доступности шагомера:', error);
            this.isAvailable = false;
            return false;
        }
    };
    
    // Инициализация шагомера
    initialize = async () => {
        await this.checkAvailability();
        await this.loadStats();
        
        if (!this.isAvailable) {
            console.warn('Шагомер не поддерживается этим устройством');
            return false;
        }
        
        // Проверяем разрешения
        const { status } = await Pedometer.requestPermissionsAsync();
        if (status !== 'granted') {
            console.warn('Разрешение на доступ к шагомеру не предоставлено');
            return false;
        }
        
        // Запускаем отслеживание
        await this.startTracking();
        
        // Регистрируем фоновую задачу
        await this.registerBackgroundTask();
        
        return true;
    };
    
    // Загрузка статистики из AsyncStorage
    loadStats = async () => {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // Проверяем, нужно ли сбросить дневную статистику
                const lastUpdate = new Date(parsed.lastUpdate);
                const today = new Date();
                
                if (lastUpdate.getDate() !== today.getDate() || 
                    lastUpdate.getMonth() !== today.getMonth() || 
                    lastUpdate.getFullYear() !== today.getFullYear()) {
                    // Новый день - сохраняем в историю и сбрасываем сегодняшние шаги
                    const yesterdayKey = this.getDateKey(new Date(lastUpdate));
                    if (!parsed.stepHistory) parsed.stepHistory = {};
                    parsed.stepHistory[yesterdayKey] = parsed.today;
                    parsed.today = 0;
                }
                
                this.stats = { ...this.stats, ...parsed };
            }
            
            this.updateAggregatedStats();
            return true;
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            return false;
        }
    };
    
    // Сохранение статистики в AsyncStorage
    saveStats = async () => {
        try {
            this.stats.lastUpdate = Date.now();
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения статистики:', error);
            return false;
        }
    };
    
    // Начало отслеживания шагов
    startTracking = async () => {
        if (this.isTracking || !this.isAvailable) {
            return false;
        }
        
        try {
            // Получаем количество шагов за сегодня
            const end = new Date();
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            
            const pastStepCountResult = await Pedometer.getStepCountAsync(start, end);
            if (pastStepCountResult && pastStepCountResult.steps > this.stats.today) {
                const newSteps = pastStepCountResult.steps - this.stats.today;
                if (newSteps > 0) {
                    await this.addSteps(newSteps);
                }
            }
            
            // Начинаем отслеживание в реальном времени
            this.subscription = Pedometer.watchStepCount(result => {
                const newSteps = result.steps;
                if (newSteps > this.stats.today) {
                    const stepsToAdd = newSteps - this.stats.today;
                    this.addSteps(stepsToAdd);
                }
            });
            
            this.isTracking = true;
            console.log('✅ Отслеживание шагов начато');
            return true;
        } catch (error) {
            console.error('Ошибка начала отслеживания:', error);
            return false;
        }
    };
    
    // Остановка отслеживания
    stopTracking = () => {
        if (this.subscription) {
            this.subscription.remove();
            this.subscription = null;
        }
        this.isTracking = false;
        console.log('⏹️ Отслеживание шагов остановлено');
    };
    
    // Добавление шагов
    addSteps = async (steps) => {
        if (steps <= 0) return;
        
        const todayKey = this.getDateKey(new Date());
        
        this.stats.today += steps;
        this.stats.week += steps;
        this.stats.month += steps;
        
        // Обновляем историю
        if (!this.stats.stepHistory) {
            this.stats.stepHistory = {};
        }
        this.stats.stepHistory[todayKey] = (this.stats.stepHistory[todayKey] || 0) + steps;
        
        // Расчет расстояния (средний шаг = 0.76 метра)
        const distance = steps * 0.00076; // в километрах
        this.stats.totalDistance += distance;
        
        // Обновляем агрегированную статистику
        this.updateAggregatedStats();
        
        await this.saveStats();
        
        // Отправляем событие об обновлении
        this.emitUpdateEvent();
        
        return this.stats;
    };
    
    // Обновление агрегированной статистики (неделя/месяц)
    updateAggregatedStats = () => {
        if (!this.stats.stepHistory) return;
        
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        let weekTotal = 0;
        let monthTotal = 0;
        
        for (const [dateKey, steps] of Object.entries(this.stats.stepHistory)) {
            const date = new Date(dateKey);
            
            if (date >= weekAgo) {
                weekTotal += steps;
            }
            
            if (date >= monthAgo) {
                monthTotal += steps;
            }
        }
        
        // Добавляем сегодняшние шаги, если их еще нет в истории
        const todayKey = this.getDateKey(now);
        if (!this.stats.stepHistory[todayKey]) {
            weekTotal += this.stats.today;
            monthTotal += this.stats.today;
        }
        
        this.stats.week = weekTotal;
        this.stats.month = monthTotal;
    };
    
    // Получение ключа даты для истории
    getDateKey = (date) => {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    
    // Получение статистики
    getStats = () => {
        const today = new Date();
        const lastUpdate = new Date(this.stats.lastUpdate);
        
        // Сброс статистики при новом дне (на всякий случай)
        if (lastUpdate.getDate() !== today.getDate() || 
            lastUpdate.getMonth() !== today.getMonth() || 
            lastUpdate.getFullYear() !== today.getFullYear()) {
            // Новый день - сохраняем в историю
            const yesterdayKey = this.getDateKey(new Date(lastUpdate));
            if (!this.stats.stepHistory) this.stats.stepHistory = {};
            this.stats.stepHistory[yesterdayKey] = this.stats.today;
            this.stats.today = 0;
            this.saveStats();
        }
        
        return {
            ...this.stats,
            calories: Math.round(this.stats.today * 0.04), // Примерные калории
            distanceToday: this.stats.today * 0.00076,
            goalProgress: Math.min(100, (this.stats.today / this.stats.goal) * 100),
            isAvailable: this.isAvailable,
            isTracking: this.isTracking,
            stepHistory: this.stats.stepHistory || {}
        };
    };
    
    // Получение истории шагов за период
    getStepHistory = (days = 7) => {
        const history = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = this.getDateKey(date);
            const steps = this.stats.stepHistory?.[dateKey] || 0;
            
            history.push({
                date: dateKey,
                steps: steps,
                dateObject: date
            });
        }
        
        return history;
    };
    
    // Сброс статистики
    resetStats = async () => {
        this.stats = {
            today: 0,
            week: 0,
            month: 0,
            totalDistance: 0,
            lastUpdate: Date.now(),
            goal: 10000,
            lastBackgroundUpdate: Date.now(),
            stepHistory: {}
        };
        await this.saveStats();
        this.emitUpdateEvent();
        return this.stats;
    };
    
    // Установка цели
    setGoal = async (steps) => {
        this.stats.goal = Math.max(1000, Math.min(100000, steps)); // Ограничение 1000-100000 шагов
        await this.saveStats();
        this.emitUpdateEvent();
        return this.stats.goal;
    };
    
    // Имитация шагов для тестирования
    simulateSteps = async () => {
        const steps = Math.floor(Math.random() * 100) + 50; // 50-150 случайных шагов
        await this.addSteps(steps);
        return steps;
    };
    
    // Ручное добавление шагов
    addStepsManually = async (steps) => {
        if (steps <= 0) return this.stats;
        await this.addSteps(steps);
        return this.stats;
    };
    
    // Отправка события об обновлении
    emitUpdateEvent = () => {
        // В React Native используем EventEmitter или обновление состояния
        if (this.updateCallback) {
            this.updateCallback(this.getStats());
        }
        
        // Можно также использовать NativeEventEmitter для нативных событий
        // const eventEmitter = new NativeEventEmitter();
        // eventEmitter.emit('pedometerUpdate', this.stats);
    };
    
    // Регистрация callback для обновлений
    onUpdate = (callback) => {
        this.updateCallback = callback;
    };
    
    // ===== ФОНОВЫЕ ЗАДАЧИ =====
    
    // Инициализация фоновой задачи
    initializeBackgroundTask = () => {
        TaskManager.defineTask(PEDOMETER_TASK, async () => {
            try {
                if (this.isAvailable) {
                    // Получаем шаги с момента последнего обновления
                    const now = new Date();
                    const lastUpdate = new Date(this.stats.lastBackgroundUpdate);
                    
                    // Проверяем разницу во времени
                    if (now - lastUpdate > 5 * 60 * 1000) { // 5 минут
                        const stepCountResult = await Pedometer.getStepCountAsync(lastUpdate, now);
                        if (stepCountResult && stepCountResult.steps > 0) {
                            await this.addSteps(stepCountResult.steps);
                        }
                        
                        this.stats.lastBackgroundUpdate = Date.now();
                        await this.saveStats();
                    }
                }
                
                return BackgroundFetch.BackgroundFetchResult.NewData;
            } catch (error) {
                console.error('Ошибка фоновой задачи:', error);
                return BackgroundFetch.BackgroundFetchResult.Failed;
            }
        });
    };
    
    // Регистрация фоновой задачи
    registerBackgroundTask = async () => {
        try {
            await BackgroundFetch.registerTaskAsync(PEDOMETER_TASK, {
                minimumInterval: 15 * 60, // 15 минут
                stopOnTerminate: false,
                startOnBoot: true,
            });
            console.log('✅ Фоновая задача зарегистрирована');
        } catch (error) {
            console.warn('Не удалось зарегистрировать фоновую задачу:', error);
        }
    };
    
    // Отмена фоновой задачи
    unregisterBackgroundTask = async () => {
        try {
            await BackgroundFetch.unregisterTaskAsync(PEDOMETER_TASK);
            console.log('✅ Фоновая задача отменена');
        } catch (error) {
            console.warn('Не удалось отменить фоновую задачу:', error);
        }
    };
    
    // Очистка ресурсов
    cleanup = () => {
        this.stopTracking();
        this.unregisterBackgroundTask();
        this.updateCallback = null;
    };
}

// Экспортируем экземпляр как синглтон
export default new PedometerService();
