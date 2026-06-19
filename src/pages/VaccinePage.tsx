import { useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Tag,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import type { Vaccine, VaccineBatch } from '../types';

const { TabPane } = Tabs;

export default function VaccinePage() {
  const [vaccineModalOpen, setVaccineModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);
  const [vaccineForm] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [recallModalOpen, setRecallModalOpen] = useState(false);
  const [recallBatch, setRecallBatch] = useState<VaccineBatch | null>(null);
  const [recallReason, setRecallReason] = useState('');

  const {
    vaccines,
    addVaccine,
    updateVaccine,
    deleteVaccine,
    batches,
    addBatch,
    updateBatch,
    deleteBatch,
    recallBatch: doRecallBatch,
  } = useAppStore();

  const normalBatches = batches.filter((b) => b.status === 'normal' && !dayjs(b.expiryDate).isBefore(dayjs().startOf('day')));
  const recalledBatches = batches.filter((b) => b.status === 'recalled');
  const expiredBatches = batches.filter(
    (b) => b.status === 'expired' || (b.status === 'normal' && dayjs(b.expiryDate).isBefore(dayjs().startOf('day')))
  );

  const availableStock = normalBatches.reduce((sum, b) => sum + (b.quantity - b.usedQuantity), 0);
  const expiredStock = expiredBatches.reduce((sum, b) => sum + (b.quantity - b.usedQuantity), 0);
  const recalledStock = recalledBatches.reduce((sum, b) => sum + (b.quantity - b.usedQuantity), 0);
  const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
  const totalUsed = batches.reduce((sum, b) => sum + b.usedQuantity, 0);

  const handleAddVaccine = () => {
    setEditingVaccine(null);
    vaccineForm.resetFields();
    setVaccineModalOpen(true);
  };

  const handleEditVaccine = (vaccine: Vaccine) => {
    setEditingVaccine(vaccine);
    vaccineForm.setFieldsValue(vaccine);
    setVaccineModalOpen(true);
  };

  const handleSaveVaccine = (values: any) => {
    if (editingVaccine) {
      updateVaccine(editingVaccine.id, values);
      message.success('更新成功');
    } else {
      addVaccine(values);
      message.success('添加成功');
    }
    setVaccineModalOpen(false);
  };

  const handleDeleteVaccine = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该疫苗吗？',
      onOk: () => {
        deleteVaccine(id);
        message.success('删除成功');
      },
    });
  };

  const handleAddBatch = () => {
    batchForm.resetFields();
    setBatchModalOpen(true);
  };

  const handleSaveBatch = (values: any) => {
    const vaccine = vaccines.find((v) => v.id === values.vaccineId);
    if (!vaccine) return;

    const isExpired = dayjs(values.expiryDate.format('YYYY-MM-DD')).isBefore(dayjs().startOf('day'));

    addBatch({
      vaccineId: values.vaccineId,
      vaccineName: vaccine.name,
      batchNo: values.batchNo,
      manufactureDate: values.manufactureDate.format('YYYY-MM-DD'),
      expiryDate: values.expiryDate.format('YYYY-MM-DD'),
      quantity: values.quantity,
      remark: values.remark,
    });

    if (isExpired) {
      message.warning('该批次已过期，已自动归入"已过期"分类，不可用于接种');
    } else {
      message.success('批次入库成功');
    }
    setBatchModalOpen(false);
  };

  const handleRecall = (batch: VaccineBatch) => {
    setRecallBatch(batch);
    setRecallReason('');
    setRecallModalOpen(true);
  };

  const confirmRecall = () => {
    if (!recallBatch || !recallReason.trim()) {
      message.error('请输入召回原因');
      return;
    }
    doRecallBatch(recallBatch.id, recallReason);
    message.success('召回已启动');
    setRecallModalOpen(false);
  };

  const vaccineColumns = [
    { title: '疫苗名称', dataIndex: 'name', key: 'name' },
    { title: '生产厂家', dataIndex: 'manufacturer', key: 'manufacturer' },
    { title: '规格剂量', dataIndex: 'dosage', key: 'dosage' },
    { title: '说明', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Vaccine) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditVaccine(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteVaccine(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const batchColumns = [
    { title: '疫苗名称', dataIndex: 'vaccineName', key: 'vaccineName' },
    {
      title: '批号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    { title: '生产日期', dataIndex: 'manufactureDate', key: 'manufactureDate' },
    {
      title: '有效期至',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date: string) => {
        const daysLeft = dayjs(date).diff(dayjs(), 'day');
        let color = 'default';
        if (daysLeft < 0) color = 'red';
        else if (daysLeft < 30) color = 'orange';
        else if (daysLeft < 90) color = 'gold';
        return <Tag color={color as any}>{date}</Tag>;
      },
    },
    {
      title: '库存情况',
      key: 'stock',
      width: 200,
      render: (_: unknown, record: VaccineBatch) => {
        const remaining = record.quantity - record.usedQuantity;
        const percent = record.quantity > 0 ? (record.usedQuantity / record.quantity) * 100 : 0;
        return (
          <div>
            <Progress
              percent={Math.round(percent)}
              size="small"
              status={remaining <= 0 ? 'exception' : 'active'}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              剩余 {remaining} / {record.quantity} 支
            </div>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: VaccineBatch) => {
        const isExpired = dayjs(record.expiryDate).isBefore(dayjs().startOf('day'));
        const colorMap: Record<string, string> = {
          normal: isExpired ? 'red' : 'green',
          recalled: 'red',
          expired: 'default',
        };
        const textMap: Record<string, string> = {
          normal: isExpired ? '已过期' : '正常',
          recalled: '已召回',
          expired: '已过期',
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: VaccineBatch) => (
        <Space>
          {record.status === 'normal' && !dayjs(record.expiryDate).isBefore(dayjs().startOf('day')) && (
            <Button size="small" danger icon={<WarningOutlined />} onClick={() => handleRecall(record)}>
              召回
            </Button>
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
              <Statistic
                title="可用库存"
                value={availableStock}
                suffix="支"
                valueStyle={{ color: '#52c41a' }}
                prefix={<SafetyCertificateOutlined />}
              />
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>正常批次：{normalBatches.length} 个批次</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已用总量"
                value={totalUsed}
                suffix="支"
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>总库存：{totalStock} 支</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="过期库存"
                value={expiredStock}
                suffix="支"
                valueStyle={{ color: '#8c8c8c' }}
                prefix={<ClockCircleOutlined />}
              />
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>过期批次：{expiredBatches.length} 个</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="召回库存"
                value={recalledStock}
                suffix="支"
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ExclamationCircleOutlined />}
              />
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>召回批次：{recalledBatches.length} 个</div>
            </Card>
          </Col>
        </Row>
      </div>

      <div className="page-card">
        <Tabs defaultActiveKey="batches">
          <TabPane tab="批次管理" key="batches">
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBatch}>
                批次入库
              </Button>
            </div>

            <Tabs type="card" size="small" style={{ marginBottom: 16 }} defaultActiveKey="normal">
              <TabPane tab={`可用 (${normalBatches.length})`} key="normal">
                <Table
                  columns={batchColumns}
                  dataSource={normalBatches}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
              <TabPane tab={`已过期 (${expiredBatches.length})`} key="expired">
                <Table
                  columns={batchColumns}
                  dataSource={expiredBatches}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
              <TabPane tab={`已召回 (${recalledBatches.length})`} key="recalled">
                <Table
                  columns={batchColumns}
                  dataSource={recalledBatches}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
            </Tabs>
          </TabPane>

          <TabPane tab="疫苗字典" key="vaccines">
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVaccine}>
                添加疫苗
              </Button>
            </div>
            <Table columns={vaccineColumns} dataSource={vaccines} rowKey="id" pagination={false} />
          </TabPane>
        </Tabs>
      </div>

      <Modal
        title={editingVaccine ? '编辑疫苗' : '添加疫苗'}
        open={vaccineModalOpen}
        onCancel={() => setVaccineModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={vaccineForm} layout="vertical" onFinish={handleSaveVaccine}>
          <Form.Item name="name" label="疫苗名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入疫苗名称" />
          </Form.Item>
          <Form.Item name="manufacturer" label="生产厂家" rules={[{ required: true, message: '请输入厂家' }]}>
            <Input placeholder="请输入生产厂家" />
          </Form.Item>
          <Form.Item name="dosage" label="规格剂量" rules={[{ required: true, message: '请输入规格' }]}>
            <Input placeholder="如：20μg/0.5ml" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} placeholder="疫苗说明" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批次入库"
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        footer={null}
        width={500}
      >
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: 6,
            fontSize: 13,
            color: '#ad6800',
          }}
        >
          ⚠ 注意：录入已过期的批次将自动归入"已过期"分类，不可用于接种流程。
        </div>
        <Form form={batchForm} layout="vertical" onFinish={handleSaveBatch}>
          <Form.Item name="vaccineId" label="疫苗名称" rules={[{ required: true, message: '请选择疫苗' }]}>
            <Select placeholder="请选择疫苗">
              {vaccines.map((v) => (
                <Select.Option key={v.id} value={v.id}>
                  {v.name} - {v.manufacturer}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="batchNo" label="批次号" rules={[{ required: true, message: '请输入批次号' }]}>
            <Input placeholder="请输入批次号" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="manufactureDate" label="生产日期" rules={[{ required: true, message: '请选择' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="有效期至"
                rules={[{ required: true, message: '请选择' }]}
                extra="过期批次将不可用于接种"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="quantity" label="入库数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入数量" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认入库
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="疫苗召回确认"
        open={recallModalOpen}
        onCancel={() => setRecallModalOpen(false)}
        onOk={confirmRecall}
        okText="确认召回"
        okButtonProps={{ danger: true }}
        width={520}
      >
        {recallBatch && (
          <div>
            <div
              style={{
                marginBottom: 16,
                padding: 16,
                background: '#fff2f0',
                borderRadius: 8,
                border: '1px solid #ffccc7',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#ff4d4f' }}>
                ⚠ 召回批次信息
              </div>
              <div>疫苗：{recallBatch.vaccineName}</div>
              <div>批号：{recallBatch.batchNo}</div>
              <div>有效期至：{recallBatch.expiryDate}</div>
              <div>
                剩余库存：{recallBatch.quantity - recallBatch.usedQuantity} / {recallBatch.quantity} 支
              </div>
              <div>已使用：{recallBatch.usedQuantity} 支</div>
            </div>
            <Form.Item label="召回原因" required>
              <Input.TextArea
                rows={3}
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
                placeholder="请输入召回原因"
              />
            </Form.Item>
            <div style={{ color: '#ff4d4f', fontSize: 13 }}>
              提示：召回后，该批次所有接种记录将被标记为召回状态，系统将生成召回通知。
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
