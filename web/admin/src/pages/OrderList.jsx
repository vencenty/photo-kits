import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Dropdown, 
  Typography,
  DatePicker,
  Select,
  message,
  Modal
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  MoreOutlined, 
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const OrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    fetchOrders();
  }, [pagination.current, pagination.pageSize]);

  // 模拟获取订单数据
  const fetchOrders = () => {
    setLoading(true);
    // 模拟API请求
    setTimeout(() => {
      const mockOrders = [];
      for (let i = 0; i < 35; i++) {
        const id = 100000 + i;
        mockOrders.push({
          id: `ORD${id}`,
          customer: `用户${i + 1}`,
          phone: `1381234${(1000 + i).toString().padStart(4, '0')}`,
          date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          amount: Math.floor(Math.random() * 500) + 50,
          photoCount: Math.floor(Math.random() * 50) + 1,
          status: ['已完成', '处理中', '待付款', '已取消'][Math.floor(Math.random() * 4)]
        });
      }
      
      // 过滤搜索结果
      let filteredOrders = mockOrders;
      if (searchText) {
        filteredOrders = mockOrders.filter(order => 
          order.id.toLowerCase().includes(searchText.toLowerCase()) ||
          order.customer.toLowerCase().includes(searchText.toLowerCase()) ||
          order.phone.includes(searchText)
        );
      }
      
      setOrders(filteredOrders.slice(
        (pagination.current - 1) * pagination.pageSize,
        pagination.current * pagination.pageSize
      ));
      setPagination({
        ...pagination,
        total: filteredOrders.length
      });
      setLoading(false);
    }, 500);
  };

  const handleSearch = () => {
    setPagination({
      ...pagination,
      current: 1
    });
    fetchOrders();
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const handleViewOrder = (id) => {
    navigate(`/orders/${id}`);
  };

  const handleEditOrder = (id) => {
    navigate(`/orders/${id}/edit`);
  };

  const handleDeleteOrder = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除订单 ${id} 吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        message.success(`订单 ${id} 已删除`);
        fetchOrders();
      }
    });
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

  const columns = [
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
      render: (text) => <a onClick={() => handleViewOrder(text)}>{text}</a>,
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '下单日期',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
    {
      title: '照片数量',
      dataIndex: 'photoCount',
      key: 'photoCount',
      sorter: (a, b) => a.photoCount - b.photoCount,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `¥${amount.toFixed(2)}`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
      filters: [
        { text: '已完成', value: '已完成' },
        { text: '处理中', value: '处理中' },
        { text: '待付款', value: '待付款' },
        { text: '已取消', value: '已取消' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: '1',
                icon: <EyeOutlined />,
                label: '查看详情',
                onClick: () => handleViewOrder(record.id),
              },
              {
                key: '2',
                icon: <EditOutlined />,
                label: '编辑订单',
                onClick: () => handleEditOrder(record.id),
              },
              {
                key: '3',
                icon: <DeleteOutlined />,
                label: '删除订单',
                danger: true,
                onClick: () => handleDeleteOrder(record.id),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4}>订单管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/orders/new')}>
          新建订单
        </Button>
      </div>
      
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input.Search
            placeholder="搜索订单号/客户/电话"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          
          <RangePicker placeholder={['开始日期', '结束日期']} />
          
          <Select defaultValue="" style={{ width: 150 }}>
            <Option value="">全部状态</Option>
            <Option value="已完成">已完成</Option>
            <Option value="处理中">处理中</Option>
            <Option value="待付款">待付款</Option>
            <Option value="已取消">已取消</Option>
          </Select>
          
          <Button icon={<FilterOutlined />}>筛选</Button>
          <Button icon={<ExportOutlined />}>导出</Button>
        </div>
      </Card>
      
      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default OrderList; 