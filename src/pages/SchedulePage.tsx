import { useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  TimePicker,
  Tag,
  Space,
  message,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, BellOutlined, UserAddOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import type { VaccinationStation, AppointmentSlot, Appointment } from '../types';

const { TabPane } = Tabs;

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState('appointments');
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<VaccinationStation | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [waitlistSlot, setWaitlistSlot] = useState<AppointmentSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [form] = Form.useForm();
  const [appointmentForm] = Form.useForm();
  const [slotForm] = Form.useForm();
  const [waitlistForm] = Form.useForm();

  const {
    stations,
    addStation,
    updateStation,
    deleteStation,
    slots,
    generateSlots,
    appointments,
    createAppointment,
    cancelAppointment,
    checkInAppointment,
    vaccines,
    waitlist,
    addWaitlist,
    processWaitlistForSlot,
    getWaitlistCountForSlot,
  } = useAppStore();

  const handleAddStation = () => {
    setEditingStation(null);
    form.resetFields();
    setStationModalOpen(true);
  };

  const handleEditStation = (station: VaccinationStation) => {
    setEditingStation(station);
    form.setFieldsValue({
      ...station,
      workStartTime: dayjs(station.workStartTime, 'HH:mm'),
      workEndTime: dayjs(station.workEndTime, 'HH:mm'),
    });
    setStationModalOpen(true);
  };

  const handleSaveStation = (values: any) => {
    const stationData = {
      name: values.name,
      location: values.location,
      capacityPerSlot: values.capacityPerSlot,
      workStartTime: values.workStartTime.format('HH:mm'),
      workEndTime: values.workEndTime.format('HH:mm'),
      slotDuration: values.slotDuration,
      status: values.status,
    };

    if (editingStation) {
      updateStation(editingStation.id, stationData);
      message.success('更新成功');
    } else {
      addStation(stationData);
      message.success('添加成功');
    }
    setStationModalOpen(false);
  };

  const handleDeleteStation = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该接种台吗？',
      onOk: () => {
        deleteStation(id);
        message.success('删除成功');
      },
    });
  };

  const handleGenerateSlots = () => {
    slotForm.resetFields();
    setSlotModalOpen(true);
  };

  const handleSlotGenerate = (values: any) => {
    const date = values.date.format('YYYY-MM-DD');
    generateSlots(values.stationId, date, values.vaccineId);
    message.success('排期生成成功');
    setSlotModalOpen(false);
  };

  const filteredSlots = slots.filter((s) => s.date === selectedDate);
  const slotsByStation: Record<string, AppointmentSlot[]> = {};
  filteredSlots.forEach((slot) => {
    if (!slotsByStation[slot.stationId]) {
      slotsByStation[slot.stationId] = [];
    }
    slotsByStation[slot.stationId].push(slot);
  });

  const handleBookAppointment = (slot: AppointmentSlot) => {
    setSelectedSlot(slot);
    appointmentForm.resetFields();
    setAppointmentModalOpen(true);
  };

  const handleAppointmentSubmit = (values: any) => {
    if (!selectedSlot) return;
    const result = createAppointment({
      slotId: selectedSlot.id,
      patientName: values.patientName,
      idCard: values.idCard,
      phone: values.phone,
    });
    if (result) {
      message.success('预约成功');
      setAppointmentModalOpen(false);
    } else {
      message.error('预约失败，名额已满');
    }
  };

  const handleCancelAppointment = (id: string) => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消该预约吗？',
      onOk: () => {
        cancelAppointment(id);
        message.success('已取消预约');
      },
    });
  };

  const handleCheckIn = (id: string) => {
    checkInAppointment(id);
    message.success('签到成功');
  };

  const handleWaitlistFromSlot = (slot: AppointmentSlot) => {
    setWaitlistSlot(slot);
    waitlistForm.resetFields();
    waitlistForm.setFieldsValue({
      stationId: slot.stationId,
      vaccineId: slot.vaccineId,
      date: dayjs(slot.date),
    });
    setWaitlistModalOpen(true);
  };

  const handleWaitlistSubmit = (values: any) => {
    addWaitlist({
      stationId: values.stationId,
      vaccineId: values.vaccineId,
      date: values.date.format('YYYY-MM-DD'),
      patientName: values.patientName,
      idCard: values.idCard,
      phone: values.phone,
    });
    message.success('候补登记成功');
    setWaitlistModalOpen(false);
  };

  const handleNotifyNext = (slotId: string) => {
    const result = processWaitlistForSlot(slotId);
    if (result) {
      message.success(`已通知 ${result.patientName} 补位`);
    } else {
      message.warning('该时段暂无候补人员或已有待确认通知');
    }
  };

  const todayAppointments = appointments.filter((a) => a.date === selectedDate);
  const bookedCount = todayAppointments.filter((a) => a.status === 'booked').length;
  const completedCount = todayAppointments.filter((a) => a.status === 'completed').length;
  const totalSlots = filteredSlots.reduce((sum, s) => sum + s.totalCapacity, 0);

  const statusMap: Record<string, { text: string; color: string }> = {
    booked: { text: '已预约', color: 'blue' },
    checked_in: { text: '已签到', color: 'gold' },
    vaccinated: { text: '已接种', color: 'cyan' },
    observed: { text: '留观中', color: 'green' },
    completed: { text: '已完成', color: 'success' },
    cancelled: { text: '已取消', color: 'default' },
    no_show: { text: '未到', color: 'red' },
  };

  const stationColumns = [
    { title: '接种台名称', dataIndex: 'name', key: 'name' },
    { title: '位置', dataIndex: 'location', key: 'location' },
    { title: '每时段容量', dataIndex: 'capacityPerSlot', key: 'capacityPerSlot' },
    { title: '工作时间', key: 'time', render: (_: unknown, r: VaccinationStation) => `${r.workStartTime} - ${r.workEndTime}` },
    { title: '时段时长', dataIndex: 'slotDuration', key: 'slotDuration', render: (v: number) => `${v}分钟` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: VaccinationStation) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditStation(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteStation(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const appointmentColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName' },
    { title: '身份证号', dataIndex: 'idCard', key: 'idCard' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName' },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName' },
    { title: '时段', key: 'time', render: (_: unknown, r: Appointment) => `${r.startTime} - ${r.endTime}` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const s = statusMap[status];
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Appointment) => (
        <Space>
          {record.status === 'booked' && (
            <>
              <Button type="primary" size="small" onClick={() => handleCheckIn(record.id)}>
                签到
              </Button>
              <Button size="small" danger onClick={() => handleCancelAppointment(record.id)}>
                取消
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-card">
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="今日预约数" value={bookedCount} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已完成接种" value={completedCount} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="今日号源总量" value={totalSlots} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="接种台数量" value={stations.length} />
            </Card>
          </Col>
        </Row>
      </div>

      <div className="page-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="预约管理" key="appointments">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <DatePicker
                  value={dayjs(selectedDate)}
                  onChange={(date) => date && setSelectedDate(date.format('YYYY-MM-DD'))}
                  style={{ width: 200 }}
                />
              </Space>
            </div>

            {stations.map((station) => (
              <Card
                key={station.id}
                title={
                  <Space>
                    <span>{station.name}</span>
                    <Tag color="blue">{station.location}</Tag>
                  </Space>
                }
                style={{ marginBottom: 16 }}
                size="small"
                extra={
                  slotsByStation[station.id]?.length > 0 ? (
                    <span style={{ color: '#999', fontSize: 13 }}>
                      共 {slotsByStation[station.id].length} 个时段
                    </span>
                  ) : null
                }
              >
                {slotsByStation[station.id] ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {slotsByStation[station.id].map((slot) => {
                      const isFull = slot.bookedCount >= slot.totalCapacity;
                      const waitlistStats = getWaitlistCountForSlot(slot.id);
                      const hasNotified = waitlistStats.notified > 0;
                      const hasWaiting = waitlistStats.waiting > 0;

                      return (
                        <Card
                          key={slot.id}
                          size="small"
                          style={{
                            width: 200,
                            borderColor: isFull ? '#ff4d4f' : '#d9d9d9',
                          }}
                          styles={{ body: { padding: 12 } }}
                          title={
                            <div style={{ fontSize: 14, fontWeight: 500 }}>
                              {slot.startTime} - {slot.endTime}
                            </div>
                          }
                          extra={
                            <Tag color={isFull ? 'red' : 'green'}>
                              {isFull ? '已满' : '可预约'}
                            </Tag>
                          }
                        >
                          <div style={{ marginBottom: 8, fontSize: 13 }}>
                            <span style={{ color: '#666' }}>疫苗：</span>
                            <span>{slot.vaccineName}</span>
                          </div>
                          <div style={{ marginBottom: 8, fontSize: 13 }}>
                            <span style={{ color: '#666' }}>预约：</span>
                            <span style={{ color: isFull ? '#ff4d4f' : '#52c41a', fontWeight: 500 }}>
                              {slot.bookedCount}/{slot.totalCapacity}
                            </span>
                          </div>
                          <div style={{ marginBottom: 10, display: 'flex', gap: 8, fontSize: 12 }}>
                            <Tag color="orange" style={{ margin: 0 }}>
                              候补 {waitlistStats.waiting}
                            </Tag>
                            <Tag color="blue" style={{ margin: 0 }}>
                              待确认 {waitlistStats.notified}
                            </Tag>
                          </div>
                          <Space direction="vertical" size={6} style={{ width: '100%' }}>
                            {!isFull && (
                              <Button
                                type="primary"
                                size="small"
                                block
                                onClick={() => handleBookAppointment(slot)}
                              >
                                预约登记
                              </Button>
                            )}
                            {!isFull && hasWaiting && !hasNotified && (
                              <Button
                                size="small"
                                block
                                icon={<BellOutlined />}
                                onClick={() => handleNotifyNext(slot.id)}
                              >
                                通知下一位候补
                              </Button>
                            )}
                            {!isFull && hasNotified && (
                              <Button size="small" block disabled>
                                已通知待确认
                              </Button>
                            )}
                            {isFull && (
                              <Button
                                size="small"
                                block
                                icon={<UserAddOutlined />}
                                onClick={() => handleWaitlistFromSlot(slot)}
                              >
                                登记候补
                              </Button>
                            )}
                          </Space>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>
                    暂无排期，请先生成排期
                  </div>
                )}
              </Card>
            ))}

            <Table
              columns={appointmentColumns}
              dataSource={todayAppointments}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane tab="接种台管理" key="stations">
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStation}>
                添加接种台
              </Button>
            </div>
            <Table columns={stationColumns} dataSource={stations} rowKey="id" pagination={false} />
          </TabPane>

          <TabPane tab="排期生成" key="slots">
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<CalendarOutlined />} onClick={handleGenerateSlots}>
                生成排期
              </Button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <DatePicker
                value={dayjs(selectedDate)}
                onChange={(date) => date && setSelectedDate(date.format('YYYY-MM-DD'))}
                style={{ width: 200 }}
              />
            </div>
            <Table
              columns={[
                { title: '接种台', dataIndex: 'stationName', key: 'stationName' },
                { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName' },
                { title: '日期', dataIndex: 'date', key: 'date' },
                { title: '时段', key: 'time', render: (_, r: AppointmentSlot) => `${r.startTime} - ${r.endTime}` },
                { title: '容量', key: 'capacity', render: (_, r: AppointmentSlot) => `${r.bookedCount}/${r.totalCapacity}` },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'available' ? 'green' : status === 'full' ? 'red' : 'default'}>
                      {status === 'available' ? '可预约' : status === 'full' ? '已满' : '已关闭'}
                    </Tag>
                  ),
                },
              ]}
              dataSource={filteredSlots}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </div>

      <Modal
        title={editingStation ? '编辑接种台' : '添加接种台'}
        open={stationModalOpen}
        onCancel={() => setStationModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveStation}>
          <Form.Item name="name" label="接种台名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入接种台名称" />
          </Form.Item>
          <Form.Item name="location" label="位置" rules={[{ required: true, message: '请输入位置' }]}>
            <Input placeholder="请输入位置" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="capacityPerSlot" label="每时段容量" rules={[{ required: true, message: '请输入容量' }]}>
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="slotDuration" label="时段时长(分钟)" rules={[{ required: true, message: '请输入时长' }]}>
                <InputNumber min={10} max={120} step={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="workStartTime" label="上班时间" rules={[{ required: true, message: '请选择' }]}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="workEndTime" label="下班时间" rules={[{ required: true, message: '请选择' }]}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select>
              <Select.Option value="active">启用</Select.Option>
              <Select.Option value="inactive">停用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="生成排期" open={slotModalOpen} onCancel={() => setSlotModalOpen(false)} footer={null} width={500}>
        <Form form={slotForm} layout="vertical" onFinish={handleSlotGenerate}>
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
          <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              生成排期
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="预约登记" open={appointmentModalOpen} onCancel={() => setAppointmentModalOpen(false)} footer={null} width={500}>
        <Form form={appointmentForm} layout="vertical" onFinish={handleAppointmentSubmit}>
          {selectedSlot && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <div>
                <strong>接种台：</strong>
                {selectedSlot.stationName}
              </div>
              <div>
                <strong>疫苗：</strong>
                {selectedSlot.vaccineName}
              </div>
              <div>
                <strong>时段：</strong>
                {selectedSlot.date} {selectedSlot.startTime} - {selectedSlot.endTime}
              </div>
              <div>
                <strong>剩余名额：</strong>
                {selectedSlot.totalCapacity - selectedSlot.bookedCount}
              </div>
            </div>
          )}
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
              确认预约
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="候补登记"
        open={waitlistModalOpen}
        onCancel={() => setWaitlistModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={waitlistForm} layout="vertical" onFinish={handleWaitlistSubmit}>
          {waitlistSlot && (
            <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 8 }}>
              <div style={{ marginBottom: 4 }}>
                <strong>接种台：</strong>
                {waitlistSlot.stationName}
              </div>
              <div style={{ marginBottom: 4 }}>
                <strong>疫苗：</strong>
                {waitlistSlot.vaccineName}
              </div>
              <div>
                <strong>目标时段：</strong>
                {waitlistSlot.date} {waitlistSlot.startTime} - {waitlistSlot.endTime}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#fa8c16' }}>
                该时段已满，登记候补后有空位将按顺序通知补位
              </div>
            </div>
          )}
          <Form.Item
            name="stationId"
            label="接种台"
            rules={[{ required: true, message: '请选择接种台' }]}
          >
            <Select placeholder="请选择接种台" disabled={!!waitlistSlot}>
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
            <Select placeholder="请选择疫苗" disabled={!!waitlistSlot}>
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
              disabled={!!waitlistSlot}
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
