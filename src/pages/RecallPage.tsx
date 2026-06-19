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
  InputNumber,
} from 'antd';
import {
  SearchOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import type { VaccineBatch, VaccinationRecord, RecallRecord } from '../types';

const { TabPane } = Tabs;
const { Search } = Input;

export default function RecallPage() {
  const [selectedBatch, setSelectedBatch] = useState<VaccineBatch | null>(null);
  const [searchType, setSearchType] = useState<'batch' | 'patient'>('batch');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searched, setSearched] = useState(false);
  const [searchResult, setSearchResult] = useState<VaccinationRecord[]>([]);
  const [recallModalOpen, setRecallModalOpen] = useState(false);
  const [recallReason, setRecallReason] = useState('');

  const {
    batches,
    records,
    recalls,
    recallBatch: doRecallBatch,
    searchRecords,
  } = useAppStore();

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setSearched(true);

    if (searchType === 'batch') {
      const batch = batches.find((b) => b.batchNo.toLowerCase().includes(value.toLowerCase()));
      if (batch) {
        setSelectedBatch(batch);
        const result = records.filter((r) => r.batchId === batch.id);
        setSearchResult(result);
      } else {
        setSelectedBatch(null);
        setSearchResult([]);
      }
    } else {
      const results = searchRecords(value);
      setSearchResult(results);
      setSelectedBatch(null);
    }
  };

  const handleBatchClick = (batch: VaccineBatch) => {
    setSelectedBatch(batch);
    const result = records.filter((r) => r.batchId === batch.id);
    setSearchResult(result);
    setSearched(true);
    setSearchType('batch');
    setSearchKeyword(batch.batchNo);
  };

  const handleRecall = () => {
    if (!selectedBatch) return;
    setRecallReason('');
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

  const totalRecalled = recalls.reduce((sum, r) => sum + r.affectedCount, 0);

  const recordColumns = [
    { title: '患者姓名', dataIndex: 'patientName', key: 'patientName' },
    { title: '身份证号', dataIndex: 'idCard', key: 'idCard' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '疫苗名称', dataIndex: 'vaccineName', key: 'vaccineName' },
    {
      title: '接种批号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      render: (v: string, record: VaccinationRecord) => {
        const batch = batches.find((b) => b.id === record.batchId);
        const isRecalled = batch?.status === 'recalled';
        return (
          <Tag color={isRecalled ? 'red' : 'blue'} icon={isRecalled ? <ExclamationCircleOutlined /> : undefined}>
            {v}
            {isRecalled && ' (已召回)'}
          </Tag>
        );
      },
    },
    { title: '接种台', dataIndex: 'stationName', key: 'stationName' },
    {
      title: '接种时间',
      dataIndex: 'vaccinationTime',
      key: 'vaccinationTime',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '留观结果',
      key: 'observationResult',
      dataIndex: 'observationResult',
      render: (result: 'normal' | 'abnormal' | 'urgent') => {
        const colorMap: Record<string, string> = {
          normal: 'green',
          abnormal: 'orange',
          urgent: 'red',
        };
        const textMap: Record<string, string> = {
          normal: '正常',
          abnormal: '异常',
          urgent: '紧急',
        };
        return <Tag color={colorMap[result]}>{textMap[result]}</Tag>;
      },
    },
    {
      title: '异常说明',
      dataIndex: 'observationNote',
      key: 'observationNote',
      render: (note?: string) => note || '-',
    },
    {
      title: '记录状态',
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
          recalled: '已召回标记',
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
      },
    },
  ];

  const recallColumns = [
    { title: '疫苗名称', dataIndex: 'vaccineName', key: 'vaccineName' },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      render: (v: string) => <Tag color="red">{v}</Tag>,
    },
    { title: '召回原因', dataIndex: 'reason', key: 'reason' },
    {
      title: '影响人数',
      dataIndex: 'affectedCount',
      key: 'affectedCount',
      render: (v: number) => `${v} 人`,
    },
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

  return (
    <div>
      <div className="page-card">
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="批次总数"
                value={batches.length}
                prefix={<MedicineBoxOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="接种记录总数"
                value={records.length}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="召回次数"
                value={recalls.length}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="累计影响人数"
                value={totalRecalled}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div className="page-card">
        <Tabs defaultActiveKey="search">
          <TabPane tab="接种记录查询" key="search">
            <div style={{ marginBottom: 24 }}>
              <Space.Compact style={{ width: '100%', maxWidth: 700 }}>
                <Select
                  value={searchType}
                  onChange={setSearchType}
                  style={{ width: 140 }}
                >
                  <Select.Option value="batch">按批次号</Select.Option>
                  <Select.Option value="patient">按患者/手机/身份证</Select.Option>
                </Select>
                <Search
                  placeholder={
                    searchType === 'batch' ? '请输入批次号进行反查' : '请输入姓名、手机号或身份证号'
                  }
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="large"
                  onSearch={handleSearch}
                  style={{ flex: 1 }}
                />
              </Space.Compact>
              <div style={{ marginTop: 8, color: '#999', fontSize: 13 }}>
                <Space>
                  <span>
                    <UserOutlined /> 患者查询支持姓名、手机号、身份证号模糊搜索
                  </span>
                  <span>|</span>
                  <span>
                    <MedicineBoxOutlined /> 批次查询可反查所有接种该批次的人员
                  </span>
                </Space>
              </div>
            </div>

            {searched && (
              <>
                {selectedBatch && searchType === 'batch' && (
                  <Card style={{ marginBottom: 16 }}>
                    <Descriptions title="批次信息" bordered size="small" column={2}>
                      <Descriptions.Item label="疫苗名称">
                        {selectedBatch.vaccineName}
                      </Descriptions.Item>
                      <Descriptions.Item label="批次号">
                        <Tag color={selectedBatch.status === 'recalled' ? 'red' : 'blue'}>
                          {selectedBatch.batchNo}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="生产日期">
                        {selectedBatch.manufactureDate}
                      </Descriptions.Item>
                      <Descriptions.Item label="有效期至">
                        {selectedBatch.expiryDate}
                      </Descriptions.Item>
                      <Descriptions.Item label="入库数量">
                        {selectedBatch.quantity} 支
                      </Descriptions.Item>
                      <Descriptions.Item label="已使用">
                        {selectedBatch.usedQuantity} 支
                      </Descriptions.Item>
                      <Descriptions.Item label="状态" span={2}>
                        <Tag
                          color={selectedBatch.status === 'normal' ? 'green' : 'red'}
                          icon={selectedBatch.status === 'recalled' ? <ExclamationCircleOutlined /> : undefined}
                        >
                          {selectedBatch.status === 'normal' ? '正常' : selectedBatch.status === 'recalled' ? '已召回' : '已过期'}
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
                )}

                <Card
                  title={
                    <Space>
                      <span>接种记录</span>
                      <Tag color="blue">{searchResult.length} 条</Tag>
                    </Space>
                  }
                >
                  {searchResult.length > 0 ? (
                    <Table
                      columns={recordColumns}
                      dataSource={searchResult}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  ) : (
                    <Empty description={searchType === 'batch' ? '未找到该批次' : '未找到匹配的接种记录'} />
                  )}
                </Card>
              </>
            )}
          </TabPane>

          <TabPane tab="批次流向总览" key="flow">
            <div style={{ marginBottom: 16 }}>
              <Select
                placeholder="选择疫苗类型"
                style={{ width: 200, marginRight: 12 }}
                allowClear
                onChange={() => {}}
              >
                {}
              </Select>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {batches.map((batch) => {
                const batchRecords = records.filter((r) => r.batchId === batch.id);
                const isExpired = dayjs(batch.expiryDate).isBefore(dayjs().startOf('day'));
                return (
                  <Card
                    key={batch.id}
                    hoverable
                    style={{ width: 300, cursor: 'pointer' }}
                    onClick={() => handleBatchClick(batch)}
                    size="small"
                  >
                    <Card.Meta
                      avatar={<MedicineBoxOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
                      title={
                        <Space>
                          <span>{batch.vaccineName}</span>
                          <Tag
                            color={batch.status === 'recalled' ? 'red' : isExpired ? 'default' : 'green'}
                          >
                            {batch.status === 'recalled' ? '已召回' : isExpired ? '已过期' : '正常'}
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
                          <div style={{ marginBottom: 4 }}>
                            已接种：{batch.usedQuantity} / {batch.quantity} 支
                          </div>
                          <div style={{ color: '#1890ff', fontWeight: 500 }}>
                            流向 {batchRecords.length} 人
                          </div>
                        </div>
                      }
                    />
                  </Card>
                );
              })}
            </div>
          </TabPane>

          <TabPane tab={`召回记录 (${recalls.length})`} key="recalls">
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
            <div
              style={{
                marginBottom: 16,
                padding: 16,
                background: '#fff2f0',
                borderRadius: 8,
                border: '1px solid #ffccc7',
              }}
            >
              <div style={{ fontWeight: 600, color: '#ff4d4f', marginBottom: 8 }}>
                ⚠ 召回将影响所有接种了该批次疫苗的人员
              </div>
              <div>疫苗：{selectedBatch.vaccineName}</div>
              <div>批号：{selectedBatch.batchNo}</div>
              <div>
                剩余库存：{selectedBatch.quantity - selectedBatch.usedQuantity} 支
              </div>
              <div>已接种：{selectedBatch.usedQuantity} 支</div>
              <div>
                影响人数：{searchResult.length} 人
              </div>
            </div>
            <Form layout="vertical">
              <Form.Item label="召回原因" required>
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
