import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Switch, 
  Tabs, 
  Space, 
  Typography, 
  InputNumber,
  Select,
  Upload,
  message,
  Divider
} from 'antd';
import { 
  SaveOutlined, 
  UploadOutlined, 
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
  CloudOutlined,
  NotificationOutlined,
  DollarOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 模拟加载设置数据
    setTimeout(() => {
      form.setFieldsValue({
        // 基本设置
        siteName: '照片管理系统',
        siteDescription: '专业的照片处理和管理平台',
        logo: undefined,
        contactPhone: '400-123-4567',
        contactEmail: 'support@example.com',
        address: '上海市浦东新区张江高科技园区',
        
        // 照片设置
        maxUploadSize: 50,
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
        defaultPhotoSize: '4inch',
        enableWatermark: true,
        watermarkText: '照片管理系统',
        watermarkOpacity: 0.3,
        
        // 存储设置
        storageType: 'cos',
        cosSecretId: 'AKIDYyBIMI5gBcsx8A1lKfnlV3PSL2Yr7EBB',
        cosSecretKey: '******',
        cosBucket: 'photo-1253541783',
        cosRegion: 'ap-shanghai',
        
        // 订单设置
        orderPrefix: 'ORD',
        orderExpireHours: 24,
        paymentMethods: ['wechat', 'alipay', 'cash'],
        defaultPaymentMethod: 'wechat',
        taxRate: 0,
        enableInvoice: true
      });
      setLoading(false);
    }, 1000);
  }, []);

  const handleSave = (values) => {
    setSaving(true);
    console.log('保存设置:', values);
    
    // 模拟保存设置
    setTimeout(() => {
      message.success('设置已保存');
      setSaving(false);
    }, 1000);
  };

  const handleReset = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要重置所有设置为默认值吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        form.resetFields();
        message.success('设置已重置为默认值');
      }
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4}>系统设置</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            loading={saving}
            onClick={() => form.submit()}
          >
            保存设置
          </Button>
        </Space>
      </div>
      
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{}}
          disabled={loading}
        >
          <Tabs defaultActiveKey="basic">
            <TabPane 
              tab={<span><SettingOutlined />基本设置</span>} 
              key="basic"
            >
              <Form.Item
                label="网站名称"
                name="siteName"
                rules={[{ required: true, message: '请输入网站名称' }]}
              >
                <Input placeholder="请输入网站名称" />
              </Form.Item>
              
              <Form.Item
                label="网站描述"
                name="siteDescription"
              >
                <Input.TextArea rows={3} placeholder="请输入网站描述" />
              </Form.Item>
              
              <Form.Item
                label="网站Logo"
                name="logo"
              >
                <Upload
                  name="logo"
                  listType="picture"
                  maxCount={1}
                  beforeUpload={() => false}
                >
                  <Button icon={<UploadOutlined />}>上传Logo</Button>
                </Upload>
              </Form.Item>
              
              <Form.Item
                label="联系电话"
                name="contactPhone"
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
              
              <Form.Item
                label="联系邮箱"
                name="contactEmail"
                rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
              >
                <Input placeholder="请输入联系邮箱" />
              </Form.Item>
              
              <Form.Item
                label="联系地址"
                name="address"
              >
                <Input.TextArea rows={2} placeholder="请输入联系地址" />
              </Form.Item>
            </TabPane>
            
            <TabPane 
              tab={<span><CloudOutlined />照片设置</span>} 
              key="photo"
            >
              <Form.Item
                label="最大上传大小(MB)"
                name="maxUploadSize"
                rules={[{ required: true, message: '请输入最大上传大小' }]}
              >
                <InputNumber min={1} max={100} />
              </Form.Item>
              
              <Form.Item
                label="允许的文件格式"
                name="allowedFormats"
                rules={[{ required: true, message: '请选择允许的文件格式' }]}
              >
                <Select mode="multiple" placeholder="请选择允许的文件格式">
                  <Option value="jpg">JPG</Option>
                  <Option value="jpeg">JPEG</Option>
                  <Option value="png">PNG</Option>
                  <Option value="gif">GIF</Option>
                  <Option value="bmp">BMP</Option>
                  <Option value="webp">WEBP</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                label="默认照片尺寸"
                name="defaultPhotoSize"
              >
                <Select placeholder="请选择默认照片尺寸">
                  <Option value="3inch">3寸</Option>
                  <Option value="4inch">4寸</Option>
                  <Option value="5inch">5寸</Option>
                  <Option value="6inch">6寸</Option>
                  <Option value="7inch">7寸</Option>
                  <Option value="8inch">8寸</Option>
                  <Option value="10inch">10寸</Option>
                  <Option value="A4">A4</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                label="启用水印"
                name="enableWatermark"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              
              <Form.Item
                label="水印文字"
                name="watermarkText"
                dependencies={['enableWatermark']}
              >
                <Input placeholder="请输入水印文字" disabled={!form.getFieldValue('enableWatermark')} />
              </Form.Item>
              
              <Form.Item
                label="水印透明度"
                name="watermarkOpacity"
                dependencies={['enableWatermark']}
              >
                <InputNumber 
                  min={0.1} 
                  max={1} 
                  step={0.1} 
                  disabled={!form.getFieldValue('enableWatermark')} 
                />
              </Form.Item>
            </TabPane>
            
            <TabPane 
              tab={<span><CloudOutlined />存储设置</span>} 
              key="storage"
            >
              <Form.Item
                label="存储类型"
                name="storageType"
                rules={[{ required: true, message: '请选择存储类型' }]}
              >
                <Select placeholder="请选择存储类型">
                  <Option value="local">本地存储</Option>
                  <Option value="cos">腾讯云COS</Option>
                  <Option value="oss">阿里云OSS</Option>
                  <Option value="qiniu">七牛云</Option>
                </Select>
              </Form.Item>
              
              <Divider>腾讯云COS配置</Divider>
              
              <Form.Item
                label="SecretId"
                name="cosSecretId"
                dependencies={['storageType']}
                rules={[
                  { 
                    required: form.getFieldValue('storageType') === 'cos', 
                    message: '请输入SecretId' 
                  }
                ]}
              >
                <Input.Password 
                  placeholder="请输入SecretId" 
                  disabled={form.getFieldValue('storageType') !== 'cos'} 
                />
              </Form.Item>
              
              <Form.Item
                label="SecretKey"
                name="cosSecretKey"
                dependencies={['storageType']}
                rules={[
                  { 
                    required: form.getFieldValue('storageType') === 'cos', 
                    message: '请输入SecretKey' 
                  }
                ]}
              >
                <Input.Password 
                  placeholder="请输入SecretKey" 
                  disabled={form.getFieldValue('storageType') !== 'cos'} 
                />
              </Form.Item>
              
              <Form.Item
                label="存储桶名称"
                name="cosBucket"
                dependencies={['storageType']}
                rules={[
                  { 
                    required: form.getFieldValue('storageType') === 'cos', 
                    message: '请输入存储桶名称' 
                  }
                ]}
              >
                <Input 
                  placeholder="请输入存储桶名称" 
                  disabled={form.getFieldValue('storageType') !== 'cos'} 
                />
              </Form.Item>
              
              <Form.Item
                label="所在地域"
                name="cosRegion"
                dependencies={['storageType']}
                rules={[
                  { 
                    required: form.getFieldValue('storageType') === 'cos', 
                    message: '请输入所在地域' 
                  }
                ]}
              >
                <Input 
                  placeholder="请输入所在地域，例如：ap-shanghai" 
                  disabled={form.getFieldValue('storageType') !== 'cos'} 
                />
              </Form.Item>
              
              <Form.Item>
                <Button 
                  type="dashed" 
                  disabled={form.getFieldValue('storageType') !== 'cos'}
                >
                  测试连接
                </Button>
              </Form.Item>
            </TabPane>
            
            <TabPane 
              tab={<span><DollarOutlined />订单设置</span>} 
              key="order"
            >
              <Form.Item
                label="订单号前缀"
                name="orderPrefix"
              >
                <Input placeholder="请输入订单号前缀" />
              </Form.Item>
              
              <Form.Item
                label="订单过期时间(小时)"
                name="orderExpireHours"
                rules={[{ required: true, message: '请输入订单过期时间' }]}
              >
                <InputNumber min={1} max={72} />
              </Form.Item>
              
              <Form.Item
                label="支付方式"
                name="paymentMethods"
                rules={[{ required: true, message: '请选择支付方式' }]}
              >
                <Select mode="multiple" placeholder="请选择支付方式">
                  <Option value="wechat">微信支付</Option>
                  <Option value="alipay">支付宝</Option>
                  <Option value="cash">现金</Option>
                  <Option value="bank">银行转账</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                label="默认支付方式"
                name="defaultPaymentMethod"
                dependencies={['paymentMethods']}
                rules={[{ required: true, message: '请选择默认支付方式' }]}
              >
                <Select placeholder="请选择默认支付方式">
                  <Option value="wechat">微信支付</Option>
                  <Option value="alipay">支付宝</Option>
                  <Option value="cash">现金</Option>
                  <Option value="bank">银行转账</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                label="税率(%)"
                name="taxRate"
              >
                <InputNumber min={0} max={100} />
              </Form.Item>
              
              <Form.Item
                label="启用发票"
                name="enableInvoice"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </TabPane>
            
            <TabPane 
              tab={<span><UserOutlined />账户设置</span>} 
              key="account"
            >
              <Form.Item
                label="管理员用户名"
                name="adminUsername"
              >
                <Input placeholder="请输入管理员用户名" />
              </Form.Item>
              
              <Form.Item
                label="当前密码"
                name="currentPassword"
              >
                <Input.Password placeholder="请输入当前密码" />
              </Form.Item>
              
              <Form.Item
                label="新密码"
                name="newPassword"
              >
                <Input.Password placeholder="请输入新密码" />
              </Form.Item>
              
              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="请再次输入新密码" />
              </Form.Item>
            </TabPane>
            
            <TabPane 
              tab={<span><NotificationOutlined />通知设置</span>} 
              key="notification"
            >
              <Form.Item
                label="启用邮件通知"
                name="enableEmailNotification"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              
              <Form.Item
                label="SMTP服务器"
                name="smtpServer"
                dependencies={['enableEmailNotification']}
              >
                <Input 
                  placeholder="请输入SMTP服务器" 
                  disabled={!form.getFieldValue('enableEmailNotification')} 
                />
              </Form.Item>
              
              <Form.Item
                label="SMTP端口"
                name="smtpPort"
                dependencies={['enableEmailNotification']}
              >
                <InputNumber 
                  placeholder="请输入SMTP端口" 
                  disabled={!form.getFieldValue('enableEmailNotification')} 
                />
              </Form.Item>
              
              <Form.Item
                label="SMTP用户名"
                name="smtpUsername"
                dependencies={['enableEmailNotification']}
              >
                <Input 
                  placeholder="请输入SMTP用户名" 
                  disabled={!form.getFieldValue('enableEmailNotification')} 
                />
              </Form.Item>
              
              <Form.Item
                label="SMTP密码"
                name="smtpPassword"
                dependencies={['enableEmailNotification']}
              >
                <Input.Password 
                  placeholder="请输入SMTP密码" 
                  disabled={!form.getFieldValue('enableEmailNotification')} 
                />
              </Form.Item>
              
              <Form.Item
                label="发件人邮箱"
                name="senderEmail"
                dependencies={['enableEmailNotification']}
              >
                <Input 
                  placeholder="请输入发件人邮箱" 
                  disabled={!form.getFieldValue('enableEmailNotification')} 
                />
              </Form.Item>
              
              <Form.Item>
                <Button 
                  type="dashed" 
                  disabled={!form.getFieldValue('enableEmailNotification')}
                >
                  发送测试邮件
                </Button>
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>
      </Card>
    </div>
  );
};

export default Settings; 