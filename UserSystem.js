// services/UserSystem.js
// ============================================
// СИСТЕМА УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ ДЛЯ REACT NATIVE
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';

const UserSystem = {
    // ============ ОСНОВНЫЕ ФУНКЦИИ ============
    
    // Получить всех пользователей (с кешированием)
    getUsers: async function() {
        try {
            // Проверяем кеш в памяти
            if (this._usersCache) {
                return this._usersCache;
            }
            
            const usersJson = await AsyncStorage.getItem('meetup_users');
            if (!usersJson) {
                this._usersCache = [];
                return [];
            }
            
            const users = JSON.parse(usersJson);
            
            // Валидация данных пользователей
            const validatedUsers = users.map(user => this.validateUserData(user));
            
            this._usersCache = validatedUsers;
            return validatedUsers;
        } catch (error) {
            console.error('❌ Ошибка загрузки пользователей:', error);
            this._usersCache = [];
            return [];
        }
    },

    // Сохранить всех пользователей
    saveUsers: async function(users) {
        try {
            // Валидация перед сохранением
            const validatedUsers = users.map(user => this.validateUserData(user));
            
            await AsyncStorage.setItem('meetup_users', JSON.stringify(validatedUsers));
            
            // Обновляем кеш
            this._usersCache = validatedUsers;
            
            // Создаем резервную копию
            await this.createBackup();
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения пользователей:', error);
            return false;
        }
    },

    // Создать нового пользователя
    createUser: async function(userData) {
        try {
            const users = await this.getUsers();
            
            // Проверяем уникальность email и nickname
            if (await this.isEmailUsed(userData.email)) {
                throw new Error('Email уже используется');
            }
            
            if (await this.isNicknameUsed(userData.nickname)) {
                throw new Error('Никнейм уже занят');
            }

            // Хэшируем пароль перед сохранением
            const hashedPassword = await this.hashPassword(userData.password);
            
            console.log('🔐 Регистрация:', {
                email: userData.email,
                nickname: userData.nickname,
                hash: hashedPassword.substring(0, 10) + '...'
            });

            // Получаем текущую геопозицию
            let position = userData.position;
            if (!position) {
                try {
                    const location = await Location.getCurrentPositionAsync({});
                    position = [location.coords.latitude, location.coords.longitude];
                } catch (locationError) {
                    console.log('⚠️ Не удалось получить геолокацию, используем дефолтную');
                    position = [55.751244, 37.618423]; // Москва по умолчанию
                }
            }

            // Создаем полный объект пользователя
            const newUser = {
                id: this.generateUserId(),
                email: userData.email.toLowerCase().trim(),
                nickname: userData.nickname.trim(),
                password: hashedPassword,
                avatar: userData.avatar || '',
                status: 'online',
                invisible: false,
                registeredAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                lastActive: Date.now(),
                position: position,
                about: '',
                phoneNumber: userData.phoneNumber || null,
                phoneVerified: false,
                stats: {
                    friendsCount: 0,
                    totalDistance: 0,
                    onlineHours: 0,
                    totalFriends: 0,
                    meetingCount: 0,
                    referralsCount: 0,
                    referralBonus: 0
                },
                settings: {
                    notifications: true,
                    showOnMap: true,
                    privacy: 'public',
                    theme: 'dark'
                },
                metadata: {
                    version: 2,
                    created: Date.now(),
                    modified: Date.now()
                },
                isVerified: false,
                isActive: true,
                isBeta: false,
                role: 'user',
                referredBy: userData.referredBy || null,
                referralCode: userData.referralCode || null
            };

            // Генерируем реферальный код, если не передан
            if (!newUser.referralCode) {
                newUser.referralCode = await this.generateReferralCode(newUser.id);
                newUser.referralGeneratedAt = Date.now();
            }

            users.push(newUser);
            
            if (await this.saveUsers(users)) {
                // Создаем профиль активности
                await this.createUserActivityProfile(newUser.id);
                
                console.log('✅ Пользователь создан:', newUser.email);
                return newUser;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Ошибка создания пользователя:', error);
            throw error;
        }
    },

    // Добавить бета-пользователя
    addBetaUser: async function(userData) {
        try {
            const users = await this.getUsers();
            
            // Проверяем, существует ли уже пользователь
            if (await this.isEmailUsed(userData.email)) {
                console.log('ℹ️ Бета-пользователь уже существует:', userData.email);
                return await this.findUserByEmail(userData.email);
            }
            
            // Создаем бета-пользователя
            const betaUser = {
                id: userData.id || this.generateUserId(),
                email: userData.email.toLowerCase().trim(),
                nickname: userData.nickname.trim(),
                password: await this.hashPassword(userData.password),
                avatar: userData.avatar || '',
                status: 'online',
                invisible: false,
                registeredAt: userData.registrationDate || new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                lastActive: Date.now(),
                position: userData.position || [55.751244, 37.618423],
                about: userData.about || '',
                phoneNumber: userData.phoneNumber || null,
                phoneVerified: false,
                stats: {
                    friendsCount: 0,
                    totalDistance: 0,
                    onlineHours: 0,
                    totalFriends: 0,
                    meetingCount: 0,
                    referralsCount: 0,
                    referralBonus: 0
                },
                settings: {
                    notifications: true,
                    showOnMap: true,
                    privacy: 'public',
                    theme: 'dark'
                },
                metadata: {
                    version: 2,
                    created: Date.now(),
                    modified: Date.now()
                },
                isVerified: true, // Бета-пользователи верифицированы по умолчанию
                isActive: true,
                isBeta: true, // Флаг бета-пользователя
                role: userData.role || 'user', // Добавляем роль (moderator/user)
                referralCode: userData.referralCode || await this.generateReferralCode(),
                referralGeneratedAt: Date.now(),
                referredBy: userData.referredBy || null
            };
            
            users.push(betaUser);
            
            if (await this.saveUsers(users)) {
                console.log('✅ Бета-пользователь добавлен:', betaUser.email);
                
                // Создаем профиль активности
                await this.createUserActivityProfile(betaUser.id);
                
                return betaUser;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Ошибка добавления бета-пользователя:', error);
            throw error;
        }
    },

    // Обновить данные пользователя
    updateUser: async function(userId, updates) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                throw new Error('Пользователь не найден');
            }

            // Обновляем только разрешенные поля
            const allowedFields = [
                'nickname', 'avatar', 'status', 'invisible',
                'position', 'about', 'settings', 'stats',
                'referralCode', 'referralGeneratedAt', 'referredBy',
                'password', 'lastSeen', 'lastActive', 'telegram',
                'phoneNumber', 'phoneVerified', 'phoneVerificationCode',
                'phoneVerificationExpires', 'phoneVerificationSentAt',
                'isBeta', 'role'
            ];
            
            const updatedUser = { ...users[userIndex] };
            
            for (const key of Object.keys(updates)) {
                if (allowedFields.includes(key)) {
                    if (key === 'nickname' && await this.isNicknameUsed(updates[key], userId)) {
                        throw new Error('Никнейм уже занят');
                    }
                    updatedUser[key] = updates[key];
                }
            }

            updatedUser.metadata.modified = Date.now();

            users[userIndex] = updatedUser;
            
            if (await this.saveUsers(users)) {
                // Обновляем текущего пользователя если это он
                const currentUser = await this.getCurrentUser();
                if (currentUser && currentUser.id === userId) {
                    await this.setCurrentUser(updatedUser);
                }
                
                return updatedUser;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Ошибка обновления пользователя:', error);
            throw error;
        }
    },

    // Удалить пользователя
    deleteUser: async function(userId) {
        try {
            const users = await this.getUsers();
            const filteredUsers = users.filter(u => u.id !== userId);
            
            if (filteredUsers.length === users.length) {
                throw new Error('Пользователь не найден');
            }

            // Удаляем связанные данные
            await this.cleanupUserData(userId);
            
            // Обновляем текущего пользователя если это он
            const currentUser = await this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                await this.logout();
            }

            return await this.saveUsers(filteredUsers);
        } catch (error) {
            console.error('❌ Ошибка удаления пользователя:', error);
            return false;
        }
    },

    // ============ ПОИСК И ПРОВЕРКИ ============
    
    // Найти пользователя
    findUser: async function(identifier) {
        if (!identifier || typeof identifier !== 'string') return null;
        
        const searchTerm = identifier.trim().toLowerCase();
        const users = await this.getUsers();
        
        return users.find(user => 
            (user.email && user.email.toLowerCase() === searchTerm) ||
            (user.nickname && user.nickname.toLowerCase() === searchTerm) ||
            (user.id && user.id.toLowerCase() === searchTerm) ||
            (user.phoneNumber && user.phoneNumber.replace(/[^\d+]/g, '').includes(searchTerm.replace(/[^\d+]/g, '')))
        );
    },

    // Найти пользователя по email (специально для логина)
    findUserByEmail: async function(email) {
        if (!email || typeof email !== 'string') return null;
        
        const searchEmail = email.toLowerCase().trim();
        const users = await this.getUsers();
        
        return users.find(user => 
            user.email && user.email.toLowerCase() === searchEmail
        );
    },

    // Проверить занятость email
    isEmailUsed: async function(email, excludeUserId = null) {
        if (!email || typeof email !== 'string') return false;
        
        const searchEmail = email.toLowerCase().trim();
        const users = await this.getUsers();
        
        return users.some(user => 
            user.email && 
            user.email.toLowerCase() === searchEmail &&
            (!excludeUserId || user.id !== excludeUserId)
        );
    },

    // Проверить занятость никнейма
    isNicknameUsed: async function(nickname, excludeUserId = null) {
        if (!nickname || typeof nickname !== 'string') return false;
        
        const searchNickname = nickname.trim().toLowerCase();
        const users = await this.getUsers();
        
        return users.some(user => 
            user.nickname && 
            user.nickname.toLowerCase() === searchNickname &&
            (!excludeUserId || user.id !== excludeUserId)
        );
    },

    // Найти пользователей по роли
    findUsersByRole: async function(role) {
        if (!role || typeof role !== 'string') return [];
        
        const users = await this.getUsers();
        return users.filter(user => user.role === role);
    },

    // Найти модераторов
    getModerators: async function() {
        return await this.findUsersByRole('moderator');
    },

    // Проверить, является ли пользователь модератором
    isModerator: async function(userId) {
        const user = await this.findUser(userId);
        return user && user.role === 'moderator';
    },

    // ============ АВТОРИЗАЦИЯ ============
    
    // Получить текущего пользователя
    getCurrentUser: async function() {
        try {
            const userJson = await AsyncStorage.getItem('meetup_current_user');
            if (!userJson) return null;
            
            const user = JSON.parse(userJson);
            return this.validateUserData(user);
        } catch (error) {
            console.error('❌ Ошибка загрузки текущего пользователя:', error);
            await AsyncStorage.removeItem('meetup_current_user');
            return null;
        }
    },

    // Установить текущего пользователя
    setCurrentUser: async function(user) {
        try {
            const validatedUser = this.validateUserData(user);
            await AsyncStorage.setItem('meetup_current_user', JSON.stringify(validatedUser));
            
            // Обновляем активность
            await this.updateUserActivity(user.id);
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения текущего пользователя:', error);
            return false;
        }
    },

    // Вход в систему (ИСПРАВЛЕННАЯ ВЕРСИЯ)
    login: async function(identifier, password) {
        try {
            console.log('🔐 Попытка входа:', identifier);
            
            // Ищем пользователя по email или никнейму
            const user = await this.findUser(identifier);
            
            if (!user) {
                console.log('❌ Пользователь не найден:', identifier);
                throw new Error('Пользователь не найден');
            }

            // Хэшируем введенный пароль для сравнения
            const hashedPassword = await this.hashPassword(password);
            
            console.log('🔐 Сравнение паролей:', {
                identifier: identifier,
                userEmail: user.email,
                storedHash: user.password.substring(0, 10) + '...',
                inputHash: hashedPassword.substring(0, 10) + '...',
                match: user.password === hashedPassword
            });

            if (user.password !== hashedPassword) {
                console.log('❌ Неверный пароль для пользователя:', user.email);
                throw new Error('Неверный пароль');
            }

            if (!user.isActive) {
                throw new Error('Аккаунт деактивирован');
            }

            // Обновляем данные пользователя
            const updatedUser = await this.updateUser(user.id, {
                status: 'online',
                lastSeen: new Date().toISOString(),
                lastActive: Date.now()
            });

            if (!updatedUser) {
                throw new Error('Ошибка обновления данных пользователя');
            }

            // Устанавливаем как текущего
            await this.setCurrentUser(updatedUser);
            
            console.log('✅ Успешный вход:', updatedUser.email);
            return updatedUser;
        } catch (error) {
            console.error('❌ Ошибка входа:', error.message);
            throw error;
        }
    },

    // Выход из системы
    logout: async function() {
        try {
            const currentUser = await this.getCurrentUser();
            
            if (currentUser) {
                // Устанавливаем статус "не в сети"
                await this.updateUser(currentUser.id, {
                    status: 'offline',
                    lastSeen: new Date().toISOString()
                });
            }
            
            await AsyncStorage.removeItem('meetup_current_user');
            return true;
        } catch (error) {
            console.error('❌ Ошибка выхода:', error);
            return false;
        }
    },

    // ============ ТЕЛЕФОН И ТЕЛЕГРАМ ВЕРИФИКАЦИЯ ============
    
    // Добавить номер телефона пользователю
    addPhoneNumber: async function(userId, phoneNumber) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: '❌ Пользователь не найден' };
            }
            
            // Проверка формата номера телефона (базовая)
            const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
            
            if (!cleanPhone || cleanPhone.length < 10) {
                return { success: false, message: '❌ Некорректный номер телефона' };
            }
            
            // Проверяем, не используется ли номер уже другим пользователем
            const existingUser = users.find(u => 
                u.phoneNumber && 
                u.phoneNumber.replace(/[^\d+]/g, '') === cleanPhone && 
                u.id !== userId
            );
            
            if (existingUser) {
                return { success: false, message: '❌ Этот номер телефона уже используется другим аккаунтом' };
            }
            
            // Сохраняем номер телефона (пока не подтвержден)
            users[userIndex].phoneNumber = phoneNumber;
            users[userIndex].phoneVerified = false;
            
            await this.saveUsers(users);
            
            return { 
                success: true, 
                message: '✅ Номер телефона добавлен. Требуется подтверждение.',
                phoneNumber: phoneNumber 
            };
        } catch (error) {
            console.error('❌ Ошибка добавления номера телефона:', error);
            return { success: false, message: '❌ Ошибка добавления номера телефона' };
        }
    },

    // Генерация кода подтверждения телефона
    generatePhoneVerificationCode: async function(userId) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: '❌ Пользователь не найден' };
            }
            
            const user = users[userIndex];
            
            if (!user.phoneNumber) {
                return { success: false, message: '❌ Номер телефона не добавлен' };
            }
            
            // Генерируем 4-значный код (более удобный для пользователей)
            const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
            const expiresAt = Date.now() + (10 * 60 * 1000); // 10 минут
            
            // Сохраняем код подтверждения
            users[userIndex].phoneVerificationCode = verificationCode;
            users[userIndex].phoneVerificationExpires = expiresAt;
            users[userIndex].phoneVerificationSentAt = Date.now();
            
            await this.saveUsers(users);
            
            console.log(`📱 Сгенерирован код подтверждения телефона для ${user.phoneNumber}: ${verificationCode}`);
            
            return { 
                success: true, 
                message: '✅ Код подтверждения сгенерирован',
                code: verificationCode,
                expiresAt: expiresAt,
                phoneNumber: user.phoneNumber
            };
        } catch (error) {
            console.error('❌ Ошибка генерации кода подтверждения телефона:', error);
            return { success: false, message: '❌ Ошибка генерации кода подтверждения' };
        }
    },

    // Отправка кода подтверждения телефона через Telegram (ДЕМО РЕЖИМ для мобильного)
    sendPhoneVerificationCode: async function(userId) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: '❌ Пользователь не найден' };
            }
            
            const user = users[userIndex];
            
            if (!user.phoneNumber) {
                return { success: false, message: '❌ Номер телефона не добавлен' };
            }
            
            // Генерируем код подтверждения
            const codeData = await this.generatePhoneVerificationCode(userId);
            
            if (!codeData.success) {
                return codeData;
            }
            
            // В React Native показываем код в Alert для демо-режима
            Alert.alert(
                '📱 Демо-режим: Код подтверждения',
                `Код для ${user.phoneNumber}: ${codeData.code}\n\n⏰ Действует до: ${new Date(codeData.expiresAt).toLocaleTimeString()}`,
                [{ text: 'OK' }]
            );
            
            return { 
                success: true, 
                message: '📱 Код сгенерирован (демо-режим). Проверьте уведомление.',
                code: codeData.code,
                phoneNumber: user.phoneNumber,
                expiresAt: codeData.expiresAt,
                isDemo: true
            };
        } catch (error) {
            console.error('❌ Ошибка отправки кода подтверждения телефона:', error);
            return { success: false, message: '❌ Ошибка отправки кода подтверждения' };
        }
    },

    // Проверка кода подтверждения телефона
    verifyPhoneCode: async function(userId, code) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: '❌ Пользователь не найден' };
            }
            
            const user = users[userIndex];
            
            // Проверяем, есть ли код подтверждения
            if (!user.phoneVerificationCode || !user.phoneVerificationExpires) {
                return { success: false, message: '❌ Код подтверждения не найден или истек' };
            }
            
            // Проверяем срок действия кода
            if (Date.now() > user.phoneVerificationExpires) {
                // Очищаем устаревший код
                users[userIndex].phoneVerificationCode = null;
                users[userIndex].phoneVerificationExpires = null;
                await this.saveUsers(users);
                
                return { success: false, message: '❌ Срок действия кода истек. Запросите новый код' };
            }
            
            // Проверяем код
            if (user.phoneVerificationCode !== code) {
                return { success: false, message: '❌ Неверный код подтверждения' };
            }
            
            // Код верный - подтверждаем номер телефона
            users[userIndex].phoneVerified = true;
            users[userIndex].phoneVerificationCode = null;
            users[userIndex].phoneVerificationExpires = null;
            users[userIndex].phoneVerifiedAt = new Date().toISOString();
            
            await this.saveUsers(users);
            
            // Обновляем текущего пользователя если это он
            const currentUser = await this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                await this.setCurrentUser(users[userIndex]);
            }
            
            return { 
                success: true, 
                message: '✅ Номер телефона успешно подтвержден!',
                phoneNumber: user.phoneNumber
            };
        } catch (error) {
            console.error('❌ Ошибка проверки кода подтверждения телефона:', error);
            return { success: false, message: '❌ Ошибка проверки кода' };
        }
    },

    // Удалить номер телефона
    removePhoneNumber: async function(userId) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: '❌ Пользователь не найден' };
            }
            
            // Сохраняем старый номер для логирования
            const oldPhoneNumber = users[userIndex].phoneNumber;
            
            // Удаляем данные телефона
            users[userIndex].phoneNumber = null;
            users[userIndex].phoneVerified = false;
            users[userIndex].phoneVerificationCode = null;
            users[userIndex].phoneVerificationExpires = null;
            users[userIndex].phoneVerifiedAt = null;
            
            await this.saveUsers(users);
            
            // Обновляем текущего пользователя если это он
            const currentUser = await this.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                await this.setCurrentUser(users[userIndex]);
            }
            
            console.log(`🗑️ Удален номер телефона ${oldPhoneNumber} для пользователя ${userId}`);
            
            return { success: true, message: '✅ Номер телефона удален' };
        } catch (error) {
            console.error('❌ Ошибка удаления номера телефона:', error);
            return { success: false, message: '❌ Ошибка удаления номера телефона' };
        }
    },

    // Проверка статуса верификации телефона
    getPhoneVerificationStatus: async function(userId) {
        try {
            const user = await this.findUser(userId);
            
            if (!user) {
                return { success: false, message: '❌ Пользователь не найден' };
            }
            
            return {
                success: true,
                phoneNumber: user.phoneNumber,
                phoneVerified: user.phoneVerified || false,
                phoneVerifiedAt: user.phoneVerifiedAt,
                hasPendingVerification: !!user.phoneVerificationCode,
                verificationExpires: user.phoneVerificationExpires
            };
        } catch (error) {
            console.error('❌ Ошибка получения статуса верификации телефона:', error);
            return { success: false, message: '❌ Ошибка получения статуса' };
        }
    },

    // ============ TELEGRAM ИНТЕГРАЦИЯ ДЛЯ СБРОСА ПАРОЛЯ ============
    
    // Поиск пользователя по Telegram username
    findUserByTelegramUsername: async function(username) {
        if (!username || typeof username !== 'string') return null;
        
        const cleanUsername = username.replace('@', '').trim().toLowerCase();
        const users = await this.getUsers();
        
        return users.find(user => 
            user.telegram && 
            user.telegram.username && 
            user.telegram.username.toLowerCase() === cleanUsername &&
            user.telegram.verified === true
        );
    },

    // Запрос сброса пароля через Telegram (ДЕМО РЕЖИМ)
    requestPasswordResetViaTelegram: async function(username) {
        try {
            // Убираем @ если есть
            const cleanUsername = username.replace('@', '').trim();
            
            if (!cleanUsername) {
                return {
                    success: false,
                    message: 'Введите Telegram username'
                };
            }
            
            // Ищем пользователя
            const user = await this.findUserByTelegramUsername(cleanUsername);
            
            if (!user) {
                return {
                    success: false,
                    message: 'Пользователь с таким Telegram не найден или аккаунт не подтвержден'
                };
            }
            
            // Генерируем 6-значный код
            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + (10 * 60 * 1000); // 10 минут
            
            // Сохраняем код для проверки
            const resetData = {
                code: resetCode,
                userId: user.id,
                telegramUsername: cleanUsername,
                expiresAt: expiresAt,
                createdAt: Date.now(),
                attempts: 0
            };
            
            // Сохраняем в AsyncStorage
            await AsyncStorage.setItem(`tg_reset_${cleanUsername}`, JSON.stringify(resetData));
            
            // Показываем код в Alert для демо-режима
            Alert.alert(
                '📱 Демо-режим: Код сброса пароля',
                `Код для @${cleanUsername}: ${resetCode}\n\n⏰ Действует до: ${new Date(expiresAt).toLocaleTimeString()}`,
                [{ text: 'OK' }]
            );
            
            return {
                success: true,
                message: '📱 Код сгенерирован (демо-режим). Проверьте уведомление.',
                code: resetCode,
                userId: user.id,
                username: cleanUsername,
                expiresAt: expiresAt,
                isDemo: true
            };
            
        } catch (error) {
            console.error('❌ Ошибка запроса сброса пароля через Telegram:', error);
            return {
                success: false,
                message: '❌ Ошибка при отправке кода: ' + error.message
            };
        }
    },

    // Проверка Telegram кода сброса
    verifyTelegramResetCode: async function(username, code) {
        try {
            const cleanUsername = username.replace('@', '').trim();
            
            if (!cleanUsername || !code || code.length !== 6) {
                return {
                    success: false,
                    message: '❌ Введите корректный 6-значный код'
                };
            }
            
            // Получаем сохраненные данные
            const storedData = await AsyncStorage.getItem(`tg_reset_${cleanUsername}`);
            
            if (!storedData) {
                return {
                    success: false,
                    message: '❌ Код не найден или истек'
                };
            }
            
            const resetData = JSON.parse(storedData);
            
            // Проверяем срок действия
            if (Date.now() > resetData.expiresAt) {
                await AsyncStorage.removeItem(`tg_reset_${cleanUsername}`);
                return {
                    success: false,
                    message: '❌ Срок действия кода истек'
                };
            }
            
            // Проверяем количество попыток
            if (resetData.attempts >= 5) {
                await AsyncStorage.removeItem(`tg_reset_${cleanUsername}`);
                return {
                    success: false,
                    message: '❌ Слишком много неверных попыток. Запросите новый код'
                };
            }
            
            // Проверяем код
            if (resetData.code !== code) {
                // Увеличиваем счетчик попыток
                resetData.attempts = (resetData.attempts || 0) + 1;
                await AsyncStorage.setItem(`tg_reset_${cleanUsername}`, JSON.stringify(resetData));
                
                const remainingAttempts = 5 - resetData.attempts;
                return {
                    success: false,
                    message: `❌ Неверный код. Осталось попыток: ${remainingAttempts}`
                };
            }
            
            // Код верный
            // Помечаем как проверенный
            resetData.verified = true;
            resetData.verifiedAt = Date.now();
            await AsyncStorage.setItem(`tg_reset_${cleanUsername}`, JSON.stringify(resetData));
            
            return {
                success: true,
                message: '✅ Код подтвержден',
                userId: resetData.userId,
                username: cleanUsername
            };
            
        } catch (error) {
            console.error('❌ Ошибка проверки Telegram кода:', error);
            return {
                success: false,
                message: '❌ Ошибка проверки кода'
            };
        }
    },

    // Сброс пароля после проверки Telegram кода
    resetPasswordWithTelegram: async function(username, code, newPassword) {
        try {
            // Сначала проверяем код
            const verifyResult = await this.verifyTelegramResetCode(username, code);
            
            if (!verifyResult.success) {
                return verifyResult;
            }
            
            const userId = verifyResult.userId;
            
            // Валидация нового пароля
            if (!newPassword || newPassword.length < 8) {
                return {
                    success: false,
                    message: '❌ Пароль должен быть не менее 8 символов'
                };
            }
            
            // Проверяем сложность пароля
            if (!/[a-zA-Z]/.test(newPassword)) {
                return {
                    success: false,
                    message: '❌ Пароль должен содержать буквы'
                };
            }
            
            if (!/\d/.test(newPassword)) {
                return {
                    success: false,
                    message: '❌ Пароль должен содержать цифры'
                };
            }
            
            // Обновляем пароль пользователя
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return {
                    success: false,
                    message: '❌ Пользователь не найден'
                };
            }
            
            // Хэшируем новый пароль
            users[userIndex].password = await this.hashPassword(newPassword);
            users[userIndex].updatedAt = new Date().toISOString();
            users[userIndex].lastPasswordChange = Date.now();
            
            // Сохраняем изменения
            await this.saveUsers(users);
            
            // Очищаем данные сброса
            const cleanUsername = username.replace('@', '').trim();
            await AsyncStorage.removeItem(`tg_reset_${cleanUsername}`);
            
            return {
                success: true,
                message: '✅ Пароль успешно изменен! Теперь вы можете войти с новым паролем.'
            };
            
        } catch (error) {
            console.error('❌ Ошибка сброса пароля через Telegram:', error);
            return {
                success: false,
                message: '❌ Ошибка сброса пароля: ' + error.message
            };
        }
    },

    // Привязка Telegram аккаунта
    bindTelegramAccount: async function(userId, telegramUsername) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: '❌ Пользователь не найден' };
            }
            
            const cleanUsername = telegramUsername.replace('@', '').trim();
            
            // Проверяем, не привязан ли уже этот телеграм аккаунт
            const existingBinding = users.find(u => 
                u.telegram && 
                u.telegram.username === cleanUsername && 
                u.id !== userId
            );
            
            if (existingBinding) {
                return { 
                    success: false, 
                    message: '❌ Этот Telegram аккаунт уже привязан к другому пользователю' 
                };
            }
            
            // Привязываем аккаунт (пока не подтвержден)
            users[userIndex].telegram = {
                username: cleanUsername,
                verified: false,
                verificationCode: null,
                codeExpires: null,
                boundAt: null
            };
            
            await this.saveUsers(users);
            await this.setCurrentUser(users[userIndex]);
            
            return { 
                success: true, 
                message: '✅ Telegram аккаунт привязан. Требуется верификация.' 
            };
        } catch (error) {
            console.error('❌ Ошибка привязки Telegram:', error);
            return { success: false, message: '❌ Ошибка привязки аккаунта' };
        }
    },

    // Верификация Telegram аккаунта
    verifyTelegramAccount: async function(userId, verificationCode) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: '❌ Пользователь не найден' };
            }
            
            const user = users[userIndex];
            
            if (!user.telegram) {
                return { success: false, message: '❌ Telegram аккаунт не привязан' };
            }
            
            // Проверяем срок действия кода
            if (user.telegram.codeExpires && Date.now() > user.telegram.codeExpires) {
                return { success: false, message: '❌ Срок действия кода истек' };
            }
            
            // Проверяем код
            if (user.telegram.verificationCode !== verificationCode) {
                return { success: false, message: '❌ Неверный код подтверждения' };
            }
            
            // Верифицируем аккаунт
            user.telegram.verified = true;
            user.telegram.verificationCode = null;
            user.telegram.codeExpires = null;
            user.telegram.boundAt = new Date().toISOString();
            
            await this.saveUsers(users);
            await this.setCurrentUser(user);
            
            return { success: true, message: '✅ Telegram аккаунт успешно подтвержден!' };
        } catch (error) {
            console.error('❌ Ошибка верификации Telegram:', error);
            return { success: false, message: '❌ Ошибка подтверждения аккаунта' };
        }
    },

    // Генерация кода верификации для Telegram
    generateTelegramVerificationCode: async function(userId) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return null;
            }
            
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = Date.now() + (10 * 60 * 1000); // 10 минут
            
            users[userIndex].telegram.verificationCode = code;
            users[userIndex].telegram.codeExpires = expires;
            
            await this.saveUsers(users);
            
            return {
                code: code,
                expires: expires,
                username: users[userIndex].telegram.username
            };
        } catch (error) {
            console.error('❌ Ошибка генерации кода верификации:', error);
            return null;
        }
    },

    // Отправка кода верификации в Telegram (ДЕМО РЕЖИМ)
    sendTelegramVerificationCode: async function(userId) {
        try {
            const user = await this.findUser(userId);
            
            if (!user || !user.telegram || !user.telegram.username) {
                return { success: false, message: '❌ Telegram аккаунт не привязан' };
            }
            
            const codeData = await this.generateTelegramVerificationCode(userId);
            
            if (!codeData) {
                return { success: false, message: '❌ Ошибка генерации кода' };
            }
            
            // Демо-режим - показываем код в Alert
            Alert.alert(
                '📱 Демо-режим: Код верификации Telegram',
                `Код для @${codeData.username}: ${codeData.code}\n\n⏰ Действует до: ${new Date(codeData.expires).toLocaleTimeString()}`,
                [{ text: 'OK' }]
            );
            
            return { 
                success: true, 
                message: '📱 Код сгенерирован (демо-режим). Проверьте уведомление.',
                code: codeData.code,
                username: codeData.username
            };
        } catch (error) {
            console.error('❌ Ошибка отправки кода верификации:', error);
            return { success: false, message: '❌ Ошибка отправки кода' };
        }
    },

    // Отвязать Telegram аккаунт
    unbindTelegramAccount: async function(userId) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return { success: false, message: '❌ Пользователь не найден' };
            }
            
            // Удаляем данные Telegram
            delete users[userIndex].telegram;
            
            await this.saveUsers(users);
            await this.setCurrentUser(users[userIndex]);
            
            return { success: true, message: '✅ Telegram аккаунт успешно отвязан' };
        } catch (error) {
            console.error('❌ Ошибка отвязки Telegram:', error);
            return { success: false, message: '❌ Ошибка отвязки аккаунта' };
        }
    },

    // ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
    
    // Генерация ID пользователя
    generateUserId: function() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `usr_${timestamp}_${random}`;
    },

    // Хэширование пароля - Безопасная реализация с использованием expo-crypto
    hashPassword: async function(password) {
        if (!password || typeof password !== 'string') return '';
        
        // Используем SHA-256 из expo-crypto для безопасного хеширования
        const salt = 'meetup_salt_v2_2024_secure';
        const str = password + salt;
        
        try {
            const hash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                str
            );
            return 'hash_' + hash;
        } catch (error) {
            console.error('❌ Ошибка хеширования пароля:', error);
            // Fallback на простой хеш при ошибке
            let fallbackHash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                fallbackHash = ((fallbackHash << 5) - fallbackHash) + char;
                fallbackHash = Math.abs(fallbackHash);
            }
            return 'hash_' + fallbackHash.toString(36);
        }
    },

    // Конвертация файла в base64 (React Native версия)
    fileToBase64: async function(uri) {
        try {
            // В React Native используем FileSystem для чтения файлов
            const response = await fetch(uri);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('❌ Ошибка конвертации файла:', error);
            throw error;
        }
    },

    // ============ ПОИСК И ФИЛЬТРАЦИЯ ============
    
    // Поиск пользователей
    searchUsers: async function(query, options = {}) {
        const {
            excludeCurrent = true,
            onlyOnline = false,
            limit = 50,
            offset = 0
        } = options;
        
        if (!query || query.trim().length < 2) {
            return [];
        }
        
        const searchTerm = query.trim().toLowerCase();
        const users = await this.getUsers();
        const currentUser = await this.getCurrentUser();
        
        let results = users.filter(user => {
            // Исключаем текущего пользователя
            if (excludeCurrent && currentUser && user.id === currentUser.id) {
                return false;
            }
            
            // Фильтрация по статусу
            if (onlyOnline && (user.status !== 'online' || user.invisible)) {
                return false;
            }
            
            // Поиск по никнейму
            if (user.nickname && user.nickname.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            return false;
        });
        
        // Сортировка: сначала онлайн, потом по алфавиту
        results.sort((a, b) => {
            if (a.status === 'online' && b.status !== 'online') return -1;
            if (a.status !== 'online' && b.status === 'online') return 1;
            return (a.nickname || '').localeCompare(b.nickname || '');
        });
        
        // Применяем пагинацию
        return results.slice(offset, offset + limit);
    },

    // ============ ДРУЗЬЯ И СОЦИАЛЬНЫЕ ФУНКЦИИ ============
    
    // Получить список друзей
    getUserFriends: async function(userId) {
        try {
            const requests = await this.getFriendRequests();
            const users = await this.getUsers();
            
            const friendRequests = requests.filter(req => 
                (req.fromUserId === userId || req.toUserId === userId) && 
                req.status === 'accepted'
            );
            
            return friendRequests.map(req => {
                const friendId = req.fromUserId === userId ? req.toUserId : req.fromUserId;
                return users.find(u => u.id === friendId);
            }).filter(friend => friend !== undefined);
        } catch (error) {
            console.error('❌ Ошибка получения друзей:', error);
            return [];
        }
    },

    // Получить запросы в друзья
    getFriendRequests: async function() {
        try {
            const requestsJson = await AsyncStorage.getItem('meetup_friend_requests');
            return requestsJson ? JSON.parse(requestsJson) : [];
        } catch (error) {
            console.error('❌ Ошибка загрузки запросов в друзья:', error);
            return [];
        }
    },

    // Сохранить запросы в друзья
    saveFriendRequests: async function(requests) {
        try {
            await AsyncStorage.setItem('meetup_friend_requests', JSON.stringify(requests));
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения запросов в друзья:', error);
            return false;
        }
    },

    // Отправить запрос в друзья
    sendFriendRequest: async function(fromUserId, toUserId) {
        try {
            if (fromUserId === toUserId) {
                throw new Error('Нельзя добавить себя в друзья');
            }

            const requests = await this.getFriendRequests();
            
            // Проверяем существующий запрос
            const existingRequest = requests.find(req => 
                (req.fromUserId === fromUserId && req.toUserId === toUserId) ||
                (req.fromUserId === toUserId && req.toUserId === fromUserId)
            );
            
            if (existingRequest) {
                if (existingRequest.status === 'pending') {
                    throw new Error('Запрос уже отправлен');
                }
                if (existingRequest.status === 'accepted') {
                    throw new Error('Уже друзья');
                }
                if (existingRequest.status === 'rejected') {
                    throw new Error('Запрос был отклонен ранее');
                }
            }

            const newRequest = {
                id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                fromUserId: fromUserId,
                toUserId: toUserId,
                timestamp: Date.now(),
                status: 'pending',
                metadata: {
                    viaQR: false // По умолчанию, будет установлено в true если через QR
                }
            };

            requests.push(newRequest);
            await this.saveFriendRequests(requests);
            
            // Обновляем статистику
            await this.updateUserStats(fromUserId, 'sentRequests', 1);
            
            return newRequest;
        } catch (error) {
            console.error('❌ Ошибка отправки запроса в друзья:', error);
            throw error;
        }
    },

    // Отправить запрос в друзья через QR-код
    sendFriendRequestViaQR: async function(fromUserId, toUserId) {
        try {
            const request = await this.sendFriendRequest(fromUserId, toUserId);
            
            // Помечаем запрос как отправленный через QR
            const requests = await this.getFriendRequests();
            const requestIndex = requests.findIndex(req => req.id === request.id);
            if (requestIndex !== -1) {
                requests[requestIndex].metadata = {
                    ...requests[requestIndex].metadata,
                    viaQR: true,
                    scannedAt: Date.now()
                };
                await this.saveFriendRequests(requests);
            }
            
            // Обновляем статистику QR-приглашений
            await this.updateUserStats(fromUserId, 'qrInvitations', 1);
            await this.updateUserStats(toUserId, 'qrInvitationsReceived', 1);
            
            return request;
        } catch (error) {
            console.error('❌ Ошибка отправки запроса через QR:', error);
            throw error;
        }
    },

    // Получить входящие запросы
    getIncomingRequests: async function(userId) {
        try {
            const requests = await this.getFriendRequests();
            const users = await this.getUsers();
            
            return requests
                .filter(req => req.toUserId === userId && req.status === 'pending')
                .map(req => {
                    const fromUser = users.find(u => u.id === req.fromUserId);
                    return {
                        ...req,
                        fromUser: fromUser ? {
                            id: fromUser.id,
                            nickname: fromUser.nickname,
                            avatar: fromUser.avatar,
                            status: fromUser.status
                        } : null
                    };
                })
                .filter(req => req.fromUser !== null);
        } catch (error) {
            console.error('❌ Ошибка получения входящих запросов:', error);
            return [];
        }
    },

    // Принять запрос в друзья
    acceptFriendRequest: async function(requestId) {
        try {
            const requests = await this.getFriendRequests();
            const requestIndex = requests.findIndex(req => req.id === requestId);
            
            if (requestIndex === -1) {
                throw new Error('Запрос не найден');
            }

            requests[requestIndex].status = 'accepted';
            requests[requestIndex].acceptedAt = Date.now();
            
            await this.saveFriendRequests(requests);
            
            // Обновляем статистику обоих пользователей
            const request = requests[requestIndex];
            await this.updateUserStats(request.fromUserId, 'friendsCount', 1);
            await this.updateUserStats(request.toUserId, 'friendsCount', 1);
            
            return requests[requestIndex];
        } catch (error) {
            console.error('❌ Ошибка принятия запроса в друзья:', error);
            throw error;
        }
    },

    // Отклонить запрос в друзья
    rejectFriendRequest: async function(requestId) {
        try {
            const requests = await this.getFriendRequests();
            const requestIndex = requests.findIndex(req => req.id === requestId);
            
            if (requestIndex === -1) {
                throw new Error('Запрос не найден');
            }

            requests[requestIndex].status = 'rejected';
            requests[requestIndex].rejectedAt = Date.now();
            
            await this.saveFriendRequests(requests);
            
            return requests[requestIndex];
        } catch (error) {
            console.error('❌ Ошибка отклонения запроса в друзья:', error);
            throw error;
        }
    },

    // ============ QR-КОДЫ ДЛЯ ДОБАВЛЕНИЯ В ДРУЗЬЯ ============
    
    // Генерировать персональный QR-код для добавления в друзья
    generateFriendQRCode: async function(userId) {
        try {
            const user = await this.findUser(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            
            // Создаем уникальный код на основе ID пользователя
            const qrData = {
                type: 'friend_request',
                userId: userId,
                nickname: user.nickname,
                timestamp: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // Действует 24 часа
            };
            
            // Конвертируем в строку для QR-кода
            const qrString = JSON.stringify(qrData);
            
            // Сохраняем в хранилище для валидации
            await this.saveQRData(qrString, userId);
            
            return {
                data: qrString,
                expiresAt: qrData.expiresAt
            };
        } catch (error) {
            console.error('❌ Ошибка генерации QR-кода:', error);
            throw error;
        }
    },

    // Сохранить данные QR-кода
    saveQRData: async function(qrData, userId) {
        try {
            const qrRecordsJson = await AsyncStorage.getItem('meetup_qr_records');
            const qrRecords = qrRecordsJson ? JSON.parse(qrRecordsJson) : {};
            const qrId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            
            qrRecords[qrId] = {
                data: qrData,
                userId: userId,
                generatedAt: Date.now(),
                used: false
            };
            
            await AsyncStorage.setItem('meetup_qr_records', JSON.stringify(qrRecords));
            return qrId;
        } catch (error) {
            console.error('❌ Ошибка сохранения QR-данных:', error);
            return null;
        }
    },

    // Обработать отсканированный QR-код
    processScannedQRCode: async function(qrData, scannerUserId) {
        try {
            // Парсим данные QR-кода
            let parsedData;
            try {
                parsedData = JSON.parse(qrData);
            } catch (e) {
                // Если не JSON, пробуем обработать как URL или простую строку
                return await this.processSimpleQRCode(qrData, scannerUserId);
            }
            
            // Проверяем тип QR-кода
            if (parsedData.type === 'friend_request') {
                return await this.processFriendRequestQR(parsedData, scannerUserId);
            } else if (parsedData.type === 'user_profile') {
                return await this.processProfileQR(parsedData, scannerUserId);
            } else {
                throw new Error('Неизвестный тип QR-кода');
            }
        } catch (error) {
            console.error('❌ Ошибка обработки QR-кода:', error);
            return {
                success: false,
                message: error.message || 'Не удалось обработать QR-код'
            };
        }
    },

    // Обработать QR-код запроса в друзья
    processFriendRequestQR: async function(qrData, scannerUserId) {
        try {
            // Проверяем срок действия
            if (qrData.expiresAt && qrData.expiresAt < Date.now()) {
                return {
                    success: false,
                    message: 'QR-код устарел'
                };
            }
            
            const targetUserId = qrData.userId;
            
            // Проверяем, не сканирует ли пользователь свой QR-код
            if (targetUserId === scannerUserId) {
                return {
                    success: false,
                    message: 'Нельзя добавить себя в друзья через собственный QR-код'
                };
            }
            
            // Ищем пользователя
            const targetUser = await this.findUser(targetUserId);
            if (!targetUser) {
                return {
                    success: false,
                    message: 'Пользователь не найден'
                };
            }
            
            // Проверяем, не друзья ли уже
            const existingRequest = await this.getExistingFriendRequest(scannerUserId, targetUserId);
            if (existingRequest) {
                if (existingRequest.status === 'accepted') {
                    return {
                        success: false,
                        message: 'Вы уже друзья с этим пользователем'
                    };
                } else if (existingRequest.status === 'pending') {
                    return {
                        success: false,
                        message: 'Запрос уже отправлен'
                    };
                }
            }
            
            // Отправляем запрос через QR-код
            const request = await this.sendFriendRequestViaQR(scannerUserId, targetUserId);
            
            return {
                success: true,
                message: `Запрос в друзья отправлен пользователю ${targetUser.nickname}`,
                user: targetUser,
                requestId: request.id
            };
        } catch (error) {
            console.error('❌ Ошибка обработки QR запроса в друзья:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    // Обработать QR-код профиля
    processProfileQR: async function(qrData, scannerUserId) {
        try {
            const targetUserId = qrData.userId;
            const targetUser = await this.findUser(targetUserId);
            
            if (!targetUser) {
                return {
                    success: false,
                    message: 'Пользователь не найден'
                };
            }
            
            return {
                success: true,
                message: 'Профиль пользователя найден',
                user: targetUser,
                action: 'view_profile'
            };
        } catch (error) {
            console.error('❌ Ошибка обработки QR профиля:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    // Обработать простой QR-код (не JSON)
    processSimpleQRCode: async function(qrData, scannerUserId) {
        try {
            // Пробуем извлечь ID пользователя из различных форматов
            
            // Формат: meetup://add-friend/userId/nickname
            if (qrData.startsWith('meetup://add-friend/')) {
                const parts = qrData.split('/');
                if (parts.length >= 3) {
                    const userId = parts[2];
                    return await this.processFriendRequestQR({
                        type: 'friend_request',
                        userId: userId,
                        nickname: parts[3] || 'Пользователь'
                    }, scannerUserId);
                }
            }
            
            // Формат: FRIEND_userId_timestamp
            if (qrData.startsWith('FRIEND_')) {
                const parts = qrData.split('_');
                if (parts.length >= 2) {
                    const userId = parts[1];
                    return await this.processFriendRequestQR({
                        type: 'friend_request',
                        userId: userId
                    }, scannerUserId);
                }
            }
            
            // Простая ссылка с параметром ref
            try {
                const url = new URL(qrData);
                const refCode = url.searchParams.get('ref');
                if (refCode) {
                    return await this.processReferralCode(refCode, scannerUserId);
                }
            } catch (e) {
                // Не URL, продолжаем
            }
            
            // Пробуем найти пользователя по ID напрямую
            const user = await this.findUser(qrData);
            if (user) {
                return {
                    success: true,
                    message: 'Пользователь найден',
                    user: user,
                    action: 'view_profile'
                };
            }
            
            return {
                success: false,
                message: 'Не удалось распознать QR-код'
            };
        } catch (error) {
            console.error('❌ Ошибка обработки простого QR:', error);
            return {
                success: false,
                message: 'Ошибка обработки QR-кода'
            };
        }
    },

    // Получить существующий запрос в друзья
    getExistingFriendRequest: async function(userId1, userId2) {
        const requests = await this.getFriendRequests();
        return requests.find(req => 
            (req.fromUserId === userId1 && req.toUserId === userId2) ||
            (req.fromUserId === userId2 && req.toUserId === userId1)
        );
    },

    // Создать QR-код для профиля пользователя
    createProfileQRCode: async function(userId) {
        try {
            const user = await this.findUser(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            
            const qrData = {
                type: 'user_profile',
                userId: userId,
                nickname: user.nickname,
                avatar: user.avatar,
                timestamp: Date.now()
            };
            
            const qrString = JSON.stringify(qrData);
            return {
                data: qrString
            };
        } catch (error) {
            console.error('❌ Ошибка создания QR профиля:', error);
            throw error;
        }
    },

    // Получить статистику QR-кодов
    getQRStats: async function(userId) {
        try {
            const requests = await this.getFriendRequests();
            const qrRequests = requests.filter(req => 
                (req.fromUserId === userId || req.toUserId === userId) &&
                req.metadata?.viaQR === true
            );
            
            const sentViaQR = qrRequests.filter(req => req.fromUserId === userId);
            const receivedViaQR = qrRequests.filter(req => req.toUserId === userId);
            
            return {
                totalSentViaQR: sentViaQR.length,
                totalReceivedViaQR: receivedViaQR.length,
                acceptedViaQR: qrRequests.filter(req => req.status === 'accepted').length,
                pendingViaQR: qrRequests.filter(req => req.status === 'pending').length
            };
        } catch (error) {
            console.error('❌ Ошибка получения статистики QR:', error);
            return null;
        }
    },

    // ============ ПРИГЛАСИТЕЛЬНЫЕ ССЫЛКИ ============
    
    // Генерация реферального кода
    generateReferralCode: async function(userId) {
        if (!userId) {
            // Генерируем случайный код для нового пользователя
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 6);
            return `REF_${timestamp}_${random}`.toUpperCase();
        }
        
        const user = await this.findUser(userId);
        if (!user) return null;
        
        // Создаем уникальный код на основе ID и текущего времени
        const code = `REF_${userId.substring(4, 8)}_${Date.now().toString(36).slice(-6)}`.toUpperCase();
        
        // Сохраняем код в профиль пользователя
        await this.updateUser(userId, {
            referralCode: code,
            referralGeneratedAt: Date.now()
        });
        
        return code;
    },

    // Получить реферальную ссылку
    getReferralLink: async function(userId) {
        const user = await this.findUser(userId);
        if (!user) return null;
        
        let code = user.referralCode;
        if (!code) {
            code = await this.generateReferralCode(userId);
        }
        
        // Для мобильного приложения используем deep link
        return `meetup://referral/${code}`;
    },

    // Получить красивую ссылку для добавления в друзья
    getPrettyFriendLink: async function(userId) {
        const user = await this.findUser(userId);
        if (!user) return null;
        
        // Генерируем deep link вида: meetup://profile/nickname
        const encodedNickname = encodeURIComponent(user.nickname);
        return `meetup://profile/${encodedNickname}`;
    },

    // Получить ссылку для добавления в друзья
    getFriendInviteLink: async function(userId) {
        const user = await this.findUser(userId);
        if (!user) return null;
        
        // Генерируем deep link
        return `meetup://add-friend/${userId}`;
    },

    // Получить все ссылки пользователя
    getAllUserLinks: async function(userId) {
        const user = await this.findUser(userId);
        if (!user) return null;
        
        return {
            referralLink: await this.getReferralLink(userId),
            prettyLink: await this.getPrettyFriendLink(userId),
            friendLink: await this.getFriendInviteLink(userId),
            telegramUsername: user.telegram?.username ? `@${user.telegram.username}` : null
        };
    },

    // Проверить и использовать реферальную ссылку
    useReferralLink: async function(code, newUserId) {
        try {
            console.log('🔗 Использование реферальной ссылки:', { code, newUserId });
            
            // Находим пользователя по реферальному коду
            const users = await this.getUsers();
            const referrer = users.find(u => u.referralCode === code);
            
            if (!referrer) {
                console.log('❌ Реферальный код не найден:', code);
                return { success: false, message: 'Неверный реферальный код' };
            }
            
            // Проверяем срок действия (30 дней)
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            if (referrer.referralGeneratedAt && referrer.referralGeneratedAt < thirtyDaysAgo) {
                console.log('⚠️ Ссылка устарела');
                return { success: false, message: 'Ссылка устарела' };
            }
            
            // Обновляем статистику пригласившего
            await this.updateUser(referrer.id, {
                stats: {
                    ...referrer.stats,
                    referralsCount: (referrer.stats.referralsCount || 0) + 1,
                    referralBonus: (referrer.stats.referralBonus || 0) + 1
                }
            });
            
            // Обновляем профиль нового пользователя
            await this.updateUser(newUserId, {
                referredBy: referrer.id
            });
            
            // Создаем автоматический запрос в друзья
            setTimeout(async () => {
                try {
                    await this.sendFriendRequest(referrer.id, newUserId);
                    await this.sendFriendRequest(newUserId, referrer.id);
                } catch (error) {
                    console.log('Автоматическое добавление в друзья не удалось:', error);
                }
            }, 1000);
            
            return { 
                success: true, 
                message: 'Ссылка успешно использована',
                referrer: {
                    id: referrer.id,
                    nickname: referrer.nickname,
                    email: referrer.email
                },
                bonus: 1
            };
        } catch (error) {
            console.error('❌ Ошибка использования реферальной ссылки:', error);
            return { success: false, message: 'Ошибка обработки ссылки' };
        }
    },

    // Обработать пригласительную ссылку (разные форматы)
    processInviteLink: async function(link, newUserId) {
        try {
            console.log('🔗 Обработка пригласительной ссылки:', link);
            
            // Разбираем deep link
            if (link.startsWith('meetup://')) {
                const path = link.replace('meetup://', '');
                
                if (path.startsWith('referral/')) {
                    const code = path.replace('referral/', '');
                    return await this.useReferralLink(code, newUserId);
                }
                
                if (path.startsWith('add-friend/')) {
                    const userId = path.replace('add-friend/', '');
                    const user = await this.findUser(userId);
                    if (user) {
                        await this.sendFriendRequest(user.id, newUserId);
                        return {
                            success: true,
                            message: `Запрос в друзья отправлен пользователю ${user.nickname}`,
                            referrer: user
                        };
                    }
                }
                
                if (path.startsWith('profile/')) {
                    const nickname = decodeURIComponent(path.replace('profile/', ''));
                    const user = await this.findUser(nickname);
                    if (user) {
                        await this.sendFriendRequest(user.id, newUserId);
                        return {
                            success: true,
                            message: `Запрос в друзья отправлен пользователю ${nickname}`,
                            referrer: user
                        };
                    }
                }
            }
            
            // Обрабатываем как прямой код
            if (link.startsWith('REF_')) {
                return await this.useReferralLink(link, newUserId);
            }
            
            // Ищем пользователя по никнейму
            const user = await this.findUser(link);
            if (user) {
                await this.sendFriendRequest(user.id, newUserId);
                return {
                    success: true,
                    message: `Запрос в друзья отправлен пользователю ${user.nickname}`,
                    referrer: user
                };
            }
            
            return { success: false, message: 'Неверная ссылка' };
        } catch (error) {
            console.error('❌ Ошибка обработки пригласительной ссылки:', error);
            return { success: false, message: 'Ошибка обработки ссылки' };
        }
    },

    // Обработать реферальный код
    processReferralCode: async function(code, newUserId) {
        if (code.startsWith('REF_')) {
            return await this.useReferralLink(code, newUserId);
        }
        return { success: false, message: 'Неверный формат кода' };
    },

    // Получить реферальную статистику
    getReferralStats: async function(userId) {
        const user = await this.findUser(userId);
        if (!user) return null;
        
        const users = await this.getUsers();
        const referrals = users.filter(u => u.referredBy === userId);
        
        return {
            code: user.referralCode,
            generatedAt: user.referralGeneratedAt,
            totalReferrals: referrals.length,
            successfulReferrals: referrals.filter(u => u.isActive).length,
            lastReferral: referrals.length > 0 ? referrals[referrals.length - 1] : null,
            stats: user.stats || {}
        };
    },

    // ============ КАРТА И ГЕОЛОКАЦИЯ ============
    
    // Обновить позицию пользователя
    updateUserPosition: async function(userId, position) {
        try {
            const user = await this.findUser(userId);
            
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            if (!Array.isArray(position) || position.length !== 2) {
                throw new Error('Некорректные координаты');
            }

            // Проверяем корректность координат
            const [lat, lng] = position;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                throw new Error('Некорректные координаты');
            }

            // Обновляем позицию
            const updatedUser = await this.updateUser(userId, {
                position: position,
                lastSeen: new Date().toISOString(),
                lastActive: Date.now()
            });

            // Записываем в историю перемещений
            await this.recordUserMovement(userId, position);
            
            return updatedUser;
        } catch (error) {
            console.error('❌ Ошибка обновления позиции:', error);
            throw error;
        }
    },

    // Получить пользователей рядом
    getNearbyUsers: async function(position, radius = 10) {
        try {
            const users = await this.getUsers();
            const currentUser = await this.getCurrentUser();
            
            return users.filter(user => {
                // Исключаем текущего пользователя и скрытых
                if (user.id === currentUser?.id || user.invisible || !user.position) {
                    return false;
                }

                // Вычисляем расстояние
                const distance = this.calculateDistance(position, user.position);
                return distance <= radius;
            });
        } catch (error) {
            console.error('❌ Ошибка поиска пользователей рядом:', error);
            return [];
        }
    },

    // ============ ВАЛИДАЦИЯ И ОЧИСТКА ============
    
    // Валидация данных пользователя
    validateUserData: function(user) {
        if (!user || typeof user !== 'object') {
            return this.getDefaultUser();
        }

        // Базовые обязательные поля
        const validated = {
            id: user.id || this.generateUserId(),
            email: user.email ? user.email.toLowerCase().trim() : '',
            nickname: user.nickname ? user.nickname.trim() : 'Пользователь',
            password: user.password || '',
            avatar: user.avatar || '',
            status: ['online', 'offline', 'away'].includes(user.status) ? user.status : 'offline',
            invisible: Boolean(user.invisible),
            registeredAt: user.registeredAt || new Date().toISOString(),
            lastSeen: user.lastSeen || new Date().toISOString(),
            lastActive: user.lastActive || Date.now(),
            position: Array.isArray(user.position) ? user.position : [55.751244, 37.618423],
            about: user.about || '',
            phoneNumber: user.phoneNumber || null,
            phoneVerified: Boolean(user.phoneVerified),
            phoneVerificationCode: user.phoneVerificationCode || null,
            phoneVerificationExpires: user.phoneVerificationExpires || null,
            phoneVerificationSentAt: user.phoneVerificationSentAt || null,
            phoneVerifiedAt: user.phoneVerifiedAt || null,
            stats: {
                friendsCount: Number(user.stats?.friendsCount) || 0,
                totalDistance: Number(user.stats?.totalDistance) || 0,
                onlineHours: Number(user.stats?.onlineHours) || 0,
                totalFriends: Number(user.stats?.totalFriends) || 0,
                meetingCount: Number(user.stats?.meetingCount) || 0,
                referralsCount: Number(user.stats?.referralsCount) || 0,
                referralBonus: Number(user.stats?.referralBonus) || 0,
                qrInvitations: Number(user.stats?.qrInvitations) || 0,
                qrInvitationsReceived: Number(user.stats?.qrInvitationsReceived) || 0,
                sentRequests: Number(user.stats?.sentRequests) || 0
            },
            settings: {
                notifications: Boolean(user.settings?.notifications ?? true),
                showOnMap: Boolean(user.settings?.showOnMap ?? true),
                privacy: ['public', 'friends', 'private'].includes(user.settings?.privacy) 
                    ? user.settings.privacy 
                    : 'public',
                theme: ['dark', 'light', 'auto'].includes(user.settings?.theme) 
                    ? user.settings.theme 
                    : 'dark'
            },
            metadata: {
                version: 2,
                created: user.metadata?.created || Date.now(),
                modified: Date.now()
            },
            referralCode: user.referralCode || null,
            referralGeneratedAt: user.referralGeneratedAt || null,
            referredBy: user.referredBy || null,
            isVerified: Boolean(user.isVerified ?? false),
            isActive: Boolean(user.isActive ?? true),
            isBeta: Boolean(user.isBeta ?? false),
            role: user.role || 'user'
        };

        // Добавляем данные Telegram если есть
        if (user.telegram && typeof user.telegram === 'object') {
            validated.telegram = {
                username: user.telegram.username || '',
                verified: Boolean(user.telegram.verified),
                verificationCode: user.telegram.verificationCode || null,
                codeExpires: user.telegram.codeExpires || null,
                boundAt: user.telegram.boundAt || null
            };
        }

        return validated;
    },

    // Создать пользователя по умолчанию
    getDefaultUser: function() {
        return {
            id: this.generateUserId(),
            email: '',
            nickname: 'Пользователь',
            password: '',
            avatar: '',
            status: 'offline',
            invisible: false,
            registeredAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            lastActive: Date.now(),
            position: [55.751244, 37.618423],
            about: '',
            phoneNumber: null,
            phoneVerified: false,
            stats: {
                friendsCount: 0,
                totalDistance: 0,
                onlineHours: 0,
                totalFriends: 0,
                meetingCount: 0,
                referralsCount: 0,
                referralBonus: 0,
                qrInvitations: 0,
                qrInvitationsReceived: 0,
                sentRequests: 0
            },
            settings: {
                notifications: true,
                showOnMap: true,
                privacy: 'public',
                theme: 'dark'
            },
            metadata: {
                version: 2,
                created: Date.now(),
                modified: Date.now()
            },
            referralCode: null,
            referralGeneratedAt: null,
            referredBy: null,
            isVerified: false,
            isActive: true,
            isBeta: false,
            role: 'user'
        };
    },

    // Очистка данных пользователя
    cleanupUserData: async function(userId) {
        try {
            // Удаляем запросы в друзья
            const requests = await this.getFriendRequests();
            const filteredRequests = requests.filter(req => 
                req.fromUserId !== userId && req.toUserId !== userId
            );
            await this.saveFriendRequests(filteredRequests);
            
            // Удаляем активность
            await AsyncStorage.removeItem(`user_activity_${userId}`);
            await AsyncStorage.removeItem(`user_movements_${userId}`);
            await AsyncStorage.removeItem(`user_stats_${userId}`);
            await AsyncStorage.removeItem(`user_online_${userId}`);
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка очистки данных пользователя:', error);
            return false;
        }
    },

    // Автоматическая очистка старых данных
    cleanupOldData: async function() {
        try {
            const users = await this.getUsers();
            const now = Date.now();
            
            // Удаляем неактивные аккаунты (более 30 дней)
            const activeUsers = users.filter(user => {
                if (user.scheduledForDeletion && user.scheduledForDeletion <= now) {
                    console.log(`🗑️ Удален аккаунт: ${user.nickname}`);
                    this.cleanupUserData(user.id);
                    return false;
                }
                return true;
            });
            
            if (activeUsers.length !== users.length) {
                await this.saveUsers(activeUsers);
            }
            
            // Очищаем старые запросы в друзья (более 30 дней)
            await this.cleanupOldFriendRequests();
            
            // Очищаем устаревшие реферальные коды (более 30 дней)
            await this.cleanupOldReferralCodes();
            
            // Очищаем устаревшие QR-коды
            await this.cleanupExpiredQRCodes();
            
            // Очищаем устаревшие коды сброса пароля Telegram
            await this.cleanupExpiredTelegramResetCodes();
            
            // Очищаем устаревшие коды подтверждения телефона
            await this.cleanupExpiredPhoneVerificationCodes();
            
            console.log('✅ Очистка данных завершена');
        } catch (error) {
            console.error('❌ Ошибка очистки данных:', error);
        }
    },

    // Очистка устаревших кодов подтверждения телефона
    cleanupExpiredPhoneVerificationCodes: async function() {
        try {
            const users = await this.getUsers();
            const now = Date.now();
            let cleaned = false;
            
            users.forEach(user => {
                if (user.phoneVerificationExpires && user.phoneVerificationExpires < now) {
                    user.phoneVerificationCode = null;
                    user.phoneVerificationExpires = null;
                    user.phoneVerificationSentAt = null;
                    cleaned = true;
                }
            });
            
            if (cleaned) {
                await this.saveUsers(users);
                console.log('🗑️ Очищены устаревшие коды подтверждения телефона');
            }
        } catch (error) {
            console.error('❌ Ошибка очистки кодов подтверждения телефона:', error);
        }
    },

    // Очистка устаревших кодов сброса пароля Telegram
    cleanupExpiredTelegramResetCodes: async function() {
        try {
            const now = Date.now();
            
            // Получаем все ключи из AsyncStorage
            const keys = await AsyncStorage.getAllKeys();
            const resetKeys = keys.filter(key => key.startsWith('tg_reset_'));
            
            for (const key of resetKeys) {
                try {
                    const data = await AsyncStorage.getItem(key);
                    const resetData = JSON.parse(data);
                    
                    if (resetData && resetData.expiresAt && now > resetData.expiresAt) {
                        await AsyncStorage.removeItem(key);
                        console.log(`🗑️ Удален устаревший Telegram код: ${key}`);
                    }
                } catch (e) {
                    // Игнорируем ошибки парсинга
                }
            }
        } catch (error) {
            console.error('❌ Ошибка очистки Telegram кодов:', error);
        }
    },

    // Очистка устаревших реферальных кодов
    cleanupOldReferralCodes: async function() {
        try {
            const users = await this.getUsers();
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            let updated = false;
            
            users.forEach(user => {
                if (user.referralGeneratedAt && user.referralGeneratedAt < thirtyDaysAgo) {
                    user.referralCode = null;
                    user.referralGeneratedAt = null;
                    updated = true;
                }
            });
            
            if (updated) {
                await this.saveUsers(users);
            }
        } catch (error) {
            console.error('❌ Ошибка очистки реферальных кодов:', error);
        }
    },

    // Очистка устаревших QR-коды
    cleanupExpiredQRCodes: async function() {
        try {
            const qrRecordsJson = await AsyncStorage.getItem('meetup_qr_records');
            if (!qrRecordsJson) return;
            
            const qrRecords = JSON.parse(qrRecordsJson);
            const now = Date.now();
            const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
            let cleaned = false;
            
            Object.keys(qrRecords).forEach(key => {
                if (qrRecords[key].generatedAt < twentyFourHoursAgo) {
                    delete qrRecords[key];
                    cleaned = true;
                }
            });
            
            if (cleaned) {
                await AsyncStorage.setItem('meetup_qr_records', JSON.stringify(qrRecords));
            }
        } catch (error) {
            console.error('❌ Ошибка очистки QR-кодов:', error);
        }
    },

    // ============ УТИЛИТЫ И РАСЧЕТЫ ============
    
    // Вычисление расстояния между координатами
    calculateDistance: function(pos1, pos2) {
        const [lat1, lon1] = pos1;
        const [lat2, lon2] = pos2;
        
        const R = 6371; // Радиус Земли в км
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Расстояние в км
    },

    // Запись перемещения пользователя
    recordUserMovement: async function(userId, position) {
        try {
            const key = `user_movements_${userId}`;
            const movementsJson = await AsyncStorage.getItem(key);
            const movements = movementsJson ? JSON.parse(movementsJson) : [];
            
            movements.push({
                position: position,
                timestamp: Date.now()
            });
            
            // Ограничиваем историю последними 100 записями
            if (movements.length > 100) {
                movements.splice(0, movements.length - 100);
            }
            
            await AsyncStorage.setItem(key, JSON.stringify(movements));
            
            // Обновляем общее расстояние
            if (movements.length >= 2) {
                const lastPos = movements[movements.length - 2].position;
                const distance = this.calculateDistance(lastPos, position);
                
                if (distance > 0) {
                    await this.updateUserStats(userId, 'totalDistance', distance);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка записи перемещения:', error);
        }
    },

    // Создание профиля активности
    createUserActivityProfile: async function(userId) {
        try {
            const activity = {
                userId: userId,
                created: Date.now(),
                sessions: [],
                totalOnlineTime: 0,
                lastLogin: Date.now()
            };
            
            await AsyncStorage.setItem(`user_activity_${userId}`, JSON.stringify(activity));
        } catch (error) {
            console.error('❌ Ошибка создания профиля активности:', error);
        }
    },

    // Обновление активности
    updateUserActivity: async function(userId) {
        try {
            const key = `user_activity_${userId}`;
            const activityJson = await AsyncStorage.getItem(key);
            const activity = activityJson ? JSON.parse(activityJson) : {};
            
            activity.lastActive = Date.now();
            activity.totalOnlineTime = (activity.totalOnlineTime || 0) + 1;
            
            await AsyncStorage.setItem(key, JSON.stringify(activity));
        } catch (error) {
            console.error('❌ Ошибка обновления активности:', error);
        }
    },

    // Обновление статистики
    updateUserStats: async function(userId, statName, value) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex !== -1) {
                if (users[userIndex].stats[statName] === undefined) {
                    users[userIndex].stats[statName] = 0;
                }
                users[userIndex].stats[statName] += value;
                await this.saveUsers(users);
            }
        } catch (error) {
            console.error('❌ Ошибка обновления статистики:', error);
        }
    },

    // ============ РЕЗЕРВНОЕ КОПИРОВАНИЕ ============
    
    // Создать резервную копию
    createBackup: async function() {
        try {
            const backup = {
                users: await this.getUsers(),
                friendRequests: await this.getFriendRequests(),
                timestamp: Date.now(),
                version: '2.0'
            };
            
            await AsyncStorage.setItem('meetup_backup', JSON.stringify(backup));
            
            // Храним только последние 5 резервных копий
            const backupsJson = await AsyncStorage.getItem('meetup_backups');
            const backups = backupsJson ? JSON.parse(backupsJson) : [];
            backups.push(backup);
            
            if (backups.length > 5) {
                backups.shift();
            }
            
            await AsyncStorage.setItem('meetup_backups', JSON.stringify(backups));
        } catch (error) {
            console.error('❌ Ошибка создания резервной копии:', error);
        }
    },

    // Восстановить из резервной копии
    restoreFromBackup: async function() {
        try {
            const backupJson = await AsyncStorage.getItem('meetup_backup');
            const backup = backupJson ? JSON.parse(backupJson) : null;
            
            if (!backup) {
                throw new Error('Резервная копия не найдена');
            }
            
            if (backup.users) {
                await AsyncStorage.setItem('meetup_users', JSON.stringify(backup.users));
            }
            
            if (backup.friendRequests) {
                await AsyncStorage.setItem('meetup_friend_requests', JSON.stringify(backup.friendRequests));
            }
            
            // Очищаем кеш
            this._usersCache = null;
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка восстановления из резервной копии:', error);
            return false;
        }
    },

    // Очистка старых запросов в друзья
    cleanupOldFriendRequests: async function() {
        try {
            const requests = await this.getFriendRequests();
            const now = Date.now();
            const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
            
            const activeRequests = requests.filter(req => {
                // Удаляем отклоненные запросы старше 7 дней
                if (req.status === 'rejected' && req.timestamp < (now - 7 * 24 * 60 * 60 * 1000)) {
                    return false;
                }
                
                // Удаляем все запросы старше 30 дней
                if (req.timestamp < thirtyDaysAgo) {
                    return false;
                }
                
                return true;
            });
            
            if (activeRequests.length !== requests.length) {
                await this.saveFriendRequests(activeRequests);
                console.log(`🗑️ Удалено ${requests.length - activeRequests.length} старых запросов в друзья`);
            }
        } catch (error) {
            console.error('❌ Ошибка очистки старых запросов:', error);
        }
    },

    // ============ МИГРАЦИЯ ДАННЫХ ============
    
    // Миграция старых данных
    migrateOldData: async function() {
        try {
            const users = await this.getUsers();
            let migrated = false;
            
            // Проверяем версию данных
            users.forEach((user, index) => {
                if (!user.metadata || user.metadata.version < 2) {
                    // Мигрируем старые данные
                    const migratedUser = this.validateUserData(user);
                    users[index] = migratedUser;
                    migrated = true;
                    console.log(`🔄 Мигрирован пользователь: ${user.nickname}`);
                }
            });
            
            if (migrated) {
                await this.saveUsers(users);
                console.log('✅ Миграция данных завершена');
            }
        } catch (error) {
            console.error('❌ Ошибка миграции данных:', error);
        }
    },

    // ============ СТАТИСТИКА ============
    
    // Получить статистику системы
    getSystemStats: async function() {
        try {
            const users = await this.getUsers();
            const requests = await this.getFriendRequests();
            
            const qrRequests = requests.filter(req => req.metadata?.viaQR === true);
            const acceptedQRRequests = qrRequests.filter(req => req.status === 'accepted');
            
            // Telegram статистика
            let telegramUsers = 0;
            let verifiedTelegramUsers = 0;
            
            // Телефонная статистика
            let phoneUsers = 0;
            let verifiedPhoneUsers = 0;
            
            users.forEach(user => {
                // Telegram статистика
                if (user.telegram) {
                    telegramUsers++;
                    if (user.telegram.verified) {
                        verifiedTelegramUsers++;
                    }
                }
                
                // Телефонная статистика
                if (user.phoneNumber) {
                    phoneUsers++;
                    if (user.phoneVerified) {
                        verifiedPhoneUsers++;
                    }
                }
            });
            
            return {
                totalUsers: users.length,
                onlineUsers: users.filter(u => u.status === 'online' && !u.invisible).length,
                totalFriendships: requests.filter(r => r.status === 'accepted').length,
                pendingRequests: requests.filter(r => r.status === 'pending').length,
                activeToday: users.filter(u => {
                    const lastActive = new Date(u.lastActive);
                    const today = new Date();
                    return lastActive.toDateString() === today.toDateString();
                }).length,
                averageFriends: users.reduce((sum, user) => sum + user.stats.friendsCount, 0) / users.length || 0,
                totalReferrals: users.filter(u => u.referredBy).length,
                activeReferrers: users.filter(u => u.stats.referralsCount > 0).length,
                qrFriendRequests: qrRequests.length,
                qrAcceptedRequests: acceptedQRRequests.length,
                qrSuccessRate: qrRequests.length > 0 ? (acceptedQRRequests.length / qrRequests.length * 100).toFixed(1) : 0,
                telegramUsers: telegramUsers,
                verifiedTelegramUsers: verifiedTelegramUsers,
                telegramVerificationRate: telegramUsers > 0 ? ((verifiedTelegramUsers / telegramUsers) * 100).toFixed(1) : 0,
                phoneUsers: phoneUsers,
                verifiedPhoneUsers: verifiedPhoneUsers,
                phoneVerificationRate: phoneUsers > 0 ? ((verifiedPhoneUsers / phoneUsers) * 100).toFixed(1) : 0,
                dualVerifiedUsers: users.filter(u => 
                    (u.telegram && u.telegram.verified) && 
                    (u.phoneNumber && u.phoneVerified)
                ).length,
                totalBetaUsers: users.filter(u => u.isBeta).length,
                moderatorUsers: users.filter(u => u.role === 'moderator').length
            };
        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            return null;
        }
    },

    // Дополнительная функция: получить пользователя по реферальному коду
    getUserByReferralCode: async function(code) {
        const users = await this.getUsers();
        return users.find(u => u.referralCode === code);
    },

    // Дополнительная функция: валидация реферального кода
    validateReferralCode: function(code) {
        if (!code || typeof code !== 'string') return false;
        return code.startsWith('REF_') && code.length > 10;
    },

    // Инициализация системы
    initialize: async function() {
        console.log('🔄 Инициализация UserSystem...');
        
        // Миграция старых данных
        await this.migrateOldData();
        
        // Очистка старых данных
        await this.cleanupOldData();
        
        // Добавляем бета-пользователя moderator2025
        try {
            const betaUserData = {
                id: 'beta_moderator_001',
                email: 'moderator2025@mail.ru',
                nickname: 'Moderator2025',
                password: 'TestMeetUp2025',
                role: 'moderator',
                isBeta: true,
                referralCode: 'BETA-MOD-2025'
            };
            
            // Проверяем, не существует ли уже такой пользователь
            const existingUser = await this.findUserByEmail(betaUserData.email);
            if (!existingUser) {
                await this.addBetaUser(betaUserData);
                console.log('✅ Бета-пользователь moderator2025 добавлен');
            } else {
                console.log('ℹ️ Бета-пользователь moderator2025 уже существует');
            }
        } catch (error) {
            console.error('❌ Ошибка добавления бета-пользователя:', error);
        }
        
        // Создаем резервную копию
        await this.createBackup();
        
        console.log('✅ UserSystem инициализирован');
        
        return true;
    }
};

export default UserSystem;
