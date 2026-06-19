import { useState } from 'react';
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
import { PlusOutlined, CloseOutlined, BellOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import type { WaitlistItem } from '../types';

const { TabPane } = Tabs;

export default function WaitlistPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD'));

  const {
    waitlist,
    addWaitlist,
    cancelWaitlist,
    processWaitlistForSlot,
    stations,
    vaccines,
    slots,
  } = useAppStore();

  const waitingList = waitlist.filter((w) => w.status === 'waiting' && w.date === filterDate);
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
      message.warning('该时段暂无候补人员');
    }
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
    { title: '日期', dataIndex: 'date', key: 'date' },
    {
      title: '登记时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
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
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName' },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName' },
    { title: '日期', dataIndex: 'date', key: 'date' },
    {
      title: '通知时间',
      dataIndex: 'notifiedAt',
      key: 'notifiedAt',
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '有效期至',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (time: string) => {
        const isExpired = dayjs().isAfter(dayjs(time));
        return (
          <Tag color={isExpired ? 'red' : 'green'}>
            {dayjs(time).format('HH:mm')}
            {isExpired ? ' (已过期)' : ''}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          notified: 'blue',
          confirmed: 'green',
          expired: 'red',
          cancelled: 'default',
        };
        const textMap: Record<string, string> = {
          notified: '已通知',
          confirmed: '已确认',
          expired: '已过期',
          cancelled: '已取消',
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
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
          <Col span={6}>
            <Card>
              <Statistic title="候补等待中" value={waitingList.length} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已通知待确认" value={notifiedList.length} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日可补位时段"
                value={availableSlots.length}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
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

          <TabPane tab="已通知补位" key="notified">
            <Table
              columns={notifiedColumns}
              dataSource={notifiedList}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '暂无通知记录' }}
            />
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
                availableSlots.map((slot) => (
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
                    <p style={{ marginBottom: 8 }}>
                      疫苗：{slot.vaccineName}
                    </p>
                    <p style={{ marginBottom: 12, color: '#999', fontSize: 13 }}>
                      已预约：{slot.bookedCount}/{slot.totalCapacity}
                    </p>
                    <Button
                      type="primary"
                      block
                      icon={<BellOutlined />}
                      onClick={() => handleNotify(slot.id)}
                    >
                      通知下一位候补
                    </Button>
                  </Card>
                ))
              ) : (
                <div style={{ width: '100%', textAlign: 'center', padding: 40, color: '#999' }}>
                  今日暂无空余时段
                </div>
              )}
            </div>
          </TabPane>

          <TabPane tab="历史记录" key="history">
            <Table
              columns={notifiedColumns}
              dataSource={historyList}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '暂无历史记录' }}
            />
          </TabPane>
        </Tabs>
      </div>

      <Modal title="候补登记" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={500}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="stationId" label="接种台" rules={[{ required: true, message: '请选择接种台' }]}>
            <Select placeholder="请选择接种台">
              {stations.map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="vaccineId" label="疫苗类型" rules={[{ required: true, message: '请选择疫苗' }]}>
            <Select placeholder="请选择疫苗">
              {vaccines.map((v) => (
                <Select.Option key={v.id} value={v.id}>
                  {v.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="date" label="候补日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))} />
          </Form.Item>
          <Form.Item name="patientName" label="患者姓名" rules={[{ required: true, message: '请输入姓名' }]}>
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
