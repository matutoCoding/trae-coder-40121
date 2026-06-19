import { useState, useEffect } from 'react';
import { Badge, Button } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  SearchOutlined,
  BellOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import SchedulePage from './pages/SchedulePage';
import WaitlistPage from './pages/WaitlistPage';
import VaccinePage from './pages/VaccinePage';
import RecallPage from './pages/RecallPage';
import ObservationPage from './pages/ObservationPage';
import NotificationPanel from './components/NotificationPanel';
import { useAppStore } from './store';
import dayjs from 'dayjs';

const menuItems = [
  { key: 'schedule', label: '接种排期', icon: CalendarOutlined },
  { key: 'waitlist', label: '候补补位', icon: TeamOutlined },
  { key: 'vaccine', label: '疫苗批次', icon: MedicineBoxOutlined },
  { key: 'recall', label: '流向召回', icon: SearchOutlined },
  { key: 'observation', label: '留观计时', icon: ClockCircleOutlined },
];

export default function App() {
  const [activeKey, setActiveKey] = useState('schedule');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { appointments, noShowAppointment, observationTimers, completeObservation, addNotification } = useAppStore();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = dayjs();
      appointments.forEach((apt) => {
        if (apt.status === 'booked') {
          const slotEndTime = dayjs(`${apt.date} ${apt.endTime}`);
          if (now.isAfter(slotEndTime)) {
            noShowAppointment(apt.id);
          }
        }
      });

      observationTimers.forEach((timer) => {
        if (now.isAfter(dayjs(timer.endTime))) {
          const apt = appointments.find((a) => a.id === timer.appointmentId);
          if (apt && apt.status === 'observed') {
            completeObservation(timer.appointmentId);
            addNotification({
              type: 'observation',
              title: '留观结束提醒',
              content: `${apt.patientName} 留观时间已到，可以离开`,
            });
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [appointments, observationTimers, noShowAppointment, completeObservation, addNotification]);

  const unreadCount = useAppStore((state) => state.notifications.filter((n) => !n.read).length);

  const renderContent = () => {
    switch (activeKey) {
      case 'schedule':
        return <SchedulePage />;
      case 'waitlist':
        return <WaitlistPage />;
      case 'vaccine':
        return <VaccinePage />;
      case 'recall':
        return <RecallPage />;
      case 'observation':
        return <ObservationPage />;
      default:
        return <SchedulePage />;
    }
  };

  const currentMenu = menuItems.find((m) => m.key === activeKey);

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="logo">💉 疫苗预约系统</div>
        <div className="menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className={`menu-item ${activeKey === item.key ? 'active' : ''}`}
                onClick={() => setActiveKey(item.key)}
              >
                <Icon />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <div className="header-title">{currentMenu?.label}</div>
          <div className="header-right">
            <Badge count={unreadCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 20 }} />}
                onClick={() => setNotificationOpen(true)}
              />
            </Badge>
          </div>
        </div>
        <div className="content">{renderContent()}</div>
      </div>

      <NotificationPanel open={notificationOpen} onClose={() => setNotificationOpen(false)} />
    </div>
  );
}
