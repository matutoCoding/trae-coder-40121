import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Statistic,
  Row,
  Col,
  message,
  Progress,
  Radio,
  Input,
} from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import type { Appointment } from '../types';

export default function ObservationPage() {
  const [now, setNow] = useState(dayjs());
  const [vaccinateModalOpen, setVaccinateModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [completingAppointmentId, setCompletingAppointmentId] = useState<string | null>(null);
  const [observationResult, setObservationResult] = useState<'normal' | 'abnormal' | 'urgent'>('normal');
  const [observationNote, setObservationNote] = useState('');
  const [form] = Form.useForm();

  const {
    appointments,
    batches,
    records,
    vaccinateAppointment,
    startObservation,
    completeObservationWithResult,
    observationTimers,
  } = useAppStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const checkedInList = appointments.filter((a) => a.status === 'checked_in');
  const vaccinatedList = appointments.filter((a) => a.status === 'vaccinated');
  const observingList = appointments.filter((a) => a.status === 'observed');
  const completedToday = appointments.filter(
    (a) => a.status === 'completed' && dayjs(a.observationEndTime).isSame(dayjs(), 'day')
  );

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

  const getProgress = (startTime: string, endTime: string) => {
    const total = dayjs(endTime).diff(dayjs(startTime), 'second');
    const elapsed = now.diff(dayjs(startTime), 'second');
    return Math.min(100, (elapsed / total) * 100);
  };

  const availableBatches = batches.filter(
    (b) => b.status === 'normal' && b.usedQuantity < b.quantity && !dayjs(b.expiryDate).isBefore(dayjs().startOf('day'))
  );

  const observingColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName', width: 100 },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName', width: 120 },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName', width: 100 },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '留观进度',
      key: 'progress',
      render: (_: unknown, record: Appointment) => {
        if (!record.observationStartTime || !record.observationEndTime) return null;
        const progress = getProgress(record.observationStartTime, record.observationEndTime);
        const remaining = getRemainingSeconds(record.observationEndTime);
        const isWarning = remaining < 300;

        return (
          <div style={{ minWidth: 200 }}>
            <Progress
              percent={Math.round(progress)}
              status={progress >= 100 ? 'success' : isWarning ? 'exception' : 'active'}
              size="small"
            />
            <div
              style={{
                textAlign: 'center',
                fontSize: 18,
                fontWeight: 600,
                color: progress >= 100 ? '#52c41a' : isWarning ? '#ff4d4f' : '#1890ff',
              }}
              className={isWarning && progress < 100 ? 'timer-warning' : ''}
            >
              {formatTime(remaining)}
            </div>
          </div>
        );
      },
    },
    {
      title: '开始时间',
      dataIndex: 'observationStartTime',
      key: 'observationStartTime',
      width: 160,
      render: (time: string) => dayjs(time).format('HH:mm:ss'),
    },
    {
      title: '预计结束',
      dataIndex: 'observationEndTime',
      key: 'observationEndTime',
      width: 160,
      render: (time: string) => dayjs(time).format('HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: Appointment) => {
        const remaining = getRemainingSeconds(record.observationEndTime || '');
        const canFinish = remaining <= 0;
        return (
          <Button
            type={canFinish ? 'primary' : 'default'}
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleCompleteObservation(record.id)}
            disabled={!canFinish}
          >
            {canFinish ? '结束留观' : '未到期'}
          </Button>
        );
      },
    },
  ];

  const waitingColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName' },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName' },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName' },
    { title: '预约时段', key: 'time', render: (_: unknown, r: Appointment) => `${r.startTime} - ${r.endTime}` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const map: Record<string, { text: string; color: string }> = {
          checked_in: { text: '待接种', color: 'gold' },
          vaccinated: { text: '待留观', color: 'cyan' },
        };
        const s = map[status];
        return <Tag color={s?.color}>{s?.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Appointment) => (
        <Space>
          {record.status === 'checked_in' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleVaccinate(record)}
            >
              接种
            </Button>
          )}
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
        </Space>
      ),
    },
  ];

  const completedRecordsToday = records.filter((r) =>
    dayjs(r.observationEndTime).isSame(dayjs(), 'day')
  );

  const completedColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName', width: 100 },
    { title: '疫苗', dataIndex: 'vaccineName', key: 'vaccineName', width: 120 },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName', width: 100 },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '留观结果',
      dataIndex: 'observationResult',
      key: 'observationResult',
      width: 120,
      render: (result: 'normal' | 'abnormal' | 'urgent') => {
        const map: Record<string, { text: string; color: string; icon?: React.ReactNode }> = {
          normal: { text: '正常', color: 'green' },
          abnormal: { text: '一般异常', color: 'orange', icon: <WarningOutlined /> },
          urgent: { text: '紧急异常', color: 'red', icon: <WarningOutlined /> },
        };
        const r = map[result];
        return (
          <Tag color={r.color} icon={r.icon}>
            {r.text}
          </Tag>
        );
      },
    },
    {
      title: '异常说明',
      dataIndex: 'observationNote',
      key: 'observationNote',
      render: (note: string | undefined, record: any) => {
        if (record.observationResult === 'normal') return '-';
        return (
          <span style={{ color: '#ff4d4f' }}>
            {note || '无'}
          </span>
        );
      },
    },
    {
      title: '完成时间',
      dataIndex: 'observationEndTime',
      key: 'observationEndTime',
      width: 160,
      render: (time: string) => dayjs(time).format('HH:mm:ss'),
    },
  ];

  return (
    <div>
      <div className="page-card">
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="留观中"
                value={observingList.length}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待接种"
                value={checkedInList.length}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待留观"
                value={vaccinatedList.length}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日已完成"
                value={completedToday.length}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div className="page-card">
        <Card
          title={
            <Space>
              <ClockCircleOutlined style={{ color: '#1890ff' }} />
              <span>留观计时区</span>
              <Tag color="blue">{observingList.length} 人</Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          {observingList.length > 0 ? (
            <Table
              columns={observingColumns}
              dataSource={observingList}
              rowKey="id"
              pagination={false}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              暂无留观人员
            </div>
          )}
        </Card>

        <Card
          title={
            <Space>
              <span>等待队列</span>
              <Tag color="gold">{checkedInList.length + vaccinatedList.length} 人</Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          {checkedInList.length + vaccinatedList.length > 0 ? (
            <Table
              columns={waitingColumns}
              dataSource={[...checkedInList, ...vaccinatedList]}
              rowKey="id"
              pagination={false}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              暂无等待人员
            </div>
          )}
        </Card>

        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>今日已完成</span>
              <Tag color="green">{completedRecordsToday.length} 人</Tag>
              {completedRecordsToday.filter((r) => r.observationResult !== 'normal').length > 0 && (
                <Tag color="red" icon={<WarningOutlined />}>
                  {completedRecordsToday.filter((r) => r.observationResult !== 'normal').length} 例异常
                </Tag>
              )}
            </Space>
          }
        >
          {completedRecordsToday.length > 0 ? (
            <Table
              columns={completedColumns}
              dataSource={completedRecordsToday}
              rowKey="id"
              pagination={false}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              今日暂无完成记录
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
