import React, { useState, useEffect } from 'react';
import { Form, Input, Checkbox, Upload, Button, message, Card, Layout, Modal, Statistic } from 'antd';
import { UploadOutlined, DeleteOutlined, CameraOutlined, RotateLeftOutlined, RotateRightOutlined, ZoomInOutlined, ZoomOutOutlined, SwapOutlined, EyeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import ImgCrop from 'antd-img-crop';
import { uploadToServer } from '../utils/uploadConfig';
import { useNavigate } from 'react-router-dom';
import { post } from '../utils/apiService';

const { TextArea } = Input;
const { Header, Content } = Layout;
const { confirm } = Modal;

const PhotoUpload = () => {
    const [form] = Form.useForm();
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [fileList, setFileList] = useState({});
    const [orderIdEntered, setOrderIdEntered] = useState(false);
    const [uploading, setUploading] = useState(false); // 是否有文件正在上传
    const [totalPhotos, setTotalPhotos] = useState(0); // 所有尺寸的照片总数
    const navigate = useNavigate(); // 用于页面导航

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

    // 计算所有尺寸的照片总数
    useEffect(() => {
        let count = 0;
        Object.values(fileList).forEach(files => {
            if (Array.isArray(files)) {
                // 只计算上传成功的照片
                count += files.filter(file => file.status === 'done').length;
            }
        });
        setTotalPhotos(count);
    }, [fileList]);

    // 处理订单号变化
    const handleOrderIdChange = (e) => {
        const value = e.target.value;
        setOrderIdEntered(!!value.trim());
    };

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

    // 获取尺寸对应的比例配置
    const getSizeRatios = (sizeValue) => {
        const sizeConfig = {
            '3inch': { landscape: 3/2, portrait: 2/3 },
            '4inch': { landscape: 4/3, portrait: 3/4 },
            '5inch': { landscape: 3/2, portrait: 2/3 },
            '6inch': { landscape: 3/2, portrait: 2/3 },
            '7inch': { landscape: 10/7, portrait: 7/10 },
            '8inch': { landscape: 4/3, portrait: 3/4 },
            '10inch': { landscape: 10/8, portrait: 8/10 },
            'A4': { landscape: 297/210, portrait: 210/297 }
        };
        return sizeConfig[sizeValue] || { landscape: 3/2, portrait: 2/3 };
    };

    // 处理单个图片的加载和处理
    const processImage = async (file, size, customUid = null) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    resolve({
                        uid: customUid || `-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        name: file.name,
                        status: 'done',
                        url: reader.result,
                        size: size,
                        originalFile: file
                    });
                } catch (error) {
                    reject(error);
                }
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
        beforeUpload: (file) => {
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
            
            // 检查是否已经存在相同的文件 - 修改这里的检测逻辑
            const existingFiles = fileList[size] || [];
            const isDuplicate = existingFiles.some(item => 
                item.name === file.name && 
                item.status === 'done' // 只检查已经上传完成的文件
            );
            
            if (isDuplicate) {
                message.warning(`${file.name} 已经存在，请勿重复上传`);
                return Upload.LIST_IGNORE; // 忽略这个文件
            }
            
            return true;
        },
        customRequest: async ({ file, onSuccess, onError, onProgress }) => {
            try {
                // 设置上传状态为true
                setUploading(true);
                
                // 生成唯一的文件ID
                const fileId = `-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // 先处理图片获取预览
                const processedFile = await processImage(file, size);
                processedFile.uid = fileId; // 确保使用同一个唯一ID
                
                const newFileList = { ...fileList };
                if (!newFileList[size]) {
                    newFileList[size] = [];
                }
                
                if (newFileList[size].length >= 1000) {
                    message.error('已达到1000张上限！');
                    onError(new Error('已达到上传上限'));
                    setUploading(false);
                    return;
                }

                // 检查是否已经存在相同的文件
                const isDuplicate = newFileList[size].some(item => 
                    item.name === processedFile.name && 
                    item.status === 'done'
                );
                
                if (isDuplicate) {
                    message.warning(`${file.name} 已经存在，请勿重复上传`);
                    onError(new Error('文件已存在'));
                    setUploading(false);
                    return;
                }
                
                // 添加到本地预览列表 - 确保只添加一次
                const existingIndex = newFileList[size].findIndex(item => item.uid === fileId);
                if (existingIndex === -1) {
                    processedFile.status = 'uploading';
                    newFileList[size].push(processedFile);
                    setFileList(newFileList);
                }
                
                // 上传到服务器
                const key = `${form.getFieldValue('orderId')}/${size}/${file.name}`;
                
                uploadToServer({
                    file: file,
                    key: key,
                    onProgress: (progressData) => {
                        // 更新上传进度
                        const percent = progressData.percent * 100;
                        onProgress({ percent });
                        
                        // 更新文件列表中的进度
                        const updatedFileList = { ...fileList };
                        const fileIndex = updatedFileList[size].findIndex(item => item.uid === fileId);
                        if (fileIndex > -1) {
                            updatedFileList[size][fileIndex].percent = percent;
                            setFileList(updatedFileList);
                        }
                    },
                    onSuccess: (data) => {
                        // 获取上传后的URL
                        const imageUrl = data.url;
                        
                        // 更新文件状态和URL
                        const updatedFileList = { ...fileList };
                        const fileIndex = updatedFileList[size].findIndex(item => item.uid === fileId);
                        if (fileIndex > -1) {
                            updatedFileList[size][fileIndex].status = 'done';
                            updatedFileList[size][fileIndex].url = imageUrl;
                            updatedFileList[size][fileIndex].cosUrl = imageUrl;
                            setFileList(updatedFileList);
                            
                            // 确保成功回调只传递正确的数据
                            onSuccess({
                                ...data,
                                uid: fileId,
                                name: file.name,
                                status: 'done',
                                url: imageUrl
                            });
                        } else {
                            // 如果找不到对应的文件，可能是状态已经被清除，重新添加
                            const newFile = {
                                uid: fileId,
                                name: file.name,
                                status: 'done',
                                url: imageUrl,
                                cosUrl: imageUrl,
                                size: size
                            };
                            updatedFileList[size] = [...(updatedFileList[size] || []), newFile];
                            setFileList(updatedFileList);
                            onSuccess(newFile);
                        }
                        
                        // 检查是否所有文件都上传完成
                        const allDone = Object.values(updatedFileList).every(sizeFiles => 
                            sizeFiles.every(file => file.status !== 'uploading')
                        );
                        
                        if (allDone) {
                            setUploading(false);
                        }
                    },
                    onError: (err) => {
                        message.error(`上传失败: ${file.name}`);
                        
                        // 更新文件状态为错误
                        const updatedFileList = { ...fileList };
                        const fileIndex = updatedFileList[size].findIndex(item => item.uid === fileId);
                        if (fileIndex > -1) {
                            updatedFileList[size][fileIndex].status = 'error';
                            setFileList(updatedFileList);
                        }
                        
                        onError(err);
                        
                        // 检查是否所有文件都处理完成（包括错误状态）
                        const allProcessed = Object.values(updatedFileList).every(sizeFiles => 
                            sizeFiles.every(file => file.status !== 'uploading')
                        );
                        
                        if (allProcessed) {
                            setUploading(false);
                        }
                    }
                });
            } catch (error) {
                message.error(`处理图片 ${file.name} 失败`);
                onError(error);
                setUploading(false);
            }
        },
        multiple: true,
        maxCount: 1000,
        accept: 'image/*',
        showUploadList: {
            showPreviewIcon: true,
            showRemoveIcon: true,
            showDownloadIcon: false,
            previewIcon: <EyeOutlined />,
            removeIcon: <DeleteOutlined />
        }
    });

    // 处理图片预览
    const onPreview = async (file, size) => {
        let src = file.url;
        if (!src) {
            src = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file.originFileObj);
                reader.onload = () => resolve(reader.result);
            });
        }
        const image = new Image();
        image.src = src;
        const imgWindow = window.open(src);
        imgWindow?.document.write(image.outerHTML);
    };

    // 处理图片上传后的变化
    const handleChange = (size, { file, fileList: newFileList }) => {
        // 如果是上传中或上传成功的状态，由 customRequest 处理，这里不需要更新状态
        if (file.status === 'uploading' || file.status === 'done') {
            return;
        }
        
        // 如果是移除文件或上传失败，则更新状态
        if (file.status === 'removed' || file.status === 'error') {
            const updatedFileList = { ...fileList };
            updatedFileList[size] = newFileList.filter(f => {
                // 过滤掉重复的文件（基于uid）
                const count = newFileList.filter(item => item.uid === f.uid).length;
                return count === 1;
            });
            setFileList(updatedFileList);
        }
    };

    // 显示提交确认对话框
    const showConfirmModal = (values) => {
        confirm({
            title: '确认提交',
            icon: <ExclamationCircleOutlined />,
            content: `您即将提交${totalPhotos}张照片，提交后将无法修改，是否确认提交？`,
            okText: '确认提交',
            cancelText: '取消',
            onOk() {
                submitData(values);
            },
        });
    };

    // 提交数据到服务器
    const submitData = (values) => {
        try {
            // 构建符合要求的新数据结构
            const formData = {
                order_sn: values.orderId,
                remark: values.remark,
                photos: []
            };
            
            // 添加各尺寸的照片数据
            selectedSizes.forEach(size => {
                try {
                    const urls = (fileList[size] || [])
                        .filter(file => file.cosUrl && file.status === 'done') // 确保只包含有URL且上传成功的文件
                        .map(file => file.cosUrl);
                    
                    // 只添加有照片的尺寸
                    if (urls.length > 0) {
                        // 从尺寸值中提取数字部分作为size
                        let sizeValue = size;
                        if (size.includes('inch')) {
                            sizeValue = size.replace('inch', '');
                        }
                        
                        // 将尺寸转换为数字
                        let sizeNumber = parseInt(sizeValue, 10);
                        if (isNaN(sizeNumber)) {
                            // 如果转换失败，使用默认值
                            console.warn(`无法将尺寸 ${sizeValue} 转换为数字，使用默认值 1`);
                            sizeNumber = 1;
                        }
                        
                        // 检查URL是否有效
                        const validUrls = urls.filter(url => url && url.trim() !== '');
                        if (validUrls.length === 0) {
                            console.warn(`尺寸 ${size} 没有有效的URL，跳过`);
                            return;
                        }
                        
                        console.log(`添加尺寸 ${size}，提取的数值为 ${sizeNumber}，URL数量: ${validUrls.length}`);
                        
                        formData.photos.push({
                            size: sizeNumber,
                            unit: size.includes('inch') ? '寸' : '',
                            urls: validUrls
                        });
                    } else {
                        console.log(`尺寸 ${size} 没有上传的照片，跳过`);
                    }
                } catch (sizeError) {
                    console.error(`处理尺寸 ${size} 时出错:`, sizeError);
                }
            });
            
            // 检查是否有照片数据
            if (formData.photos.length === 0) {
                message.error('请至少上传一张照片');
                console.error('没有照片数据可提交');
                return;
            }
        
            console.log('提交的数据：', JSON.stringify(formData, null, 2));
            
            // 显示提交中的加载状态
            message.loading('正在提交数据...', 0);
            
            // 使用apiService发送请求到后端API
            post('/api/photos/batch-upload', formData)
                .then(data => {
                    console.log('上传成功响应:', data);
                    
                    // 关闭加载提示
                    message.destroy();
                    
                    // 显示成功消息
                    message.success(`上传成功！共上传了 ${data.total_photos} 张照片`);
                    
                    // 清空表单和文件列表
                    form.resetFields();
                    setFileList({});
                    setSelectedSizes([]);
                    
                    // 跳转到完成页面
                    setTimeout(() => {
                        navigate('/upload-complete');
                    }, 1000);
                })
                .catch(error => {
                    // 关闭加载提示
                    message.destroy();
                    
                    console.error('上传失败:', error);
                    message.error('上传失败，请重试');
                });
        } catch (error) {
            console.error('提交表单时发生错误:', error);
            message.error('提交表单时发生错误，请检查数据后重试');
        }
    };

    // 处理表单提交
    const handleSubmit = (values) => {
        // 检查是否有文件正在上传
        if (uploading) {
            message.warning('请等待所有照片上传完成后再提交');
            return;
        }
        
        // 显示确认对话框
        showConfirmModal(values);
    };

    const layoutStyle = {
        minHeight: '100vh',
        background: '#f8f9fa'  // 更柔和的背景色
    };

    const headerStyle = {
        height: 'auto',
        background: 'linear-gradient(120deg, #2196F3 0%, #4CAF50 100%)',  // 更现代的渐变色
        padding: '32px 0',
        textAlign: 'center',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    };

    const headerPatternStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        opacity: 0.1
    };

    const titleStyle = {
        fontSize: '36px',
        fontWeight: '600',
        margin: 0,
        position: 'relative',
        textShadow: '2px 2px 4px rgba(0,0,0,0.15)',
        letterSpacing: '1px'
    };

    const subtitleStyle = {
        fontSize: '18px',
        marginTop: '12px',
        opacity: 0.95,
        position: 'relative',
        fontWeight: '300'
    };

    const contentStyle = {
        maxWidth: '900px',
        margin: '32px auto',
        padding: '32px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease'
    };

    const formItemStyle = {
        marginBottom: '32px'
    };

    const checkboxGroupStyle = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        width: '100%'
    };

    const checkboxStyle = {
        margin: 0,
        padding: '12px 24px',
        border: '1px solid #e8e8e8',
        borderRadius: '12px',
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        cursor: 'pointer',
        flexShrink: 0,
        '&:hover': {
            borderColor: '#40a9ff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }
    };

    return (
        <Layout style={layoutStyle}>
            <Header style={headerStyle}>
                <div style={headerPatternStyle} />
                <CameraOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <h1 style={titleStyle}>田田洗照片</h1>
                <p style={subtitleStyle}>自己开发的一个收集工具，服务器带宽有限，上传照片请耐心等待下哦</p>
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
                            label={<span style={{ fontSize: '16px', fontWeight: 500 }}>淘宝订单号</span>}
                            rules={[{ required: true, message: '请输入淘宝订单号' }]}
                            style={formItemStyle}
                        >
                            <Input 
                                placeholder="请输入淘宝订单号"
                                size="large"
                                style={{ borderRadius: '6px' }}
                                onChange={handleOrderIdChange}
                            />
                        </Form.Item>

                        <Form.Item
                            name="sizes"
                            label={<span style={{ fontSize: '16px', fontWeight: 500 }}>照片尺寸</span>}
                            rules={[{ required: true, message: '请选择照片尺寸' }]}
                            style={formItemStyle}
                            extra={!orderIdEntered ? <span style={{ color: '#ff4d4f' }}>请先填写订单号，然后再选择照片尺寸</span> : null}
                        >
                            <div style={{ 
                                padding: '16px 24px', 
                                background: '#fafafa', 
                                borderRadius: '12px',
                                border: '1px solid #f0f0f0'
                            }}>
                                <Checkbox.Group 
                                    onChange={handleSizeChange}
                                    style={checkboxGroupStyle}
                                    disabled={!orderIdEntered}
                                >
                                    {photoSizes.map(size => (
                                        <Checkbox 
                                            key={size.value} 
                                            value={size.value}
                                            style={checkboxStyle}
                                            disabled={!orderIdEntered}
                                        >
                                            {size.label}
                                        </Checkbox>
                                    ))}
                                </Checkbox.Group>
                            </div>
                        </Form.Item>

                        {selectedSizes.map(size => (
                            <Form.Item key={size} style={formItemStyle}>
                                <Card 
                                    title={`${photoSizes.find(s => s.value === size)?.label} 照片上传`}
                                    style={{ 
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        border: '1px solid #f0f0f0'
                                    }}
                                    headStyle={{
                                        background: '#fafafa',
                                        borderTopLeftRadius: '12px',
                                        borderTopRightRadius: '12px',
                                        borderBottom: '1px solid #f0f0f0',
                                        padding: '16px 24px'
                                    }}
                                >
                                    <Upload
                                        listType="picture-card"
                                        fileList={fileList[size] || []}
                                        {...handleUpload(size)}
                                        onPreview={(file) => onPreview(file, size)}
                                        onChange={(info) => handleChange(size, info)}
                                        onRemove={(file) => handleRemove(file, size)}
                                        multiple={true}
                                        directory={false}
                                        customRequest={handleUpload(size).customRequest}
                                        disabled={!orderIdEntered}
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
                                        padding: '12px 20px',
                                        background: '#f8f9fa',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '14px',
                                        color: '#666'
                                    }}>
                                        <span>已上传: {(fileList[size] || []).filter(file => file.status === 'done').length} 张</span>
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
                                    height: '50px',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    background: 'linear-gradient(120deg, #2196F3 0%, #4CAF50 100%)',
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    transition: 'all 0.3s ease'
                                }}
                                disabled={uploading || totalPhotos === 0}
                            >
                                {uploading ? '正在上传中...' : `提交 (已上传${totalPhotos}张照片)`}
                            </Button>
                            {uploading && (
                                <div style={{ marginTop: '8px', color: '#ff4d4f', textAlign: 'center' }}>
                                    有照片正在上传中，请等待上传完成...
                                </div>
                            )}
                        </Form.Item>
                    </Form>
                </div>
            </Content>
        </Layout>
    );
};

export default PhotoUpload;