import React, { useState } from 'react';
import { Form, Input, Checkbox, Upload, Button, message, Card, Layout } from 'antd';
import { UploadOutlined, DeleteOutlined, CameraOutlined, RotateLeftOutlined, RotateRightOutlined, ZoomInOutlined, ZoomOutOutlined, SwapOutlined } from '@ant-design/icons';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import 'antd/dist/reset.css';
import ImageEditor from './ImageEditor';

const { TextArea } = Input;
const { Header, Content } = Layout;

const PhotoUpload = () => {
    const [form] = Form.useForm();
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [fileList, setFileList] = useState({});
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [scale, setScale] = useState(1);
    const [crop, setCrop] = useState(null);
    const [aspectRatio, setAspectRatio] = useState(null);

    // 照片尺寸配置
    const photoSizes = [
        { label: '3寸', value: '3inch', ratio: 3/2 },
        { label: '4寸', value: '4inch', ratio: 3/4 },
        { label: '5寸', value: '5inch', ratio: 3/2 },
        { label: '6寸', value: '6inch', ratio: 3/2 },
        { label: '7寸', value: '7inch', ratio: 10/7 },
        { label: '8寸', value: '8inch', ratio: 4/3 },
        { label: '10寸', value: '10inch', ratio: 10/8 },
        { label: 'A4', value: 'A4', ratio: 210/297 }
    ];

    // 处理尺寸选择变化
    const handleSizeChange = (checkedValues) => {
        setSelectedSizes(checkedValues);
        const newFileList = { ...fileList };
        checkedValues.forEach(size => {
            if (!newFileList[size]) {
                newFileList[size] = [];
            }
        });
        setFileList(newFileList);
    };

    // 获取默认裁剪区域
    const getDefaultCrop = (imageWidth, imageHeight, ratio) => {
        const aspectRatio = ratio;
        let cropWidth = imageWidth;
        let cropHeight = cropWidth / aspectRatio;

        if (cropHeight > imageHeight) {
            cropHeight = imageHeight;
            cropWidth = cropHeight * aspectRatio;
        }

        const x = (imageWidth - cropWidth) / 2;
        const y = (imageHeight - cropHeight) / 2;

        return {
            unit: 'px',
            x,
            y,
            width: cropWidth,
            height: cropHeight
        };
    };

    // 生成裁剪后的图片
    const getCroppedImg = (imageSrc, crop, rotation = 0, scale = 1) => {
        return new Promise((resolve) => {
            const image = new Image();
            image.src = imageSrc;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 计算画布大小
                const scaleX = image.naturalWidth / image.width;
                const scaleY = image.naturalHeight / image.height;

                // 设置画布尺寸为裁剪尺寸
                canvas.width = crop.width;
                canvas.height = crop.height;

                // 保存上下文状态
                ctx.save();

                // 将画布原点移到中心
                ctx.translate(canvas.width/2, canvas.height/2);
                // 应用旋转
                ctx.rotate((rotation * Math.PI) / 180);
                // 应用缩放
                ctx.scale(scale, scale);
                // 移回原点
                ctx.translate(-canvas.width/2, -canvas.height/2);

                // 绘制裁剪后的图片
                ctx.drawImage(
                    image,
                    crop.x * scaleX,
                    crop.y * scaleY,
                    crop.width * scaleX,
                    crop.height * scaleY,
                    0,
                    0,
                    crop.width,
                    crop.height
                );

                // 恢复上下文状态
                ctx.restore();

                // 转换为 base64
                canvas.toBlob((blob) => {
                    resolve(URL.createObjectURL(blob));
                }, 'image/jpeg');
            };
        });
    };

    // 检测图片方向并设置默认比例
    const detectImageOrientation = (imageWidth, imageHeight) => {
        const isLandscape = imageWidth > imageHeight;
        return isLandscape ? 3/2 : 2/3;
    };

    // 切换横竖比例
    const toggleAspectRatio = () => {
        if (aspectRatio === 3/2) {
            setAspectRatio(2/3);
        } else if (aspectRatio === 2/3) {
            setAspectRatio(3/2);
        }
    };

    // 处理单个图片的加载和处理
    const processImage = async (file, size) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const img = new Image();
                img.onload = async () => {
                    const ratio = photoSizes.find(s => s.value === size)?.ratio || 1;
                    const defaultCrop = getDefaultCrop(img.width, img.height, ratio);
                    
                    // 生成裁剪后的缩略图
                    const croppedImageUrl = await getCroppedImg(reader.result, defaultCrop);
                    
                    resolve({
                        uid: `-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        name: file.name,
                        status: 'done',
                        url: reader.result, // 原图 URL
                        thumbUrl: croppedImageUrl, // 裁剪后的缩略图 URL
                        originalFile: file,
                        crop: defaultCrop,
                        rotation: 0,
                        scale: 1
                    });
                };
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // 处理文件删除
    const handleRemove = (file, size) => {
        const newFileList = { ...fileList };
        newFileList[size] = newFileList[size].filter(item => item.uid !== file.uid);
        setFileList(newFileList);
        // 清理创建的 Object URL
        if (file.thumbUrl) {
            URL.revokeObjectURL(file.thumbUrl);
        }
        return true;
    };

    // 处理文件上传
    const handleUpload = (size) => ({
        beforeUpload: (file, fileList) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error(`${file.name} 不是图片文件！`);
                return false;
            }
            const isLt50M = file.size / 1024 / 1024 < 50;
            if (!isLt50M) {
                message.error(`${file.name} 大小超过 50MB！`);
                return false;
            }
            return true;
        },
        customRequest: async ({ file, onSuccess, onError }) => {
            try {
                const processedFile = await processImage(file, size);
                const newFileList = { ...fileList };
                if (!newFileList[size]) {
                    newFileList[size] = [];
                }
                
                if (newFileList[size].length >= 1000) {
                    message.error('已达到1000张上限！');
                    onError(new Error('已达到上传上限'));
                    return;
                }

                newFileList[size].push(processedFile);
                setFileList(newFileList);
                onSuccess();
            } catch (error) {
                message.error(`处理图片 ${file.name} 失败`);
                onError(error);
            }
        },
        multiple: true,
        maxCount: 1000,
        accept: 'image/*',
        showUploadList: {
            showPreviewIcon: true,
            showRemoveIcon: true,
            showDownloadIcon: false
        }
    });

    // 修改打开编辑模态框的函数
    const handleEdit = (file, size) => {
        const img = new Image();
        img.onload = () => {
            const defaultRatio = detectImageOrientation(img.width, img.height);
            setAspectRatio(defaultRatio);
            
            setCurrentImage({
                ...file,
                size,
                width: img.width,
                height: img.height
            });
            
            // 如果已有裁剪数据则使用，否则生成默认裁剪
            if (file.crop) {
                setCrop(file.crop);
            } else {
                const defaultCrop = getDefaultCrop(img.width, img.height, defaultRatio);
                setCrop(defaultCrop);
            }
            
            setRotation(file.rotation || 0);
            setScale(file.scale || 1);
            setEditModalVisible(true);
        };
        img.src = file.url;
    };

    // 处理图片旋转
    const handleRotate = (direction) => {
        setRotation(prev => prev + (direction === 'left' ? -90 : 90));
    };

    // 处理图片缩放
    const handleZoom = (direction) => {
        setScale(prev => direction === 'in' ? prev * 1.1 : prev / 1.1);
    };

    // 保存编辑
    const handleSaveEdit = async () => {
        if (currentImage) {
            try {
                // 生成新的裁剪后的缩略图
                const croppedImageUrl = await getCroppedImg(
                    currentImage.url,
                    crop,
                    rotation,
                    scale
                );

                const newFileList = { ...fileList };
                const fileIndex = newFileList[currentImage.size].findIndex(
                    f => f.uid === currentImage.uid
                );
                
                if (fileIndex !== -1) {
                    // 清理旧的 Object URL
                    if (newFileList[currentImage.size][fileIndex].thumbUrl) {
                        URL.revokeObjectURL(newFileList[currentImage.size][fileIndex].thumbUrl);
                    }
                    
                    newFileList[currentImage.size][fileIndex] = {
                        ...newFileList[currentImage.size][fileIndex],
                        thumbUrl: croppedImageUrl,
                        crop,
                        rotation,
                        scale
                    };
                    setFileList(newFileList);
                }
                
                message.success('编辑已保存');
            } catch (error) {
                message.error('保存编辑失败');
            }
        }
        setEditModalVisible(false);
        setCurrentImage(null);
        setCrop(null);
        setRotation(0);
        setScale(1);
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
                            <Form.Item key={size} style={formItemStyle}>
                                <Card 
                                    title={`${photoSizes.find(s => s.value === size)?.label} 照片上传`}
                                    style={{ borderRadius: '8px' }}
                                >
                                    <Upload
                                        listType="picture-card"
                                        fileList={fileList[size] || []}
                                        {...handleUpload(size)}
                                        onPreview={(file) => handleEdit(file, size)}
                                        onRemove={(file) => handleRemove(file, size)}
                                        multiple={true}
                                        directory={false}
                                    >
                                        {(fileList[size]?.length || 0) >= 1000 ? null : (
                                            <div>
                                                <UploadOutlined style={{ fontSize: '24px' }} />
                                                <div style={{ marginTop: 8 }}>
                                                    点击或拖拽上传
                                                    <br />
                                                    <small style={{ color: '#999' }}>
                                                        支持多选或拖拽多个文件
                                                    </small>
                                                </div>
                                            </div>
                                        )}
                                    </Upload>
                                    <div style={{ 
                                        marginTop: 16,
                                        padding: '8px 16px',
                                        background: '#f5f5f5',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between'
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

            <ImageEditor
                visible={editModalVisible}
                image={currentImage}
                crop={crop}
                rotation={rotation}
                scale={scale}
                aspectRatio={aspectRatio}
                onClose={() => setEditModalVisible(false)}
                onSave={handleSaveEdit}
                onCropChange={setCrop}
                onRotate={handleRotate}
                onZoom={handleZoom}
                onAspectRatioToggle={toggleAspectRatio}
            />
        </Layout>
    );
};

export default PhotoUpload;