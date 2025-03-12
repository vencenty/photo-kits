import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Image, 
  Button, 
  Space, 
  Select, 
  Input, 
  DatePicker, 
  message, 
  Modal,
  Tabs,
  Typography,
  Divider,
  Tag,
  Tooltip
} from 'antd';
import { 
  SearchOutlined, 
  DownloadOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  ZipOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PhotoManagement = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [searchText, setSearchText] = useState('');
  const [orderInfo, setOrderInfo] = useState(null);
  const [photoSizes, setPhotoSizes] = useState([]);
  const [photosBySize, setPhotosBySize] = useState({});
  
  // 获取照片尺寸
  useEffect(() => {
    const fetchPhotoSizes = async () => {
      try {
        const response = await axios.get('/api/settings/photo-sizes');
        setPhotoSizes(response.data);
      } catch (error) {
        console.error('获取照片尺寸失败:', error);
      }
    };
    
    fetchPhotoSizes();
  }, []);
  
  // 获取订单信息
  useEffect(() => {
    if (orderId) {
      fetchOrderInfo();
    }
  }, [orderId]);
  
  // 获取照片列表
  useEffect(() => {
    if (orderId) {
      fetchPhotos();
    }
  }, [orderId, selectedSize]);
  
  const fetchOrderInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/orders/${orderId}`);
      setOrderInfo(response.data);
    } catch (error) {
      console.error('获取订单信息失败:', error);
      message.error('获取订单信息失败');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPhotos = async () => {
    try {
      setLoading(true);
      let url = `/api/photos/order/${orderId}`;
      if (selectedSize) {
        url += `?size=${selectedSize}`;
      }
      
      const response = await axios.get(url);
      
      // 按尺寸分组照片
      const groupedPhotos = {};
      response.data.photos.forEach(photo => {
        if (!groupedPhotos[photo.size]) {
          groupedPhotos[photo.size] = [];
        }
        groupedPhotos[photo.size].push(photo);
      });
      
      setPhotosBySize(groupedPhotos);
      
      if (selectedSize) {
        setPhotos(groupedPhotos[selectedSize] || []);
      } else {
        setPhotos(response.data.photos);
      }
    } catch (error) {
      console.error('获取照片列表失败:', error);
      message.error('获取照片列表失败');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSizeChange = (size) => {
    setSelectedSize(size);
    setSelectedRowKeys([]);
  };
  
  const handleSearch = (value) => {
    setSearchText(value);
  };
  
  const handleDownloadSelected = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要下载的照片');
      return;
    }
    
    // 构建下载URL
    const photoIds = selectedRowKeys.join(',');
    const downloadUrl = `/api/photos/download?ids=${photoIds}`;
    
    // 创建一个隐藏的a标签并触发下载
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(`正在下载 ${selectedRowKeys.length} 张照片`);
  };
  
  const handleDownloadAll = () => {
    if (photos.length === 0) {
      message.warning('没有可下载的照片');
      return;
    }
    
    // 构建下载URL
    let downloadUrl = `/api/photos/download/${orderId}`;
    if (selectedSize) {
      downloadUrl += `?size=${selectedSize}`;
    }
    
    // 创建一个隐藏的a标签并触发下载
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success('正在下载所有照片');
  };
  
  const handleDeletePhoto = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这张照片吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/photos/${id}`);
          message.success('照片已删除');
          fetchPhotos();
        } catch (error) {
          console.error('删除照片失败:', error);
          message.error('删除照片失败');
        }
      }
    });
  };
  
  const handleDeleteSelected = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的照片');
      return;
    }
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 张照片吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`/api/photos/batch`, {
            data: selectedRowKeys
          });
          message.success('选中的照片已删除');
          fetchPhotos();
        } catch (error) {
          console.error('删除照片失败:', error);
          message.error('删除照片失败');
        }
      }
    });
  };

  return (
    <div>
      {/* 照片管理页面的模板代码 */}
    </div>
  );
};

export default PhotoManagement; 