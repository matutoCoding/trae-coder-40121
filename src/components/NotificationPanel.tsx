import { Drawer, List, Tag, Empty, Button } from 'antd';
import {
  BellOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import type { Notification } from '../types';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const iconMap: Record<string, any> = {
  waitlist: <UserOutlined />,
  recall: <ExclamationCircleOutlined />,
  observation: <ClockCircleOutlined />,
  system: <BellOutlined />,
};

const colorMap: Record<string, string> = {
  waitlist: 'blue',
  recall: 'red',
  observation: 'green',
  system: 'default',
};

const typeMap: Record<string, string> = {
  waitlist: '候补',
  recall: '召回',
  observation: '留观',
  system: '系统',
};

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();

  const handleRead = (id: string) => {
    markNotificationRead(id);
  };

  const Extra = () => (
    <Button size="small" type="link" onClick={markAllNotificationsRead}>
      全部已读
    </Button>
  );

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>通知中心</span>
          <Extra />
        </div>
      }
      placement="right"
      width={380}
      open={open}
      onClose={onClose}
    >
      {notifications.length === 0 ? (
        <Empty description="暂无通知" />
      ) : (
        <List
          dataSource={notifications.slice(0, 50)}
          renderItem={(item: Notification) => (
            <List.Item
              onClick={() => handleRead(item.id)}
              style={{
                cursor: 'pointer',
                opacity: item.read ? 0.6 : 1,
                background: item.read ? 'transparent' : '#f0f7ff',
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '8px',
              }}
            >
              <List.Item.Meta
                avatar={iconMap[item.type]}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{item.title}</span>
                    <Tag color={colorMap[item.type]} style={{ marginLeft: 8 }}>
                      {typeMap[item.type]}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    <div style={{ marginBottom: 4 }}>{item.content}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {dayjs(item.createdAt).format('MM-DD HH:mm')}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
