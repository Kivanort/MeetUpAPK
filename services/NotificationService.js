import React, { useEffect, useState } from 'react';
import NotificationService from './services/NotificationService';

const App = () => {
  const [permission, setPermission] = useState(null);

  useEffect(() => {
    // Инициализация
    NotificationService.init();
    
    // Настройка обработчиков
    NotificationService.setGlobalHandlers({
      onNotificationReceived: (notification) => {
        console.log('Уведомление получено:', notification);
      },
      onNotificationResponse: (response) => {
        console.log('Нажатие на уведомление:', response);
        // Навигация на соответствующий экран
      }
    });

    // Проверка разрешений
    setPermission(NotificationService.getPermission());

    return () => {
      // Очистка при размонтировании
      NotificationService.cleanup();
    };
  }, []);

  // Отправка тестового уведомления
  const sendTest = async () => {
    await NotificationService.sendTestNotification();
  };

  // ... остальной код компонента
};
