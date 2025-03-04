import React, { useState } from 'react';
import { Form, Input, Checkbox, Upload, Button, message, Card, Modal } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import 'antd/dist/reset.css';

const { TextArea } = Input;

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

    return (
        <div style={{ padding: '24px' }}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
            >
                {/* 订单号输入 */}
                <Form.Item
                    name="orderId"
                    label="订单号"
                    rules={[{ required: true, message: '请输入订单号' }]}
                >
                    <Input placeholder="请输入订单号" />
                </Form.Item>

                {/* 照片尺寸选择 */}
                <Form.Item
                    name="sizes"
                    label="照片尺寸"
                    rules={[{ required: true, message: '请选择照片尺寸' }]}
                >
                    <Checkbox.Group onChange={handleSizeChange}>
                        {photoSizes.map(size => (
                            <Checkbox key={size.value} value={size.value}>
                                {size.label}
                            </Checkbox>
                        ))}
                    </Checkbox.Group>
                </Form.Item>

                {/* 照片上传区域 */}
                {selectedSizes.map(size => (
                    <Card key={size} title={`${size} 照片上传`} style={{ marginBottom: 16 }}>
                        <Upload
                            listType="picture-card"
                            fileList={fileList[size] || []}
                            {...handleUpload(size)}
                        >
                            {(fileList[size]?.length || 0) >= 1000 ? null : (
                                <div>
                                    <UploadOutlined />
                                    <div style={{ marginTop: 8 }}>上传</div>
                                </div>
                            )}
                        </Upload>
                        <div>已上传: {fileList[size]?.length || 0} 张</div>
                    </Card>
                ))}

                {/* 备注信息 */}
                <Form.Item
                    name="remark"
                    label="备注"
                >
                    <TextArea placeholder="请输入备注信息" rows={4} />
                </Form.Item>

                {/* 提交按钮 */}
                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        提交
                    </Button>
                </Form.Item>
            </Form>

            {/* 裁剪模态框 */}
            <Modal
                title="图片裁剪"
                open={cropModalVisible}
                onOk={handleCropComplete}
                onCancel={() => setCropModalVisible(false)}
                width={800}
            >
                {currentImage && (
                    <ReactCrop
                        crop={crop}
                        onChange={c => setCrop(c)}
                        aspect={photoSizes.find(s => s.value === currentImage.size)?.ratio}
                    >
                        <img src={currentImage.src} alt="裁剪预览" />
                    </ReactCrop>
                )}
            </Modal>
        </div>
    );
};

export default PhotoUpload;