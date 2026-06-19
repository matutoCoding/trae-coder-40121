import { useState } from 'react';
import {
  Tabs,
  Table,
  Input,
  Select,
  Button,
  Card,
  Tag,
  Space,
  Descriptions,
  Row,
  Col,
  Statistic,
  Empty,
  Modal,
  Form,
  message,
} from 'antd';
import { SearchOutlined, ExclamationCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import type { VaccineBatch, VaccinationRecord, RecallRecord } from '../types';

const { TabPane } = Tabs;
const { Search } = Input;

export default function RecallPage() {
  const [selectedBatch, setSelectedBatch] = useState<VaccineBatch | null>(null);
  const [searchBatchNo, setSearchBatchNo] = useState('');
  const [searchResult, setSearchResult] = useState<VaccinationRecord[]>([]);
  const [searched, setSearched] = useState(false);
  const [recallModalOpen, setRecallModalOpen] = useState(false);
  const [recallReason, setRecallReason] = useState('');
  const [recallForm] = Form.useForm();

  const { batches, records, recalls, recallBatch: doRecallBatch } = useAppStore();

  const handleSearch = (value: string) => {
    setSearchBatchNo(value);
    const batch = batches.find((b) => b.batchNo.toLowerCase().includes(value.toLowerCase()));
    if (batch) {
      const result = records.filter((r) => r.batchId === batch.id);
      setSearchResult(result);
      setSelectedBatch(batch);
    } else {
      setSearchResult([]);
      setSelectedBatch(null);
    }
    setSearched(true);
  };

  const handleBatchClick = (batch: VaccineBatch) => {
    setSelectedBatch(batch);
    const result = records.filter((r) => r.batchId === batch.id);
    setSearchResult(result);
    setSearched(true);
    setSearchBatchNo(batch.batchNo);
  };

  const handleRecall = () => {
    if (!selectedBatch) return;
    setRecallReason('');
    recallForm.resetFields();
    setRecallModalOpen(true);
  };

  const confirmRecall = () => {
    if (!selectedBatch || !recallReason.trim()) {
      message.error('请输入召回原因');
      return;
    }
    doRecallBatch(selectedBatch.id, recallReason);
    message.success('召回已启动');
    setRecallModalOpen(false);
  };

  const batchRecords = selectedBatch ? records.filter((r) => r.batchId === selectedBatch.id) : [];

  const recordColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName' },
    { title: '身份证号', dataIndex: 'idCard', key: 'idCard' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName' },
    {
      title: '接种时间',
      dataIndex: 'vaccinationTime',
      key: 'vaccinationTime',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '留观结束',
      dataIndex: 'observationEndTime',
      key: 'observationEndTime',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          normal: 'green',
          adverse_reaction: 'orange',
          recalled: 'red',
        };
        const textMap: Record<string, string> = {
          normal: '正常',
          adverse_reaction: '不良反应',
          recalled: '已召回',
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
      },
    },
  ];

  const recallColumns = [
    { title: '疫苗名称', dataIndex: 'vaccineName', key: 'vaccineName' },
    { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '召回原因', dataIndex: 'reason', key: 'reason' },
    { title: '影响人数', dataIndex: 'affectedCount', key: 'affectedCount', render: (v: number) => `${v} 人` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'default',
          in_progress: 'processing',
          completed: 'success',
        };
        const textMap: Record<string, string> = {
          pending: '待处理',
          in_progress: '进行中',
          completed: '已完成',
        };
        return <Tag color={colorMap[status] as any}>{textMap[status]}</Tag>;
      },
    },
    {
      title: '发起时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const totalRecalled = recalls.reduce((sum, r) => sum + r.affectedCount, 0);

  return (
    <div>
      <div className="page-card">
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="批次总数" value={batches.length} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="接种记录总数" value={records.length} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="召回次数" value={recalls.length} valueStyle={{ color: '#ff4d4f' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="累计影响人数" value={totalRecalled} valueStyle={{ color: '#fa8c16' }} />
            </Card>
          </Col>
        </Row>
      </div>

      <div className="page-card">
        <Tabs defaultActiveKey="trace">
          <TabPane tab="批次反查" key="trace">
            <div style={{ marginBottom: 24 }}>
              <Search
                placeholder="请输入批次号进行反查"
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleSearch}
                style={{ maxWidth: 600 }}
              />
            </div>

            {searched && (
              <>
                {selectedBatch ? (
                  <div>
                    <Card style={{ marginBottom: 16 }}>
                      <Descriptions title="批次信息" bordered size="small" column={2}>
                        <Descriptions.Item label="疫苗名称">{selectedBatch.vaccineName}</Descriptions.Item>
                        <Descriptions.Item label="批次号">
                          <Tag color="blue">{selectedBatch.batchNo}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="生产日期">{selectedBatch.manufactureDate}</Descriptions.Item>
                        <Descriptions.Item label="有效期至">{selectedBatch.expiryDate}</Descriptions.Item>
                        <Descriptions.Item label="入库数量">{selectedBatch.quantity} 支</Descriptions.Item>
                        <Descriptions.Item label="已使用">{selectedBatch.usedQuantity} 支</Descriptions.Item>
                        <Descriptions.Item label="状态" span={2}>
                          <Tag color={selectedBatch.status === 'normal' ? 'green' : 'red'}>
                            {selectedBatch.status === 'normal' ? '正常' : '已召回'}
                          </Tag>
                        </Descriptions.Item>
                      </Descriptions>
                      {selectedBatch.status === 'normal' && (
                        <div style={{ marginTop: 16, textAlign: 'right' }}>
                          <Button danger icon={<ExclamationCircleOutlined />} onClick={handleRecall}>
                            启动召回
                          </Button>
                        </div>
                      )}
                    </Card>

                    <Card title={`接种记录 (${searchResult.length} 人)`}>
                      {searchResult.length > 0 ? (
                        <Table
                          columns={recordColumns}
                          dataSource={searchResult}
                          rowKey="id"
                          pagination={{ pageSize: 10 }}
                        />
                      ) : (
                        <Empty description="该批次暂无接种记录" />
                      )}
                    </Card>
                  </div>
                ) : (
                  <Empty description="未找到该批次" />
                )}
              </>
            )}
          </TabPane>

          <TabPane tab="批次流向" key="flow">
            <div style={{ marginBottom: 16 }}>
              <Select
                placeholder="选择疫苗类型"
                style={{ width: 200, marginRight: 12 }}
                allowClear
                onChange={() => {}}
              >
                {/* options will be dynamic */}
              </Select>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {batches.map((batch) => (
                <Card
                  key={batch.id}
                  hoverable
                  style={{ width: 300, cursor: 'pointer' }}
                  onClick={() => handleBatchClick(batch)}
                  size="small"
                >
                  <Card.Meta
                    avatar={<UserOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
                    title={
                      <Space>
                        <span>{batch.vaccineName}</span>
                        <Tag color={batch.status === 'normal' ? 'green' : 'red'}>
                          {batch.status === 'normal' ? '正常' : '已召回'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          批号：<Tag color="blue">{batch.batchNo}</Tag>
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          有效期至：{batch.expiryDate}
                        </div>
                        <div>
                          已接种：{batch.usedQuantity} / {batch.quantity} 支
                        </div>
                        <div style={{ marginTop: 8, color: '#1890ff' }}>
                          流向 {records.filter((r) => r.batchId === batch.id).length} 人
                        </div>
                      </div>
                    }
                  />
                </Card>
              ))}
            </div>
          </TabPane>

          <TabPane tab="召回记录" key="recalls">
            {recalls.length > 0 ? (
              <Table
                columns={recallColumns}
                dataSource={recalls}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description="暂无召回记录" />
            )}
          </TabPane>
        </Tabs>
      </div>

      <Modal
        title="启动召回"
        open={recallModalOpen}
        onCancel={() => setRecallModalOpen(false)}
        onOk={confirmRecall}
        okText="确认召回"
        okButtonProps={{ danger: true }}
        width={520}
      >
        {selectedBatch && (
          <div>
            <div style={{ marginBottom: 16, padding: 16, background: '#fff2f0', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, color: '#ff4d4f', marginBottom: 8 }}>
                ⚠ 召回将影响所有接种了该批次疫苗的人员
              </div>
              <div>疫苗：{selectedBatch.vaccineName}</div>
              <div>批号：{selectedBatch.batchNo}</div>
              <div>已接种：{selectedBatch.usedQuantity} 支</div>
              <div>影响人数：{batchRecords.length} 人</div>
            </div>
            <Form form={recallForm} layout="vertical">
              <Form.Item
                label="召回原因"
                name="reason"
                rules={[{ required: true, message: '请输入召回原因' }]}
              >
                <Input.TextArea
                  rows={4}
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                  placeholder="请详细描述召回原因，如：质量问题、安全隐患等"
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
