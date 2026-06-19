import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Tabs,
} from 'antd';
import { PlusOutlined, BellOutlined, CheckOutlined, StopOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import type { WaitlistItem } from '../types';

const { TabPane } = Tabs;

export default function WaitlistPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [now, setNow] = useState(dayjs());

  const {
    waitlist,
    addWaitlist,
    cancelWaitlist,
    processWaitlistForSlot,
    confirmWaitlist,
    declineWaitlist,
    stations,
    vaccines,
    slots,
    getWaitlistCountForSlot,
  } = useAppStore();

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  const waitingList = waitlist.filter((w) => w.status === 'waiting' && w.date === filterDate);
  const exactWaitingList = waitingList.filter((w) => w.slotId !== null);
  const generalWaitingList = waitingList.filter((w) => w.slotId === null);
  const notifiedList = waitlist.filter((w) => w.status === 'notified');
  const historyList = waitlist.filter((w) => w.status !== 'waiting' && w.status !== 'notified');

  const handleAdd = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    addWaitlist({
      stationId: values.stationId,
      vaccineId: values.vaccineId,
      date: values.date.format('YYYY-MM-DD'),
      patientName: values.patientName,
      idCard: values.idCard,
      phone: values.phone,
    });
    message.success('候补登记成功');
    setModalOpen(false);
  };

  const handleCancel = (id: string) => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消该候补给号吗？',
      onOk: () => {
        cancelWaitlist(id);
        message.success('已取消候补');
      },
    });
  };

  const handleNotify = (slotId: string) => {
    const result = processWaitlistForSlot(slotId);
    if (result) {
      message.success(`已通知 ${result.patientName} 补位`);
    } else {
      message.warning('该时段暂无候补人员或已有待确认通知');
    }
  };

  const handleConfirm = (id: string) => {
    const result = confirmWaitlist(id);
    if (result) {
      message.success('已确认补位，预约创建成功');
    } else {
      message.error('确认失败，名额可能已被占用');
    }
  };

  const handleDecline = (id: string) => {
    Modal.confirm({
      title: '确认放弃',
      content: '确定要放弃该补位机会吗？放弃后将顺延通知下一位候补人员。',
      onOk: () => {
        declineWaitlist(id);
        message.success('已放弃补位，已通知下一位');
      },
    });
  };

  const formatCountdown = (expiresAt: string) => {
    const remaining = dayjs(expiresAt).diff(now, 'second');
    if (remaining <= 0) return '00:00';
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const columns = [
    {
      title: '排位',
      dataIndex: 'priority',
      key: 'priority',
      width: 60,
      render: (priority: number) => (
        <Tag color={priority <= 3 ? 'red' : priority <= 5 ? 'orange' : 'default'}>
          #{priority}
        </Tag>
      ),
    },
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName' },
    { title: '身份证号', dataIndex: 'idCard', key: 'idCard' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName' },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName' },
    { title: '候补日期', dataIndex: 'date', key: 'date' },
    {
      title: '目标时段',
      key: 'targetSlot',
      width: 130,
      render: (_: unknown, record: WaitlistItem) => {
        if (record.slotId && record.slotStartTime && record.slotEndTime) {
          return (
            <Tag color="blue">
              {record.slotStartTime} - {record.slotEndTime}
            </Tag>
          );
        }
        return <Tag color="default">全天通用</Tag>;
      },
    },
    {
      title: '登记时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: WaitlistItem) => (
        <Space>
          <Button size="small" danger onClick={() => handleCancel(record.id)}>
            取消
          </Button>
        </Space>
      ),
    },
  ];

  const notifiedColumns = [
    {
      title: '排位',
      dataIndex: 'priority',
      key: 'priority',
      width: 60,
      render: (priority: number) => <Tag color="blue">#{priority}</Tag>,
    },
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName' },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName' },
    {
      title: '补位时段',
      key: 'slotTime',
      width: 130,
      render: (_: unknown, record: WaitlistItem) => (
        <Space direction="vertical" size={0}>
          <Tag color="blue">{record.date}</Tag>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {record.slotStartTime} - {record.slotEndTime}
          </span>
        </Space>
      ),
    },
    {
      title: '通知时间',
      dataIndex: 'notifiedAt',
      key: 'notifiedAt',
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '剩余确认时间',
      dataIndex: 'expiresAt',
      key: 'countdown',
      width: 120,
      render: (expiresAt: string) => {
        const remaining = dayjs(expiresAt).diff(now, 'second');
        const isUrgent = remaining < 300;
        return (
          <div style={{ textAlign: 'center' }}>
            <ClockCircleOutlined style={{ marginRight: 4, color: isUrgent ? '#fa8c16' : '#1890ff' }} />
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: remaining <= 0 ? '#ff4d4f' : isUrgent ? '#fa8c16' : '#1890ff',
              }}
              className={isUrgent && remaining > 0 ? 'timer-warning' : ''}
            >
              {formatCountdown(expiresAt)}
            </span>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: WaitlistItem) => {
        const remaining = dayjs(record.expiresAt).diff(now, 'second');
        if (remaining <= 0) {
          return <Tag color="red">已超时</Tag>;
        }
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleConfirm(record.id)}
            >
              确认补位
            </Button>
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleDecline(record.id)}
            >
              放弃
            </Button>
          </Space>
        );
      },
    },
  ];

  const historyStatusMap: Record<string, { text: string; color: string }> = {
    confirmed: { text: '已确认', color: 'green' },
    expired: { text: '已超时失效', color: 'red' },
    cancelled: { text: '已放弃', color: 'default' },
  };

  const historyColumns = [
    {
      title: '排位',
      dataIndex: 'priority',
      key: 'priority',
      width: 60,
      render: (priority: number) => `#${priority}`,
    },
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName' },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName' },
    {
      title: '补位时段',
      key: 'slotTime',
      render: (_: unknown, record: WaitlistItem) => {
        if (record.slotStartTime && record.slotEndTime) {
          return (
            <span>
              {record.date} {record.slotStartTime}-{record.slotEndTime}
            </span>
          );
        }
        return <span style={{ color: '#999' }}>未轮到</span>;
      },
    },
    {
      title: '通知时间',
      dataIndex: 'notifiedAt',
      key: 'notifiedAt',
      render: (time: string) => (time ? dayjs(time).format('MM-DD HH:mm') : '-'),
    },
    {
      title: '最终状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const s = historyStatusMap[status];
        if (!s) return <Tag>{status}</Tag>;
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
  ];

  const availableSlots = slots.filter(
    (s) => s.date === filterDate && s.bookedCount < s.totalCapacity
  );

  return (
    <div>
      <div className="page-card">
        <Row gutter={16}>
          <Col span={5}>
            <Card>
              <Statistic
                title="精确时段候补"
                value={exactWaitingList.length}
                valueStyle={{ color: '#fa541c' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="全天通用候补"
                value={generalWaitingList.length}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="已通知待确认"
                value={notifiedList.length}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="今日可补位时段"
                value={availableSlots.length}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="历史候补数" value={historyList.length} />
            </Card>
          </Col>
        </Row>
      </div>

      <div className="page-card">
        <Tabs defaultActiveKey="waiting">
          <TabPane tab="等待队列" key="waiting">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <DatePicker
                value={dayjs(filterDate)}
                onChange={(date) => date && setFilterDate(date.format('YYYY-MM-DD'))}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                候补登记
              </Button>
            </div>
            <Table
              columns={columns}
              dataSource={waitingList.sort((a, b) => a.priority - b.priority)}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '暂无候补人员' }}
            />
          </TabPane>

          <TabPane tab={`已通知补位 (${notifiedList.length})`} key="notified">
            {notifiedList.length > 0 ? (
              <Table
                columns={notifiedColumns}
                dataSource={notifiedList.sort(
                  (a, b) => dayjs(a.notifiedAt).unix() - dayjs(b.notifiedAt).unix()
                )}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: '暂无通知记录' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                暂无待确认的补位通知
              </div>
            )}
          </TabPane>

          <TabPane tab="手动补位" key="manual">
            <div style={{ marginBottom: 16 }}>
              <DatePicker
                value={dayjs(filterDate)}
                onChange={(date) => date && setFilterDate(date.format('YYYY-MM-DD'))}
                style={{ width: 200 }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {availableSlots.length > 0 ? (
                availableSlots.map((slot) => {
                  const hasNotifiedForSlot = waitlist.some(
                    (w) => w.slotId === slot.id && w.status === 'notified'
                  );
                  const exactCount = waitlist.filter(
                    (w) => w.slotId === slot.id && w.status === 'waiting'
                  ).length;
                  const generalCount = waitlist.filter(
                    (w) =>
                      w.slotId === null &&
                      w.stationId === slot.stationId &&
                      w.vaccineId === slot.vaccineId &&
                      w.date === slot.date &&
                      w.status === 'waiting'
                  ).length;
                  const totalWaiting = exactCount + generalCount;
                  return (
                    <Card
                      key={slot.id}
                      size="small"
                      title={`${slot.stationName} - ${slot.startTime}~${slot.endTime}`}
                      style={{ width: 280 }}
                      extra={
                        <Tag color="green">
                          {slot.totalCapacity - slot.bookedCount} 空位
                        </Tag>
                      }
                    >
                      <p style={{ marginBottom: 4 }}>
                        疫苗：{slot.vaccineName}
                      </p>
                      <p style={{ marginBottom: 4, color: '#999', fontSize: 13 }}>
                        已预约：{slot.bookedCount}/{slot.totalCapacity}
                      </p>
                      <div style={{ marginBottom: 12, fontSize: 13 }}>
                        <p style={{ marginBottom: 2, color: '#fa541c' }}>
                          精确时段候补：{exactCount} 人
                        </p>
                        <p style={{ marginBottom: 0, color: '#faad14' }}>
                          全天通用候补：{generalCount} 人
                        </p>
                      </div>
                      {hasNotifiedForSlot ? (
                        <Button block disabled type="default">
                          已通知候补人待确认
                        </Button>
                      ) : totalWaiting > 0 ? (
                        <Button
                          type="primary"
                          block
                          icon={<BellOutlined />}
                          onClick={() => handleNotify(slot.id)}
                        >
                          通知下一位候补
                        </Button>
                      ) : (
                        <Button block disabled type="default">
                          暂无候补人员
                        </Button>
                      )}
                    </Card>
                  );
                })
              ) : (
                <div style={{ width: '100%', textAlign: 'center', padding: 40, color: '#999' }}>
                  今日暂无空余时段
                </div>
              )}
            </div>
          </TabPane>

          <TabPane tab={`历史记录 (${historyList.length})`} key="history">
            <Table
              columns={historyColumns}
              dataSource={historyList
                .sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix())}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '暂无历史记录' }}
            />
          </TabPane>
        </Tabs>
      </div>

      <Modal
        title="候补登记"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="stationId"
            label="接种台"
            rules={[{ required: true, message: '请选择接种台' }]}
          >
            <Select placeholder="请选择接种台">
              {stations.map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="vaccineId"
            label="疫苗类型"
            rules={[{ required: true, message: '请选择疫苗' }]}
          >
            <Select placeholder="请选择疫苗">
              {vaccines.map((v) => (
                <Select.Option key={v.id} value={v.id}>
                  {v.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="date"
            label="候补日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
            />
          </Form.Item>
          <Form.Item
            name="patientName"
            label="患者姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="idCard"
            label="身份证号"
            rules={[
              { required: true, message: '请输入身份证号' },
              { len: 18, message: '身份证号为18位' },
            ]}
          >
            <Input placeholder="请输入身份证号" maxLength={18} />
          </Form.Item>
          <Form.Item
            name="phone"
            label="联系电话"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认候补
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
