import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Row,
  Col,
  message,
  Radio,
  Input,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import type { Appointment } from '../types';

export default function StationWorkbenchPage() {
  const [now, setNow] = useState(dayjs());
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [selectedVaccineIds, setSelectedVaccineIds] = useState<string[]>([]);
  const [vaccinateModalOpen, setVaccinateModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [completingAppointmentId, setCompletingAppointmentId] = useState<string | null>(null);
  const [observationResult, setObservationResult] = useState<'normal' | 'abnormal' | 'urgent'>('normal');
  const [observationNote, setObservationNote] = useState('');
  const [form] = Form.useForm();

  const {
    appointments,
    stations,
    vaccines,
    batches,
    checkInAppointment,
    vaccinateAppointment,
    startObservation,
    completeObservationWithResult,
  } = useAppStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (selectedStationIds.length > 0 && !selectedStationIds.includes(a.stationId)) {
        return false;
      }
      if (selectedVaccineIds.length > 0 && !selectedVaccineIds.includes(a.vaccineId)) {
        return false;
      }
      return true;
    });
  }, [appointments, selectedStationIds, selectedVaccineIds]);

  const bookedList = filteredAppointments.filter((a) => a.status === 'booked');
  const checkedInList = filteredAppointments.filter((a) => a.status === 'checked_in');
  const observedList = filteredAppointments.filter((a) => a.status === 'observed');
  const vaccinatedList = filteredAppointments.filter((a) => a.status === 'vaccinated');

  const expiredObservationList = observedList.filter(
    (a) => a.observationEndTime && dayjs(a.observationEndTime).isBefore(now)
  );

  const activeObservationList = observedList.filter(
    (a) => !a.observationEndTime || !dayjs(a.observationEndTime).isBefore(now)
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingSeconds = (endTime: string) => {
    const end = dayjs(endTime);
    const remaining = end.diff(now, 'second');
    return Math.max(0, remaining);
  };

  const availableBatches = batches
    .filter(
      (b) =>
        b.status === 'normal' &&
        b.usedQuantity < b.quantity &&
        !dayjs(b.expiryDate).isBefore(dayjs().startOf('day'))
    )
    .sort((a, b) => dayjs(a.expiryDate).unix() - dayjs(b.expiryDate).unix());

  const handleCheckIn = (id: string) => {
    checkInAppointment(id);
    message.success('签到成功');
  };

  const handleVaccinate = (apt: Appointment) => {
    setSelectedAppointment(apt);
    form.resetFields();
    setVaccinateModalOpen(true);
  };

  const handleVaccinateSubmit = (values: any) => {
    if (!selectedAppointment) return;
    vaccinateAppointment(selectedAppointment.id, values.batchId);
    message.success('接种完成');
    setVaccinateModalOpen(false);
  };

  const handleStartObservation = (id: string) => {
    startObservation(id);
    message.success('开始留观计时');
  };

  const handleCompleteObservation = (id: string) => {
    setCompletingAppointmentId(id);
    setObservationResult('normal');
    setObservationNote('');
    setCompleteModalOpen(true);
  };

  const handleCompleteSubmit = () => {
    if (!completingAppointmentId) return;
    if (observationResult !== 'normal' && !observationNote.trim()) {
      message.warning('请填写异常说明');
      return;
    }
    completeObservationWithResult(
      completingAppointmentId,
      observationResult,
      observationResult !== 'normal' ? observationNote : undefined
    );
    const resultText: Record<string, string> = {
      normal: '正常',
      abnormal: '一般异常',
      urgent: '紧急异常',
    };
    message.success(`留观结束，结果：${resultText[observationResult]}`);
    setCompleteModalOpen(false);
    setCompletingAppointmentId(null);
  };

  const bookedColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName', width: 100 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 130 },
    {
      title: '预约时段',
      key: 'timeSlot',
      width: 150,
      render: (_: unknown, r: Appointment) => `${r.date} ${r.startTime}-${r.endTime}`,
    },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName', width: 120 },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Appointment) => (
        <Button
          type="primary"
          size="small"
          icon={<LoginOutlined />}
          onClick={() => handleCheckIn(record.id)}
        >
          签到
        </Button>
      ),
    },
  ];

  const checkedInColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName', width: 100 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName', width: 120 },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Appointment) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => handleVaccinate(record)}
        >
          接种
        </Button>
      ),
    },
  ];

  const observationColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName', width: 100 },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName', width: 120 },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName', width: 100 },
    {
      title: '剩余时间',
      key: 'remaining',
      width: 120,
      render: (_: unknown, record: Appointment) => {
        if (!record.observationEndTime) return null;
        const remaining = getRemainingSeconds(record.observationEndTime);
        const isWarning = remaining < 300 && remaining > 0;
        const isExpired = remaining <= 0;
        return (
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: isExpired ? '#ff4d4f' : isWarning ? '#fa8c16' : '#1890ff',
            }}
          >
            {formatTime(remaining)}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, record: Appointment) => (
        <Space>
          {record.status === 'vaccinated' && (
            <Button
              type="primary"
              size="small"
              icon={<ClockCircleOutlined />}
              onClick={() => handleStartObservation(record.id)}
            >
              开始留观
            </Button>
          )}
          {record.status === 'observed' && record.observationEndTime && (
            <>
              {(() => {
                const remaining = getRemainingSeconds(record.observationEndTime!);
                const canFinish = remaining <= 0;
                return (
                  <Button
                    type={canFinish ? 'primary' : 'default'}
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleCompleteObservation(record.id)}
                    disabled={!canFinish}
                    danger={canFinish}
                  >
                    {canFinish ? '结束留观' : '未到期'}
                  </Button>
                );
              })()}
            </>
          )}
        </Space>
      ),
    },
  ];

  const expiredObservationColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName', width: 100 },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName', width: 120 },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName', width: 100 },
    {
      title: '留观结束时间',
      dataIndex: 'observationEndTime',
      key: 'observationEndTime',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '超时',
      key: 'overdue',
      width: 120,
      render: (_: unknown, record: Appointment) => {
        if (!record.observationEndTime) return null;
        const overdueSeconds = Math.abs(getRemainingSeconds(record.observationEndTime));
        return (
          <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
            已超时 {formatTime(overdueSeconds)}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: Appointment) => (
        <Button
          type="primary"
          size="small"
          danger
          icon={<CheckCircleOutlined />}
          onClick={() => handleCompleteObservation(record.id)}
        >
          结束留观
        </Button>
      ),
    },
  ];

  const stationOptions = stations.map((s) => (
    <Select.Option key={s.id} value={s.id}>
      {s.name}
    </Select.Option>
  ));

  const vaccineOptions = vaccines.map((v) => (
    <Select.Option key={v.id} value={v.id}>
      {v.name}
    </Select.Option>
  ));

  return (
    <div>
      <div className="page-card">
        <Card>
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Space size={8} align="center">
                <span style={{ fontWeight: 500 }}>接种台：</span>
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="全部接种台"
                  style={{ minWidth: 300 }}
                  value={selectedStationIds.length > 0 ? selectedStationIds : undefined}
                  onChange={(value) => setSelectedStationIds(value)}
                  maxTagCount="responsive"
                >
                  {stationOptions}
                </Select>
              </Space>
            </Col>
            <Col span={12}>
              <Space size={8} align="center">
                <span style={{ fontWeight: 500 }}>疫苗：</span>
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="全部疫苗"
                  style={{ minWidth: 300 }}
                  value={selectedVaccineIds.length > 0 ? selectedVaccineIds : undefined}
                  onChange={(value) => setSelectedVaccineIds(value)}
                  maxTagCount="responsive"
                >
                  {vaccineOptions}
                </Select>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>

      <div className="page-card">
        {expiredObservationList.length > 0 && (
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#ff4d4f' }} />
                <span style={{ color: '#ff4d4f' }}>到点待处理</span>
                <Tag color="red" icon={<WarningOutlined />}>
                  {expiredObservationList.length} 人
                </Tag>
                <Tag color="red">待处理</Tag>
              </Space>
            }
            style={{
              marginBottom: 16,
              borderColor: '#ff4d4f',
              boxShadow: '0 0 0 2px rgba(255,77,79,0.1)',
            }}
            styles={{ header: { borderBottomColor: '#ffccc7' } }}
          >
            <Table
              columns={expiredObservationColumns}
              dataSource={expiredObservationList}
              rowKey="id"
              pagination={false}
            />
          </Card>
        )}

        <Card
          title={
            <Space>
              <LoginOutlined style={{ color: '#1890ff' }} />
              <span>待签到</span>
              <Tag color="blue">{bookedList.length} 人</Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          {bookedList.length > 0 ? (
            <Table
              columns={bookedColumns}
              dataSource={bookedList}
              rowKey="id"
              pagination={false}
              scroll={{ x: 800 }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              暂无待签到预约
            </div>
          )}
        </Card>

        <Card
          title={
            <Space>
              <PlayCircleOutlined style={{ color: '#faad14' }} />
              <span>待接种</span>
              <Tag color="gold">{checkedInList.length} 人</Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          {checkedInList.length > 0 ? (
            <Table
              columns={checkedInColumns}
              dataSource={checkedInList}
              rowKey="id"
              pagination={false}
              scroll={{ x: 600 }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              暂无待接种人员
            </div>
          )}
        </Card>

        <Card
          title={
            <Space>
              <ClockCircleOutlined style={{ color: '#13c2c2' }} />
              <span>留观中</span>
              <Tag color="cyan">{activeObservationList.length + vaccinatedList.length} 人</Tag>
            </Space>
          }
        >
          {activeObservationList.length + vaccinatedList.length > 0 ? (
            <Table
              columns={observationColumns}
              dataSource={[...vaccinatedList, ...activeObservationList]}
              rowKey="id"
              pagination={false}
              scroll={{ x: 900 }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              暂无留观人员
            </div>
          )}
        </Card>
      </div>

      <Modal
        title="接种确认"
        open={vaccinateModalOpen}
        onCancel={() => setVaccinateModalOpen(false)}
        footer={null}
        width={500}
      >
        {selectedAppointment && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <div>
                <strong>患者：</strong>
                {selectedAppointment.patientName}
              </div>
              <div>
                <strong>疫苗：</strong>
                {selectedAppointment.vaccineName}
              </div>
              <div>
                <strong>接种台：</strong>
                {selectedAppointment.stationName}
              </div>
              <div>
                <strong>电话：</strong>
                {selectedAppointment.phone}
              </div>
            </div>
            <Form form={form} layout="vertical" onFinish={handleVaccinateSubmit}>
              <Form.Item
                name="batchId"
                label="选择疫苗批次"
                rules={[{ required: true, message: '请选择批次' }]}
              >
                <Select placeholder="请选择批次">
                  {availableBatches
                    .filter((b) => b.vaccineId === selectedAppointment.vaccineId)
                    .map((b) => (
                      <Select.Option key={b.id} value={b.id}>
                        {b.batchNo} | 剩余 {b.quantity - b.usedQuantity} 支 | 有效期至 {b.expiryDate}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  确认接种
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title="结束留观 - 结果登记"
        open={completeModalOpen}
        onOk={handleCompleteSubmit}
        onCancel={() => {
          setCompleteModalOpen(false);
          setCompletingAppointmentId(null);
        }}
        okText="确认结束"
        cancelText="取消"
        width={520}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>留观结果：</div>
          <Radio.Group
            value={observationResult}
            onChange={(e) => setObservationResult(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical">
              <Radio value="normal">正常 - 无不良反应，患者可以离开</Radio>
              <Radio value="abnormal">
                <span style={{ color: '#fa8c16' }}>一般异常</span> - 有轻微不良反应
              </Radio>
              <Radio value="urgent">
                <span style={{ color: '#ff4d4f', fontWeight: 600 }}>紧急异常</span> - 出现严重反应需紧急处理
              </Radio>
            </Space>
          </Radio.Group>
        </div>

        {observationResult !== 'normal' && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              <span style={{ color: '#ff4d4f' }}>* </span>
              异常说明：
            </div>
            <Input.TextArea
              value={observationNote}
              onChange={(e) => setObservationNote(e.target.value)}
              placeholder="请详细描述异常情况、症状、处理措施等..."
              rows={4}
              showCount
              maxLength={500}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
