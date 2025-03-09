import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, DatePicker } from 'antd';
import { 
  ShoppingCartOutlined, 
  FileImageOutlined, 
  UserOutlined, 
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const Dashboard = () => {
  // 模拟数据
  const [statistics, setStatistics] = useState({
    totalOrders: 156,
    totalPhotos: 2358,
    totalUsers: 42,
    totalRevenue: 15680
  });

  const [orderTrend, setOrderTrend] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟API请求
    setTimeout(() => {
      // 生成订单趋势数据
      const trend = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        trend.push({
          date: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 20) + 1
        });
      }
      setOrderTrend(trend);

      // 生成最近订单数据
      const orders = [];
      for (let i = 0; i < 10; i++) {
        orders.push({
          id: `ORD${100000 + i}`,
          customer: `用户${i + 1}`,
          date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          amount: Math.floor(Math.random() * 500) + 50,
          status: ['已完成', '处理中', '待付款'][Math.floor(Math.random() * 3)]
        });
      }
      setRecentOrders(orders);
      setLoading(false);
    }, 1000);
  }, []);

  // 订单趋势图配置
  const config = {
    data: orderTrend,
    xField: 'date',
    yField: 'value',
    seriesField: '',
    smooth: true,
    xAxis: {
      type: 'time',
    },
    yAxis: {
      label: {
        formatter: (v) => `${v}`,
      },
    },
    tooltip: {
      showMarkers: false,
    },
    point: {
      size: 3,
      shape: 'circle',
      style: {
        fill: '#5B8FF9',
        stroke: '#5B8FF9',
        lineWidth: 2,
      },
    },
  };

  // 表格列定义
  const columns = [
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'green';
        if (status === '处理中') color = 'blue';
        if (status === '待付款') color = 'orange';
        return <span style={{ color }}>{status}</span>;
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>控制台</Title>
        <RangePicker style={{ float: 'right' }} />
      </div>
      
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={statistics.totalOrders}
              prefix={<ShoppingCartOutlined />}
              suffix={
                <span style={{ fontSize: 14, color: 'green' }}>
                  <ArrowUpOutlined /> 12%
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="照片总数"
              value={statistics.totalPhotos}
              prefix={<FileImageOutlined />}
              suffix={
                <span style={{ fontSize: 14, color: 'green' }}>
                  <ArrowUpOutlined /> 23%
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="用户数"
              value={statistics.totalUsers}
              prefix={<UserOutlined />}
              suffix={
                <span style={{ fontSize: 14, color: 'green' }}>
                  <ArrowUpOutlined /> 5%
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总收入"
              value={statistics.totalRevenue}
              prefix={<DollarOutlined />}
              suffix={
                <span style={{ fontSize: 14, color: 'red' }}>
                  <ArrowDownOutlined /> 8%
                </span>
              }
              precision={2}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={24}>
        <Col span={16}>
          <Card title="订单趋势" style={{ marginBottom: 24 }}>
            <Line {...config} loading={loading} />
          </Card>
          
          <Card title="最近订单">
            <Table 
              columns={columns} 
              dataSource={recentOrders} 
              rowKey="id" 
              loading={loading}
              pagination={false}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="系统公告" style={{ marginBottom: 24 }}>
            <ul style={{ paddingLeft: 20 }}>
              <li>系统将于2023年6月1日进行升级维护</li>
              <li>新增照片批量处理功能</li>
              <li>优化了订单管理界面</li>
              <li>修复了若干已知问题</li>
            </ul>
          </Card>
          
          <Card title="快捷操作">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="/orders/new">创建新订单</a>
              <a href="/photos/upload">上传照片</a>
              <a href="/settings">系统设置</a>
              <a href="/help">帮助文档</a>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 