import React, { useState } from 'react';
import { Form, Input, Checkbox, Upload, Button, message, Card, Modal, Layout } from 'antd';
import { UploadOutlined, DeleteOutlined, CameraOutlined } from '@ant-design/icons';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import 'antd/dist/reset.css';

const { TextArea } = Input;
const { Header, Content } = Layout;

const PhotoUpload = () => {
    const [form] = Form.useForm();
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [fileList, setFileList] = useState({});
    const [cropModalVisible, setCropModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [crop, setCrop] = useState({ unit: '%', width: 30, aspect: 1 });

    // 照片尺寸配置
    const photoSizes = [
        { label: '3寸', value: '3inch', ratio: 3.5 / 5 },
        { label: '4寸', value: '4inch', ratio: 4 / 6 },
        { label: '5寸', value: '5inch', ratio: 5 / 7 },
        { label: '6寸', value: '6inch', ratio: 6 / 8 },
        { label: '7寸', value: '7inch', ratio: 7 / 9 },
        { label: '8寸', value: '8inch', ratio: 8 / 10 },
        { label: '10寸', value: '10inch', ratio: 10 / 12 },
        { label: 'A4', value: 'A4', ratio: 210 / 297 }
    ];

    // 处理尺寸选择变化
    const handleSizeChange = (checkedValues) => {
        setSelectedSizes(checkedValues);
        // 初始化新选择尺寸的文件列表
        const newFileList = { ...fileList };
        checkedValues.forEach(size => {
            if (!newFileList[size]) {
                newFileList[size] = [];
            }
        });
        setFileList(newFileList);
    };

    // 处理文件上传
    const handleUpload = (size) => ({
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('只能上传图片文件！');
                return false;
            }
            const isLt50M = file.size / 1024 / 1024 < 50;
            if (!isLt50M) {
                message.error('图片必须小于 50MB！');
                return false;
            }
            
            // 打开裁剪模态框
            const reader = new FileReader();
            reader.onload = () => {
                setCurrentImage({
                    src: reader.result,
                    file,
                    size
                });
                setCropModalVisible(true);
            };
            reader.readAsDataURL(file);
            return false; // 阻止自动上传
        }
    });

    // 处理裁剪完成
    const handleCropComplete = () => {
        // 这里应该处理裁剪后的图片
        if (currentImage) {
            const newFileList = { ...fileList };
            if (!newFileList[currentImage.size]) {
                newFileList[currentImage.size] = [];
            }
            newFileList[currentImage.size].push({
                uid: `-${Date.now()}`,
                name: currentImage.file.name,
                status: 'done',
                url: currentImage.src
            });
            setFileList(newFileList);
        }
        setCropModalVisible(false);
        setCurrentImage(null);
    };

    // 处理表单提交
    const handleSubmit = (values) => {
        const formData = {
            orderId: values.orderId,
            ...fileList,
            remark: values.remark
        };
        console.log('提交的数据：', formData);
        // 这里添加实际的提交逻辑
    };

    const layoutStyle = {
        minHeight: '100vh',
        background: '#f5f5f5'
    };

    const headerStyle = {
        height: 'auto',
        background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
        padding: '40px 0',
        textAlign: 'center',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    };

    const headerPatternStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        opacity: 0.2
    };

    const titleStyle = {
        fontSize: '32px',
        fontWeight: 'bold',
        margin: 0,
        position: 'relative',
        textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
    };

    const subtitleStyle = {
        fontSize: '16px',
        marginTop: '8px',
        opacity: 0.9,
        position: 'relative'
    };

    const contentStyle = {
        maxWidth: '800px',
        margin: '24px auto',
        padding: '24px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    };

    const formItemStyle = {
        marginBottom: '24px'
    };

    const checkboxGroupStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
        width: '100%'
    };

    const checkboxStyle = {
        margin: 0,
        padding: '8px 16px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff'
    };

    return (
        <Layout style={layoutStyle}>
            <Header style={headerStyle}>
                <div style={headerPatternStyle} />
                <CameraOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <h1 style={titleStyle}>照片上传系统</h1>
                <p style={subtitleStyle}>支持多种尺寸照片的批量上传与裁剪</p>
            </Header>
            <Content>
                <div style={contentStyle}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                    >
                        <Form.Item
                            name="orderId"
                            label={<span style={{ fontSize: '16px', fontWeight: 500 }}>订单号</span>}
                            rules={[{ required: true, message: '请输入订单号' }]}
                            style={formItemStyle}
                        >
                            <Input 
                                placeholder="请输入订单号" 
                                size="large"
                                style={{ borderRadius: '6px' }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="sizes"
                            label={<span style={{ fontSize: '16px', fontWeight: 500 }}>照片尺寸</span>}
                            rules={[{ required: true, message: '请选择照片尺寸' }]}
                            style={formItemStyle}
                        >
                            <Checkbox.Group 
                                onChange={handleSizeChange}
                                style={checkboxGroupStyle}
                            >
                                {photoSizes.map(size => (
                                    <Checkbox 
                                        key={size.value} 
                                        value={size.value}
                                        style={checkboxStyle}
                                    >
                                        {size.label}
                                    </Checkbox>
                                ))}
                            </Checkbox.Group>
                        </Form.Item>

                        {selectedSizes.map(size => (
                            <Form.Item
                                key={size}
                                style={formItemStyle}
                            >
                                <Card 
                                    title={`${photoSizes.find(s => s.value === size)?.label} 照片上传`}
                                    style={{ 
                                        borderRadius: '8px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                                    }}
                                    headStyle={{
                                        background: '#fafafa',
                                        borderTopLeftRadius: '8px',
                                        borderTopRightRadius: '8px'
                                    }}
                                >
                                    <Upload
                                        listType="picture-card"
                                        fileList={fileList[size] || []}
                                        {...handleUpload(size)}
                                    >
                                        {(fileList[size]?.length || 0) >= 1000 ? null : (
                                            <div>
                                                <UploadOutlined style={{ fontSize: '24px' }} />
                                                <div style={{ marginTop: 8 }}>上传</div>
                                            </div>
                                        )}
                                    </Upload>
                                    <div style={{ 
                                        marginTop: 16,
                                        padding: '8px 16px',
                                        background: '#f5f5f5',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span>已上传: {fileList[size]?.length || 0} 张</span>
                                        <span>最多可上传: 1000 张</span>
                                    </div>
                                </Card>
                            </Form.Item>
                        ))}

                        <Form.Item
                            name="remark"
                            label={<span style={{ fontSize: '16px', fontWeight: 500 }}>备注</span>}
                            style={formItemStyle}
                        >
                            <TextArea 
                                placeholder="请输入备注信息" 
                                rows={4}
                                style={{ borderRadius: '6px' }}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button 
                                type="primary" 
                                htmlType="submit"
                                size="large"
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    borderRadius: '6px',
                                    fontSize: '16px'
                                }}
                            >
                                提交
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </Content>

            <Modal
                title="图片裁剪"
                open={cropModalVisible}
                onOk={handleCropComplete}
                onCancel={() => setCropModalVisible(false)}
                width={800}
                style={{ top: 20 }}
                bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}
            >
                {currentImage && (
                    <ReactCrop
                        crop={crop}
                        onChange={c => setCrop(c)}
                        aspect={photoSizes.find(s => s.value === currentImage.size)?.ratio}
                    >
                        <img src={currentImage.src} alt="裁剪预览" style={{ maxWidth: '100%' }} />
                    </ReactCrop>
                )}
            </Modal>
        </Layout>
    );
};

export default PhotoUpload;