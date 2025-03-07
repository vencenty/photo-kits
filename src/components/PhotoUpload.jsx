import React, { useState } from 'react';
import { Form, Input, Checkbox, Upload, Button, message, Card, Layout } from 'antd';
import { UploadOutlined, DeleteOutlined, CameraOutlined, RotateLeftOutlined, RotateRightOutlined, ZoomInOutlined, ZoomOutOutlined, SwapOutlined, EyeOutlined } from '@ant-design/icons';
import 'react-image-crop/dist/ReactCrop.css';
import 'antd/dist/reset.css';
import ImgCrop from 'antd-img-crop';
import { uploadToCOS } from '../utils/cosConfig';

const { TextArea } = Input;
const { Header, Content } = Layout;

const PhotoUpload = () => {
    const [form] = Form.useForm();
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [fileList, setFileList] = useState({});

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
                    return;
                }
                
                // 添加到本地预览列表 - 确保只添加一次
                const existingIndex = newFileList[size].findIndex(item => item.uid === fileId);
                if (existingIndex === -1) {
                    processedFile.status = 'uploading';
                    newFileList[size].push(processedFile);
                    setFileList(newFileList);
                }
                
                // 上传到COS
                const key = `${form.getFieldValue('orderId')}/${size}/${file.name}`;
                
                uploadToCOS({
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
                        // 更新文件状态和URL
                        const updatedFileList = { ...fileList };
                        const fileIndex = updatedFileList[size].findIndex(item => item.uid === fileId);
                        if (fileIndex > -1) {
                            updatedFileList[size][fileIndex].status = 'done';
                            updatedFileList[size][fileIndex].url = data.Location;
                            updatedFileList[size][fileIndex].cosUrl = data.Location;
                            setFileList(updatedFileList);
                            
                            // 确保成功回调只传递正确的数据
                            onSuccess({
                                ...data,
                                uid: fileId,
                                name: file.name,
                                status: 'done',
                                url: data.Location
                            });
                        } else {
                            // 如果找不到对应的文件，可能是状态已经被清除，重新添加
                            const newFile = {
                                uid: fileId,
                                name: file.name,
                                status: 'done',
                                url: data.Location,
                                cosUrl: data.Location,
                                size: size
                            };
                            updatedFileList[size] = [...(updatedFileList[size] || []), newFile];
                            setFileList(updatedFileList);
                            onSuccess(newFile);
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
                    }
                });
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

    // 处理表单提交
    const handleSubmit = (values) => {
        // 构建符合要求的数据结构
        const formData = {
            orderId: values.orderId,
            remark: values.remark
        };
        
        // 添加各尺寸的照片数据
        selectedSizes.forEach(size => {
            // 保存文件的COS URL
            formData[size] = (fileList[size] || []).map(file => file.cosUrl || '');
        });
        
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
                <h1 style={titleStyle}>田田洗照片</h1>
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
                                        onPreview={(file) => onPreview(file, size)}
                                        onChange={(info) => handleChange(size, info)}
                                        onRemove={(file) => handleRemove(file, size)}
                                        multiple={true}
                                        directory={false}
                                        customRequest={handleUpload(size).customRequest}
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
        </Layout>
    );
};

export default PhotoUpload;