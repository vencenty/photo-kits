import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Button, 
  Space, 
  Tag, 
  Table, 
  Image, 
  Typography, 
  Divider,
  Steps,
  message,
  Modal
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PrinterOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Step } = Steps;

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  // 模拟获取订单详情
  const fetchOrderDetail = () => {
    setLoading(true);
    // 模拟API请求
    setTimeout(() => {
      const mockOrder = {
        id: id,
        customer: '张三',
        phone: '13812345678',
        address: '上海市浦东新区张江高科技园区',
        date: '2023-05-15',
        amount: 235.50,
        status: '处理中',
        paymentMethod: '微信支付',
        paymentStatus: '已支付',
        remark: '请尽快处理，谢谢！',
        photos: []
      };
      
      // 生成照片数据
      const photoSizes = ['3inch', '4inch', '5inch', '6inch'];
      for (let i = 0; i < 15; i++) {
        const size = photoSizes[Math.floor(Math.random() * photoSizes.length)];
        mockOrder.photos.push({
          id: `PHOTO${1000 + i}`,
          name: `照片${i + 1}.jpg`,
          size: size,
          url: `https://picsum.photos/id/${100 + i}/300/200`,
          uploadTime: '2023-05-15 14:30:45',
          status: ['已处理', '处理中', '待处理'][Math.floor(Math.random() * 3)]
        });
      }
      
      setOrder(mockOrder);
      setLoading(false);
    }, 500);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '已完成':
        return 'success';
      case '处理中':
        return 'processing';
      case '待付款':
        return 'warning';
      case '已取消':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPhotoStatusColor = (status) => {
    switch (status) {
      case '已处理':
        return 'success';
      case '处理中':
        return 'processing';
      case '待处理':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleDeleteOrder = () => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除订单 ${id} 吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        message.success(`订单 ${id} 已删除`);
        navigate('/orders');
      }
    });
  };

  const handleUpdateStatus = (newStatus) => {
    Modal.confirm({
      title: '确认更新状态',
      content: `确定要将订单状态更新为"${newStatus}"吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setOrder({
          ...order,
          status: newStatus
        });
        message.success(`订单状态已更新为"${newStatus}"`);
      }
    });
  };

  const columns = [
    {
      title: '照片ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '预览',
      dataIndex: 'url',
      key: 'url',
      render: (url) => (
        <Image
          src={url}
          width={80}
          height={60}
          style={{ objectFit: 'cover' }}
        />
      ),
    },
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '尺寸',
      dataIndex: 'size',
      key: 'size',
      render: (size) => {
        const sizeMap = {
          '3inch': '3寸',
          '4inch': '4寸',
          '5inch': '5寸',
          '6inch': '6寸'
        };
        return sizeMap[size] || size;
      },
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={getPhotoStatusColor(status)}>{status}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<DownloadOutlined />}>下载</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      ),
    },
  ];

  // 获取当前订单状态对应的步骤
  const getCurrentStep = (status) => {
    switch (status) {
      case '待付款':
        return 0;
      case '处理中':
        return 1;
      case '已完成':
        return 2;
      case '已取消':
        return 3;
      default:
        return 1;
    }
  };

  if (loading) {
    return <Card loading={true} />;
  }

  if (!order) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Title level={4}>未找到订单信息</Title>
          <Button type="primary" onClick={() => navigate('/orders')}>返回订单列表</Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>订单详情: {order.id}</Title>
          <Tag color={getStatusColor(order.status)}>{order.status}</Tag>
        </Space>
        <Space>
          <Button icon={<PrinterOutlined />}>打印订单</Button>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/orders/${id}/edit`)}>编辑</Button>
          <Button icon={<DeleteOutlined />} danger onClick={handleDeleteOrder}>删除</Button>
        </Space>
      </div>
      
      <Card title="订单信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
          <Descriptions.Item label="订单号">{order.id}</Descriptions.Item>
          <Descriptions.Item label="客户姓名">{order.customer}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{order.phone}</Descriptions.Item>
          <Descriptions.Item label="下单日期">{order.date}</Descriptions.Item>
          <Descriptions.Item label="订单金额">¥{order.amount.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="支付方式">{order.paymentMethod}</Descriptions.Item>
          <Descriptions.Item label="支付状态">{order.paymentStatus}</Descriptions.Item>
          <Descriptions.Item label="订单状态">
            <Tag color={getStatusColor(order.status)}>{order.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>{order.address}</Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>{order.remark || '无'}</Descriptions.Item>
        </Descriptions>
        
        <Divider />
        
        <Steps current={getCurrentStep(order.status)} style={{ maxWidth: 800, margin: '0 auto' }}>
          <Step title="待付款" icon={<DollarOutlined />} />
          <Step title="处理中" icon={<ClockCircleOutlined />} />
          <Step title="已完成" icon={<CheckCircleOutlined />} />
          <Step title="已取消" status={order.status === '已取消' ? 'error' : 'wait'} icon={<ShoppingOutlined />} />
        </Steps>
        
        <Divider />
        
        <div style={{ textAlign: 'center' }}>
          <Space>
            <Button type="primary" onClick={() => handleUpdateStatus('已完成')}>
              标记为已完成
            </Button>
            <Button onClick={() => handleUpdateStatus('处理中')}>
              标记为处理中
            </Button>
            <Button danger onClick={() => handleUpdateStatus('已取消')}>
              取消订单
            </Button>
          </Space>
        </div>
      </Card>
      
      <Card title={`照片列表 (${order.photos.length})`}>
        <Table
          columns={columns}
          dataSource={order.photos}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default OrderDetail; 