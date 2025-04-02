import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Form, Input, Checkbox, Upload, Button, message, Card, Layout, Modal, Statistic, List, Spin } from 'antd';
import { UploadOutlined, DeleteOutlined, CameraOutlined, RotateLeftOutlined, RotateRightOutlined, ZoomInOutlined, ZoomOutOutlined, SwapOutlined, EyeOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import ImgCrop from 'antd-img-crop';
import { uploadToServer } from '../utils/uploadConfig';
import { useNavigate } from 'react-router-dom';
import { post } from '../utils/apiService';
import IMG_PROXY_URL from '../config/commonConfig.js'

const { TextArea } = Input;
const { Header, Content } = Layout;
const { confirm } = Modal;


// 图片压缩函数
const compressImage = (file, maxSizeMB = 20, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        // 如果文件小于指定大小，直接返回原文件
        if (file.size / 1024 / 1024 <= maxSizeMB) {
            resolve({ file, compressed: false });
            return;
        }
        
        // 创建图片元素以获取原始尺寸
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = function(e) {
            img.src = e.target.result;
            
            img.onload = function() {
                // 原始宽高
                const width = img.width;
                const height = img.height;
                
                // 原始文件大小（MB）
                const originalSize = file.size / 1024 / 1024;
                
                // 计算压缩比例（目标大小与原始大小的比率）
                const compressionRatio = Math.min(0.9, (maxSizeMB / originalSize));
                
                // 按比例计算新的尺寸，确保等比缩放
                let newWidth = Math.floor(width * Math.sqrt(compressionRatio));
                let newHeight = Math.floor(height * Math.sqrt(compressionRatio));
                
                // 创建canvas以绘制压缩后的图片
                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                // 绘制图片到canvas
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // 使用统一的80%压缩率
                const outputQuality = 0.8;
                
                // 将canvas转换为Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob conversion failed'));
                            return;
                        }
                        
                        // 创建一个新的File对象
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg', // 强制转换为jpeg，通常压缩效果更好
                            lastModified: Date.now()
                        });
                        
                        console.log(`压缩前: ${originalSize.toFixed(2)}MB, 压缩后: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                        
                        // 如果压缩后文件仍然大于目标大小，进一步压缩
                        if (compressedFile.size / 1024 / 1024 > maxSizeMB) {
                            // 递归压缩，降低质量
                            compressImage(compressedFile, maxSizeMB, outputQuality - 0.1)
                                .then(result => resolve({ 
                                    file: result.file, 
                                    compressed: true, 
                                    originalSize: result.originalSize,
                                    compressedSize: result.compressedSize,
                                    isLargeImage: result.originalSize > 20 
                                }))
                                .catch(reject);
                        } else {
                            resolve({ 
                                file: compressedFile, 
                                compressed: true, 
                                originalSize: originalSize,
                                compressedSize: compressedFile.size / 1024 / 1024,
                                isLargeImage: originalSize > 20
                            });
                        }
                    },
                    'image/jpeg',
                    outputQuality
                );
            };
            
            img.onerror = function() {
                reject(new Error('Image loading error'));
            };
        };
        
        reader.onerror = function() {
            reject(new Error('File reading error'));
        };
        
        reader.readAsDataURL(file);
    });
};

const PhotoUpload = () => {
    const [form] = Form.useForm();
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [fileList, setFileList] = useState({});
    const [orderIdEntered, setOrderIdEntered] = useState(false);
    const [receiverNameEntered, setReceiverNameEntered] = useState(false); // 新增收货人姓名状态
    const [formReady, setFormReady] = useState(false); // 表单是否准备好（订单号和收货人姓名都已填写）
    const [uploading, setUploading] = useState(false); // 是否有文件正在上传
    const [totalPhotos, setTotalPhotos] = useState(0); // 所有尺寸的照片总数
    const navigate = useNavigate(); // 用于页面导航
    const [uploadQueue, setUploadQueue] = useState([]); // 上传队列
    const [processingQueue, setProcessingQueue] = useState(false); // 是否正在处理队列
    const [uploadStats, setUploadStats] = useState({ total: 0, completed: 0, failed: 0 }); // 上传统计
    const [renderCount, setRenderCount] = useState(20); // 初始渲染数量限制
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false); // 是否显示离开确认弹窗
    const [activeUploads, setActiveUploads] = useState(0); // 当前活跃的上传任务数量
    const MAX_CONCURRENT_UPLOADS = 3; // 最大并发上传数量，从10改为3
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true); // 是否启用自动保存
    const autoSaveIntervalRef = useRef(null); // 自动保存定时器引用
    const [compressedImages, setCompressedImages] = useState({}); // 记录被压缩的图片
    const UPLOAD_TIMEOUT = 60000; // 上传超时时间（毫秒）

    // 照片尺寸配置
    const photoSizes = useMemo(() => [
        { label: '3寸', value: '3inch', ratio: 3/2 },
        { label: '4寸', value: '4inch', ratio: 3/4 },
        { label: '5寸', value: '5inch', ratio: 3/2 },
        { label: '6寸', value: '6inch', ratio: 3/2 },
        { label: '7寸', value: '7inch', ratio: 10/7 },
        { label: '8寸', value: '8inch', ratio: 4/3 },
        { label: '10寸', value: '10inch', ratio: 10/8 },
        { label: 'A4', value: 'A4', ratio: 210/297 }
    ], []);

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

    // 检查表单是否准备好
    useEffect(() => {
        setFormReady(orderIdEntered && receiverNameEntered);
    }, [orderIdEntered, receiverNameEntered]);

    // 处理订单号变化
    const handleOrderIdChange = (e) => {
        const value = e.target.value;
        
        // 检查是否是有效的淘宝订单号格式（通常是16-19位数字）
        const isTaobaoOrderId = /^\d{16,19}$/.test(value.trim());
        
        // 更新状态，让表单验证处理错误提示
        setOrderIdEntered(!!value.trim() && isTaobaoOrderId);
    };

    // 处理收货人姓名变化
    const handleReceiverNameChange = (e) => {
        const value = e.target.value;
        setReceiverNameEntered(!!value.trim());
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
    const getSizeRatios = useCallback((sizeValue) => {
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
    }, []);

    // 处理单个图片的加载和处理
    const processImage = async (file, size, customUid = null) => {
        return new Promise((resolve, reject) => {
            try {
                // 创建一个临时的文件URL用于初始显示，不读取整个文件内容到内存中
                const tempUrl = URL.createObjectURL(file);
                
                resolve({
                    uid: customUid || `-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    status: 'done',
                    url: tempUrl, // 临时本地预览URL
                    thumbUrl: tempUrl, // 临时本地缩略图
                    size: size,
                    originalFile: file
                });
            } catch (error) {
                reject(error);
            }
        });
    };

    // 处理文件删除
    const handleRemove = (file, size) => {
        const newFileList = { ...fileList };
        newFileList[size] = newFileList[size].filter(item => item.uid !== file.uid);
        setFileList(newFileList);
        
        // 如果删除的是失败的文件，更新上传统计数据
        if (file.status === 'error') {
            setUploadStats(prev => ({
                ...prev,
                failed: Math.max(0, prev.failed - 1),
                total: Math.max(0, prev.total - 1)
            }));
        }
        // 如果删除的是正在上传中的文件
        else if (file.status === 'uploading') {
            // 从上传队列中移除
            setUploadQueue(prevQueue => prevQueue.filter(item => item.fileId !== file.uid));
            
            // 如果是正在上传中的文件（已分配上传任务），减少活跃上传数量
            if (file.uploadStatus === 'uploading' || file.uploadStatus === 'preparing') {
                setActiveUploads(prev => Math.max(0, prev - 1));
            }
            
            // 更新上传统计
            setUploadStats(prev => ({
                ...prev,
                total: Math.max(0, prev.total - 1)
            }));
            
            // 为了让提示更加友好
            message.info(`已取消上传: ${file.name}`);
        }
        // 如果删除的是已上传完成的文件
        else if (file.status === 'done') {
            // 更新上传统计
            setUploadStats(prev => ({
                ...prev,
                completed: Math.max(0, prev.completed - 1),
                total: Math.max(0, prev.total - 1)
            }));
        }
        
        // 清理创建的 Object URL
        if (file.thumbUrl && file.thumbUrl.startsWith('blob:')) {
            URL.revokeObjectURL(file.thumbUrl);
        }
        return true;
    };

    // 处理上传队列
    useEffect(() => {
        console.log(`队列或活跃上传数量变化: 队列长度=${uploadQueue.length}, 活跃上传=${activeUploads}`);
        
        // 没有需要处理的队列或已达到最大并发数，不做任何处理
        if (uploadQueue.length === 0) {
            if (activeUploads === 0) {
                console.log('所有上传已完成，重置处理状态');
                setProcessingQueue(false);
            }
            return;
        }
        
        // 如果已达到最大并发数，等待当前上传完成
        if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
            return;
        }

        // 可以启动的新上传数量
        const availableSlots = MAX_CONCURRENT_UPLOADS - activeUploads;
        if (availableSlots <= 0) return;
        
        // 需要上传的文件数量
        const itemsToProcess = Math.min(availableSlots, uploadQueue.length);
        console.log(`可用槽位: ${availableSlots}, 将启动 ${itemsToProcess} 个新上传任务`);
        
        // 设置为处理中状态
        setProcessingQueue(true);
            
        // 从队列中取出要处理的项目
        const itemsToUpload = uploadQueue.slice(0, itemsToProcess);
        const remainingQueue = uploadQueue.slice(itemsToProcess);
        
        // 更新队列
        setUploadQueue(remainingQueue);
        
        // 一次性更新活跃上传数量
        setActiveUploads(current => current + itemsToProcess);
        
        // 单独处理每个上传任务
        itemsToUpload.forEach(item => {
            // 使用异步函数包装上传过程
            const uploadFile = async () => {
                console.log(`开始上传文件: ${item.file.name}`);
                try {
                    await processQueueItem(item);
                    console.log(`文件上传成功: ${item.file.name}`);
                } catch (err) {
                    console.error(`文件上传失败: ${item.file.name}`, err);
                } finally {
                    // 在finally块中减少活跃上传计数
                    setActiveUploads(current => {
                        const newCount = Math.max(0, current - 1);
                        console.log(`完成一项上传，当前活跃上传: ${newCount}`);
                        return newCount;
                    });
                }
            };
            
            // 立即执行上传
            uploadFile();
        });
    }, [uploadQueue, activeUploads, MAX_CONCURRENT_UPLOADS]);

    // 处理队列中的单个项目
    const processQueueItem = async (item) => {
        const { file, size, fileId, tempUrl, onSuccess, onError, onProgress, isCompressed, originalSize, compressedSize } = item;
        
        try {
            console.log(`实际开始上传: ${file.name}, 尺寸: ${size}, ID: ${fileId}, 当前活跃上传: ${activeUploads}/${MAX_CONCURRENT_UPLOADS}`);
            
            // 更新文件状态为准备上传中
            setFileList(prevFileList => {
                const updatedFileList = { ...prevFileList };
                const fileIndex = updatedFileList[size]?.findIndex(item => item.uid === fileId);
                if (fileIndex > -1) {
                    updatedFileList[size][fileIndex].uploadStatus = 'preparing';
                    return updatedFileList;
                }
                return prevFileList;
            });
            
            // 上传到服务器
            const key = `${form.getFieldValue('orderId')}/${size}/${file.name}`;
            
            // 设置上传超时处理
            let timeoutId = null;
            
            await new Promise((resolve, reject) => {
                // 设置上传超时定时器
                timeoutId = setTimeout(() => {
                    reject(new Error(`上传超时：${file.name} 上传时间超过${UPLOAD_TIMEOUT/1000}秒`));
                }, UPLOAD_TIMEOUT);
                
                uploadToServer({
                    file: file,
                    key: key,
                    onProgress: (progressData) => {
                        const percent = progressData.percent * 100;
                        onProgress({ percent });
                        
                        // 使用函数式更新确保获取最新的fileList状态
                        setFileList(prevFileList => {
                            const updatedFileList = { ...prevFileList };
                            const fileIndex = updatedFileList[size]?.findIndex(item => item.uid === fileId);
                            if (fileIndex > -1) {
                                // 当进度开始增加时，更新状态为正在上传
                                if (percent > 0 && updatedFileList[size][fileIndex].uploadStatus !== 'uploading') {
                                    updatedFileList[size][fileIndex].uploadStatus = 'uploading';
                                }
                                updatedFileList[size][fileIndex].percent = percent;
                                return updatedFileList;
                            }
                            return prevFileList;
                        });
                    },
                    onSuccess: (data) => {
                        // 清除超时定时器
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                        }
                        
                        // 获取上传后的URL
                        const imageUrl = data.url;
                        // 使用img-proxy代理的原图URL作为缩略图和预览
                        const thumbUrl = IMG_PROXY_URL ? IMG_PROXY_URL + encodeURIComponent(imageUrl) : imageUrl;
                        // 使用img-proxy代理的原图URL作为预览
                        const proxyUrl = IMG_PROXY_URL ? IMG_PROXY_URL + encodeURIComponent(imageUrl) : imageUrl;
                        
                        console.log(`上传成功完成: ${file.name}, URL: ${imageUrl.substring(0, 50)}..., 代理URL: ${proxyUrl.substring(0, 50)}..., 队列: ${uploadQueue.length}, 活跃: ${activeUploads}/${MAX_CONCURRENT_UPLOADS}`);
                        
                        // 使用函数式更新确保获取最新的fileList状态
                        setFileList(prevFileList => {
                            const updatedFileList = { ...prevFileList };
                            const fileIndex = updatedFileList[size]?.findIndex(item => item.uid === fileId);
                            if (fileIndex > -1) {
                                updatedFileList[size][fileIndex].status = 'done';
                                updatedFileList[size][fileIndex].cosUrl = imageUrl; // 保存原始服务器URL用于提交
                                updatedFileList[size][fileIndex].url = proxyUrl; // 使用代理URL作为预览
                                updatedFileList[size][fileIndex].thumbUrl = thumbUrl; // 使用代理URL作为缩略图
                                updatedFileList[size][fileIndex].isCompressed = isCompressed; // 标记是否被压缩
                                
                                if (isCompressed) {
                                    // 保存压缩信息
                                    updatedFileList[size][fileIndex].originalSize = originalSize;
                                    updatedFileList[size][fileIndex].compressedSize = compressedSize;
                                }
                                
                                // 确保成功回调只传递正确的数据
                                onSuccess({
                                    ...data,
                                    uid: fileId,
                                    name: file.name,
                                    status: 'done',
                                    url: proxyUrl, // 使用代理URL
                                    thumbUrl: thumbUrl, // 使用代理URL作为缩略图
                                    cosUrl: imageUrl,
                                    isCompressed: isCompressed
                                });
                                
                                return updatedFileList;
                            } else {
                                // 如果找不到对应的文件，可能是状态已经被清除，重新添加
                                console.warn(`未找到上传文件在状态中: ${file.name}, ID: ${fileId}, 尝试重新添加`);
                                const newFile = {
                                    uid: fileId,
                                    name: file.name,
                                    status: 'done',
                                    url: proxyUrl, // 使用代理URL
                                    thumbUrl: thumbUrl, // 使用代理URL作为缩略图
                                    cosUrl: imageUrl,
                                    size: size,
                                    isCompressed: isCompressed
                                };
                                
                                if (isCompressed) {
                                    // 保存压缩信息
                                    newFile.originalSize = originalSize;
                                    newFile.compressedSize = compressedSize;
                                }
                                
                                if (!updatedFileList[size]) {
                                    updatedFileList[size] = [];
                                }
                                updatedFileList[size] = [...updatedFileList[size], newFile];
                                
                                onSuccess(newFile);
                                return updatedFileList;
                            }
                        });
                        
                        // 如果图片被压缩了，更新压缩图片统计
                        if (isCompressed) {
                            setCompressedImages(prev => {
                                const newCompressedImages = { ...prev };
                                if (!newCompressedImages[size]) {
                                    newCompressedImages[size] = [];
                                }
                                newCompressedImages[size].push({
                                    uid: fileId,
                                    name: file.name,
                                    originalSize,
                                    compressedSize
                                });
                                return newCompressedImages;
                            });
                        }
                        
                        // 更新上传统计
                        setUploadStats(prev => ({
                            ...prev,
                            completed: prev.completed + 1
                        }));
                        
                        resolve();
                    },
                    onError: (err) => {
                        // 清除超时定时器
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutId = null;
                        }
                        
                        console.error(`上传失败: ${file.name}, 错误: `, err);
                        message.error(`上传失败: ${file.name}`);
                        
                        // 使用函数式更新确保获取最新的fileList状态
                        setFileList(prevFileList => {
                            const updatedFileList = { ...prevFileList };
                            const fileIndex = updatedFileList[size]?.findIndex(item => item.uid === fileId);
                            if (fileIndex > -1) {
                                updatedFileList[size][fileIndex].status = 'error';
                                return updatedFileList;
                            }
                            return prevFileList;
                        });
                        
                        onError(err);
                        
                        // 更新上传统计
                        setUploadStats(prev => ({
                            ...prev,
                            failed: prev.failed + 1
                        }));
                        
                        reject(err);
                    }
                });
            });
        } catch (error) {
            console.error(`处理队列项目失败: ${file.name}`, error);
            
            // 处理上传超时错误
            if (error.message && error.message.includes('上传超时')) {
                message.error(`${file.name} 上传超时，请重试或检查网络连接`);
            }
            
            // 更新上传统计
            setUploadStats(prev => ({
                ...prev,
                failed: prev.failed + 1
            }));
            throw error; // 继续抛出错误以触发finally块
        }
    };

    // 检查上传状态
    useEffect(() => {
        const checkUploadStatus = () => {
            const { total, completed, failed } = uploadStats;
            console.log(`上传状态检查: 总计=${total}, 已完成=${completed}, 失败=${failed}, 活跃上传=${activeUploads}, 队列长度=${uploadQueue.length}`);
            
            // 所有文件都已处理完毕
            if (total > 0 && completed + failed === total) {
                setUploading(false);
                if (failed === 0) {
                    message.success(`所有文件上传完成！`);
                } else {
                    message.warning(`上传完成，但有 ${failed} 个文件上传失败`);
                }
            } else {
                // 确保uploading状态与实际情况一致
                setUploading(total > 0 && (total > completed + failed || activeUploads > 0 || uploadQueue.length > 0));
            }
        };
        
        checkUploadStatus();
    }, [uploadStats, activeUploads, uploadQueue]);

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
            
            return true;
        },
        customRequest: async ({ file, onSuccess, onError, onProgress }) => {
            try {
                console.log(`开始处理上传请求: ${file.name}, 尺寸: ${size}`);
                // 设置上传状态为true
                setUploading(true);
                
                // 生成唯一的文件ID
                const fileId = `-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // 检查文件大小是否需要压缩
                let processedFile;
                let fileToUpload = file;
                let isCompressed = false;
                let originalSize = 0;
                let compressedSize = 0;
                
                // 只有当文件大于20MB时才压缩
                if (file.size / 1024 / 1024 > 20) {
                    // 显示压缩进度提示
                    const loadingMessage = message.loading(`${file.name} 超过20MB，正在压缩...`, 0);
                    console.log(`开始压缩大文件: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
                    
                    try {
                        // 压缩图片，设置阈值为20MB和80%的质量
                        const compressResult = await compressImage(file, 20, 0.8);
                        fileToUpload = compressResult.file;
                        isCompressed = compressResult.compressed;
                        
                        if (isCompressed) {
                            originalSize = compressResult.originalSize;
                            compressedSize = compressResult.compressedSize;
                            
                            console.log(`文件压缩成功: ${file.name}, 原始大小: ${originalSize.toFixed(2)}MB, 压缩后: ${compressedSize.toFixed(2)}MB`);
                            message.destroy(); // 关闭加载提示
                            message.success(`${file.name} 压缩成功: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB`);
                        } else {
                            message.destroy(); // 关闭加载提示
                        }
                    } catch (compressError) {
                        console.error(`文件压缩失败: ${file.name}`, compressError);
                        message.destroy(); // 关闭加载提示
                        message.error(`压缩 ${file.name} 失败，将使用原始文件`);
                        // 继续使用原始文件
                    }
                }
                
                try {
                    // 先处理图片获取预览
                    processedFile = await processImage(fileToUpload, size, fileId);
                    
                    // 使用函数式更新确保获取最新的fileList状态
                    setFileList(prevFileList => {
                        const newFileList = { ...prevFileList };
                        if (!newFileList[size]) {
                            newFileList[size] = [];
                        }
                        
                        if (newFileList[size].length >= 1000) {
                            console.warn(`尺寸 ${size} 已达到1000张上限，拒绝上传: ${file.name}`);
                            message.error('已达到1000张上限！');
                            onError(new Error('已达到上传上限'));
                            setUploading(false);
                            return prevFileList; // 不更新状态
                        }
                        
                        // 添加到本地预览列表 - 立即显示本地预览
                        processedFile.status = 'uploading'; // 设置为上传中状态
                        processedFile.uploadStatus = 'waiting'; // 设置初始状态为等待上传
                        if (isCompressed) {
                            processedFile.isCompressed = true;
                            processedFile.originalSize = originalSize;
                            processedFile.compressedSize = compressedSize;
                        }
                        newFileList[size] = [...(newFileList[size] || []), processedFile];
                        return newFileList;
                    });
                    
                    // 更新上传统计
                    setUploadStats(prev => ({
                        ...prev,
                        total: prev.total + 1
                    }));
                    
                    console.log(`添加到上传队列: ${file.name}, ID: ${fileId}, 当前队列长度: ${uploadQueue.length}`);
                    
                    // 添加到上传队列，而不是立即上传
                    setUploadQueue(prev => [...prev, {
                        file: fileToUpload, // 使用可能已压缩的文件
                        size,
                        fileId,
                        tempUrl: processedFile.url, // 使用临时URL
                        onSuccess,
                        onError,
                        onProgress,
                        isCompressed,
                        originalSize,
                        compressedSize
                    }]);
                    
                } catch (processError) {
                    console.error(`处理图片失败: ${file.name}`, processError);
                    message.error(`处理图片 ${file.name} 失败`);
                    onError(processError);
                    setUploading(false);
                }
            } catch (error) {
                console.error(`处理上传请求失败: ${file.name}`, error);
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
        },
        itemRender: (originNode, file, currFileList, actions) => {
            // 添加压缩标记到文件项
            if (file.isCompressed) {
                return (
                    <div>
                        {originNode}
                        <div style={{ 
                            position: 'absolute', 
                            top: '6px', 
                            right: '40px', 
                            background: '#faad14',
                            color: '#fff',
                            padding: '0 6px',
                            fontSize: '10px',
                            borderRadius: '2px',
                            lineHeight: '16px'
                        }}>
                            已压缩
                        </div>
                    </div>
                );
            }
            return originNode;
        }
    });

    // 自定义上传列表组件 - 处理横竖图问题
    const CustomUploadList = ({ files, size, onPreview, onRemove }) => {
        if (!files || files.length === 0) {
            return null;
        }

        // 给预览区域添加自定义样式，确保缩略图大小一致
        return (
            <div className="custom-upload-list" style={{ marginTop: '16px' }}>
                <List
                    grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 4, xl: 6, xxl: 8 }}
                    dataSource={files}
                    renderItem={file => (
                        <List.Item>
                            <div style={{ 
                                border: '1px solid #d9d9d9', 
                                borderRadius: '4px', 
                                padding: '8px',
                                position: 'relative',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {/* 图片容器固定宽高比例 */}
                                <div style={{ 
                                    position: 'relative',
                                    width: '100%',
                                    paddingBottom: '100%', // 1:1 的宽高比
                                    overflow: 'hidden',
                                    backgroundColor: '#f0f2f5',
                                    marginBottom: '8px'
                                }}>
                                    {/* 图片，使用绝对定位确保等比缩放 */}
                                    <div style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <img 
                                            src={file.thumbUrl || file.url} 
                                            alt={file.name}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain'
                                            }}
                                            onError={(e) => {
                                                console.error('加载图片失败:', file.name);
                                                // 图片加载失败时尝试使用原始URL
                                                if (file.cosUrl && e.target.src !== file.cosUrl) {
                                                    e.target.src = file.cosUrl;
                                                }
                                            }}
                                        />
                                        {/* 优化上传状态提示，区分待上传、准备上传和正在上传 */}
                                        {file.status === 'uploading' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'rgba(0,0,0,0.65)'
                                            }}>
                                                {file.uploadStatus === 'uploading' ? (
                                                    // 正在上传状态
                                                    <>
                                                        <Spin size="default" />
                                                        <div style={{ 
                                                            color: '#fff',
                                                            marginTop: '8px',
                                                            fontSize: '12px',
                                                            textAlign: 'center'
                                                        }}>
                                                            正在上传...
                                                        </div>
                                                    </>
                                                ) : file.uploadStatus === 'preparing' ? (
                                                    // 准备上传状态
                                                    <>
                                                        <Spin size="small" />
                                                        <div style={{ 
                                                            color: '#fff',
                                                            marginTop: '8px',
                                                            fontSize: '12px',
                                                            textAlign: 'center'
                                                        }}>
                                                            准备上传...
                                                        </div>
                                                    </>
                                                ) : (
                                                    // 等待上传状态
                                                    <>
                                                        <div style={{ 
                                                            color: '#fff',
                                                            fontSize: '12px',
                                                            textAlign: 'center',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center'
                                                        }}>
                                                            <UploadOutlined style={{ fontSize: '22px', marginBottom: '8px' }} />
                                                            等待上传...
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {file.status === 'error' && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'rgba(255,77,79,0.65)'
                                            }}>
                                                <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#fff' }} />
                                                <div style={{ color: '#fff', marginTop: '8px', fontSize: '12px' }}>
                                                    上传失败
                                                </div>
                                            </div>
                                        )}
                                        {/* 压缩标记 */}
                                        {file.isCompressed && (
                                            <div style={{ 
                                                position: 'absolute', 
                                                top: '8px', 
                                                right: '8px', 
                                                background: '#faad14',
                                                color: '#fff',
                                                padding: '0 6px',
                                                fontSize: '10px',
                                                borderRadius: '2px',
                                                lineHeight: '18px'
                                            }}>
                                                已压缩
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* 文件名和操作按钮区域 */}
                                <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', wordBreak: 'break-all', marginBottom: '4px' }}>
                                    {file.name.length > 15 ? `${file.name.substr(0, 12)}...` : file.name}
                                </div>
                                
                                {/* 操作按钮 */}
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-around',
                                    marginTop: 'auto'
                                }}>
                                    <Button 
                                        type="text" 
                                        size="small" 
                                        icon={<EyeOutlined />} 
                                        onClick={() => onPreview(file, size)}
                                    />
                                    <Button 
                                        type="text" 
                                        size="small" 
                                        danger 
                                        icon={<DeleteOutlined />} 
                                        onClick={() => onRemove(file, size)}
                                    />
                                </div>
                            </div>
                        </List.Item>
                    )}
                />
            </div>
        );
    };

    // 添加全局样式
    useEffect(() => {
        // 添加动画CSS和上传列表样式修复
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.2); }
                70% { box-shadow: 0 0 0 8px rgba(255, 77, 79, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
            }
            
            @keyframes modalZoomIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            
            .leave-confirm-modal .ant-modal-content {
                animation: modalZoomIn 0.3s;
            }
            
            .warning-box {
                animation: pulse 2s infinite;
            }

            /* 修复上传组件样式问题 */
            .ant-upload-list-picture-card-container {
                width: 104px !important;
                height: 104px !important;
                margin-right: 8px;
                margin-bottom: 8px;
            }

            .ant-upload-list-picture-card .ant-upload-list-item {
                width: 100%;
                height: 100%;
                padding: 8px;
            }

            .ant-upload-list-picture-card .ant-upload-list-item-thumbnail {
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .ant-upload-list-picture-card .ant-upload-list-item-thumbnail img {
                display: block;
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                object-fit: contain;
            }
        `;
        document.head.appendChild(style);
        
        // 在组件卸载时移除样式
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // 处理图片预览
    const onPreview = async (file, size) => {
        let previewUrl = null;
        try {
            // 如果有原始服务端URL，使用代理URL打开
            if (file.cosUrl) {
                const proxyUrl = IMG_PROXY_URL ? IMG_PROXY_URL + encodeURIComponent(file.cosUrl) : file.cosUrl;
                const imgWindow = window.open(proxyUrl);
                if (imgWindow) {
                    imgWindow.onerror = () => {
                        message.error('预览图片失败，请重试');
                    };
                }
                return;
            }
            
            // 如果没有服务端URL，回退到本地预览
            let src = file.url || file.thumbUrl;
            if (!src && file.originFileObj) {
                // 创建一个临时的文件URL
                previewUrl = URL.createObjectURL(file.originFileObj);
                src = previewUrl;
            }
            
            if (src) {
                const imgWindow = window.open(src);
                if (imgWindow) {
                    imgWindow.onerror = () => {
                        message.error('预览图片失败，请重试');
                    };
                    // 如果是临时URL并且是新创建的，在窗口关闭时释放资源
                    if (previewUrl) {
                        imgWindow.onunload = () => {
                            URL.revokeObjectURL(previewUrl);
                        };
                    }
                }
            } else {
                message.error('无法预览此图片');
            }
        } catch (error) {
            console.error('预览图片失败:', error);
            message.error('预览图片失败，请重试');
            // 清理资源
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        }
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
                receiver: values.receiver, // 修改为使用 values.receiver
                remark: values.remark,
                photos: []
            };
            
            // 添加各尺寸的照片数据
            selectedSizes.forEach(size => {
                try {
                    // 使用cosUrl而不是url，确保使用服务器上的URL
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

    // 添加页面离开提醒
    useEffect(() => {
        // 只有在有已完成上传的照片或正在上传照片时，才添加离开确认
        const hasCompletedPhotos = Object.values(fileList).some(files => 
            Array.isArray(files) && files.some(file => file.status === 'done')
        );
        const hasUploadingPhotos = uploading;
        
        if (!hasCompletedPhotos && !hasUploadingPhotos) {
            // 如果没有已上传的照片也没有正在上传的照片，不需要添加离开确认
            return;
        }
        
        // 捕获刷新和关闭页面的行为
        const handleBeforeUnload = (e) => {
            const message = hasUploadingPhotos 
                ? '有照片正在上传中，离开页面将中断上传。确定要离开吗？' 
                : '您已上传照片但尚未提交，离开页面将丢失所有数据。确定要离开吗？';
            
            // 在现代浏览器中，自定义消息通常不显示，浏览器会使用默认消息
            e.preventDefault();
            e.returnValue = message;
            return message;
        };
        
        // 使用visibilitychange和pagehide事件检测页面离开
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // 用户可能正在离开页面或者切换标签
                // 由于这种情况可能只是切换标签而不是离开，我们不显示弹窗
            }
        };
        
        // 监听keydown事件，捕获F5和Ctrl+R刷新组合键
        const handleKeyDown = (e) => {
            // F5键或Ctrl+R组合键
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                setShowLeaveConfirm(true);
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };
        
        // 监听点击浏览器刷新按钮或导航回退按钮
        const handlePopState = (e) => {
            // 当用户点击浏览器的后退按钮时
            setShowLeaveConfirm(true);
            // 阻止默认行为
            const event = e || window.event;
            if (event) {
                event.preventDefault();
                window.history.pushState(null, '', window.location.pathname);
            }
            return false;
        };
        
        // 监听点击浏览器的前进/后退按钮
        window.history.pushState(null, '', window.location.pathname);
        window.addEventListener('popstate', handlePopState);
        
        // 添加事件监听器
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('keydown', handleKeyDown);
        
        // 在组件卸载时移除事件监听器
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [fileList, uploading]);
    
    // 判断是否需要显示离开确认
    const shouldShowLeaveConfirm = () => {
        // 检查是否有已上传的照片
        const hasCompletedPhotos = Object.values(fileList).some(files => 
            Array.isArray(files) && files.some(file => file.status === 'done')
        );
        return hasCompletedPhotos || uploading;
    };
    
    // 处理页面内部导航的确认弹窗
    const handleLeaveConfirmOk = () => {
        setShowLeaveConfirm(false);
        // 用户确认离开，执行页面刷新
        // 添加一个小延时，让Modal有时间关闭，提升用户体验
        setTimeout(() => {
            window.location.reload();
        }, 300);
    };

    // 处理临时保存数据并刷新
    const handleSaveAndRefresh = () => {
        try {
            // 将已上传照片的信息保存到localStorage
            const photoData = {};
            
            // 只保存已成功上传的照片信息
            Object.entries(fileList).forEach(([size, files]) => {
                if (Array.isArray(files) && files.length > 0) {
                    // 只保存已完成上传的照片
                    const doneFiles = files.filter(file => file.status === 'done');
                    if (doneFiles.length > 0) {
                        photoData[size] = doneFiles.map(file => ({
                            uid: file.uid,
                            name: file.name,
                            cosUrl: file.cosUrl,
                            url: file.url,
                            thumbUrl: file.thumbUrl,
                            size: file.size
                        }));
                    }
                }
            });
            
            // 保存表单数据
            const formData = {
                receiver: form.getFieldValue('receiver'),
                orderId: form.getFieldValue('orderId'),
                sizes: selectedSizes,
                remark: form.getFieldValue('remark')
            };
            
            // 将数据保存到localStorage
            localStorage.setItem('photoUploadData', JSON.stringify({
                formData,
                photoData,
                timestamp: Date.now()
            }));
            
            // 显示保存成功消息
            message.success('数据已临时保存，刷新页面后可恢复', 1, () => {
                // 关闭弹窗
                setShowLeaveConfirm(false);
                
                // 刷新页面
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            });
        } catch (error) {
            console.error('保存数据失败:', error);
            message.error('保存数据失败，请直接刷新或尝试提交');
            
            // 关闭弹窗
            setShowLeaveConfirm(false);
            
            // 刷新页面
            setTimeout(() => {
                window.location.reload();
            }, 300);
        }
    };

    const handleLeaveConfirmCancel = () => {
        setShowLeaveConfirm(false);
    };

    // 自定义离开确认弹窗
    const renderLeaveConfirmModal = () => {
        // 获取已上传照片的数量（只计算状态为done的）
        const completedPhotoCount = Object.values(fileList).reduce((count, files) => {
            if (Array.isArray(files)) {
                return count + files.filter(file => file.status === 'done').length;
            }
            return count;
        }, 0);
        
        // 获取上传中照片的数量
        const uploadingPhotoCount = uploadStats.total - uploadStats.completed - uploadStats.failed;
        
        return (
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <WarningOutlined style={{ color: '#ff4d4f', fontSize: '24px', marginRight: '12px' }} />
                        <span style={{ fontSize: '18px', fontWeight: '600' }}>提示：即将丢失上传数据！</span>
                    </div>
                }
                open={showLeaveConfirm && shouldShowLeaveConfirm()}
                onOk={handleLeaveConfirmOk}
                onCancel={handleLeaveConfirmCancel}
                okText="直接刷新"
                cancelText="取消"
                footer={[
                    <Button key="cancel" onClick={handleLeaveConfirmCancel} style={{ 
                        fontWeight: '500', 
                        borderRadius: '6px',
                        paddingLeft: '20px',
                        paddingRight: '20px',
                    }}>
                        取消
                    </Button>,
                    !uploading && completedPhotoCount > 0 ? (
                        <Button 
                            key="save" 
                            type="primary"
                            onClick={handleSaveAndRefresh}
                            style={{ 
                                fontWeight: '500',
                                borderRadius: '6px',
                                paddingLeft: '20px',
                                paddingRight: '20px',
                                marginRight: '8px',
                                background: '#52c41a',
                                border: 'none'
                            }}
                        >
                            临时保存并刷新
                        </Button>
                    ) : null,
                    <Button 
                        key="submit" 
                        type="primary" 
                        danger
                        onClick={handleLeaveConfirmOk}
                        style={{ 
                            fontWeight: '500',
                            borderRadius: '6px',
                            paddingLeft: '20px',
                            paddingRight: '20px',
                        }}
                    >
                        直接刷新
                    </Button>
                ]}
                centered
                closable={false}
                maskClosable={false}
                keyboard={false}
                className="leave-confirm-modal"
                styles={{
                    header: {
                        padding: '20px 24px',
                        borderBottom: '1px solid #f0f0f0',
                        marginBottom: 0,
                    },
                    body: {
                        padding: '32px 24px 24px',
                        fontSize: '16px',
                    },
                    footer: {
                        borderTop: '1px solid #f0f0f0',
                        padding: '16px 24px',
                    },
                    mask: {
                        backdropFilter: 'blur(6px)',
                        background: 'rgba(0, 0, 0, 0.45)'
                    },
                    content: {
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        minWidth: '460px',
                        animation: 'modalZoomIn 0.3s',
                    }
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div 
                        className="warning-box"
                        style={{ 
                            width: '100%', 
                            padding: '24px 30px', 
                            background: 'rgba(255, 77, 79, 0.08)', 
                            borderRadius: '12px',
                            marginBottom: '20px',
                            border: '1px solid rgba(255, 77, 79, 0.2)',
                        }}
                    >
                        {uploading ? (
                            <p style={{ margin: 0, lineHeight: '1.8', fontSize: '16px', color: '#444' }}>
                                <span style={{ fontWeight: '600', color: '#ff4d4f', fontSize: '17px', display: 'block', marginBottom: '8px' }}>警告：上传进行中！</span>
                                当前还有 <strong style={{ color: '#ff4d4f' }}>{uploadingPhotoCount}</strong> 张照片正在上传中，
                                离开页面将<strong style={{ color: '#ff4d4f' }}>立即中断所有上传进程</strong>。<br />
                                所有正在上传的照片都将<strong style={{ color: '#ff4d4f' }}>永久丢失</strong>！
                            </p>
                        ) : (
                            <p style={{ margin: 0, lineHeight: '1.8', fontSize: '16px', color: '#444' }}>
                                <span style={{ fontWeight: '600', color: '#ff4d4f', fontSize: '17px', display: 'block', marginBottom: '8px' }}>警告：未保存的数据！</span>
                                您已上传了 <strong style={{ color: '#ff4d4f' }}>{completedPhotoCount}</strong> 张照片，但尚未提交。<br />
                                离开页面将<strong style={{ color: '#ff4d4f' }}>永久丢失所有已上传的照片</strong>！
                            </p>
                        )}
                    </div>
                    
                    {!uploading && completedPhotoCount > 0 ? (
                        <div style={{ 
                            padding: '16px 20px', 
                            background: '#f6ffed', 
                            borderRadius: '10px',
                            width: '100%',
                            borderLeft: '4px solid #52c41a',
                            marginBottom: '16px'
                        }}>
                            <p style={{ margin: 0, lineHeight: '1.6', color: '#444', fontSize: '15px' }}>
                                <strong style={{ color: '#52c41a' }}>临时保存选项：</strong><br />
                                您可以"临时保存并刷新"保留当前已上传的 {completedPhotoCount} 张照片，刷新后可以继续操作。
                            </p>
                        </div>
                    ) : null}
                    
                    <div style={{ 
                        padding: '16px 20px', 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        width: '100%',
                        borderLeft: '4px solid #1890ff'
                    }}>
                        <p style={{ margin: 0, lineHeight: '1.6', color: '#666', fontSize: '15px' }}>
                            <strong style={{ color: '#1890ff' }}>建议操作：</strong><br />
                            • {uploading ? '等待所有照片上传完成' : '点击"提交"按钮保存已上传的照片'}<br />
                            • 完成后再刷新或离开页面
                        </p>
                    </div>
                </div>
            </Modal>
        );
    };
    
    // 从localStorage恢复数据
    useEffect(() => {
        try {
            // 检查是否有保存的数据
            const savedData = localStorage.getItem('photoUploadData');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                const { formData, photoData, timestamp } = parsed;
                
                // 检查数据是否过期（24小时过期）
                const now = Date.now();
                const expirationTime = 24 * 60 * 60 * 1000; // 24小时
                if (now - timestamp > expirationTime) {
                    // 数据已过期，清除
                    localStorage.removeItem('photoUploadData');
                    return;
                }
                
                // 验证数据有效性
                if (!formData || !photoData || typeof photoData !== 'object') {
                    console.error('保存的数据无效');
                    localStorage.removeItem('photoUploadData');
                    return;
                }
                
                // 计算照片总数
                const photoCount = Object.values(photoData).reduce((count, files) => {
                    if (Array.isArray(files)) {
                        return count + files.length;
                    }
                    return count;
                }, 0);
                
                if (photoCount === 0) {
                    // 没有照片数据，直接清除
                    localStorage.removeItem('photoUploadData');
                    return;
                }
                
                // 显示恢复确认对话框
                // 使用更加友好的UI
                Modal.confirm({
                    title: (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <ExclamationCircleOutlined style={{ color: '#1890ff', fontSize: '22px', marginRight: '10px' }} />
                            <span style={{ fontSize: '16px', fontWeight: 600 }}>发现未提交的照片数据</span>
                        </div>
                    ),
                    icon: null,
                    content: (
                        <div style={{ padding: '10px 0' }}>
                            <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                                检测到您上次有 <strong style={{ color: '#1890ff' }}>{photoCount}</strong> 张未提交的照片数据。
                            </p>
                            
                            <div style={{ 
                                padding: '12px 16px',
                                background: '#f5f5f5',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#666',
                                marginBottom: '10px'
                            }}>
                                <div><strong>表单信息：</strong></div>
                                <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>收货人：</span>
                                    <span style={{ fontWeight: 500 }}>{formData.receiver || '未填写'}</span>
                                </div>
                                <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>订单号：</span>
                                    <span style={{ fontWeight: 500 }}>{formData.orderId || '未填写'}</span>
                                </div>
                                <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>照片尺寸：</span>
                                    <span style={{ fontWeight: 500 }}>
                                        {Array.isArray(formData.sizes) && formData.sizes.length > 0 
                                            ? formData.sizes.map(size => {
                                                const sizeObj = photoSizes.find(s => s.value === size);
                                                return sizeObj ? sizeObj.label : size;
                                              }).join('、')
                                            : '未选择'}
                                    </span>
                                </div>
                                
                                <div style={{ marginTop: '8px' }}>
                                    <span>保存时间：</span>
                                    <span style={{ fontWeight: 500 }}>
                                        {new Date(timestamp).toLocaleString('zh-CN')}
                                    </span>
                                </div>
                            </div>
                            
                            <p style={{ fontSize: '14px', color: '#666' }}>
                                是否要恢复这些数据继续操作？
                            </p>
                        </div>
                    ),
                    okText: '恢复数据',
                    cancelText: '不需要',
                    okButtonProps: {
                        style: {
                            background: '#1890ff',
                            borderColor: '#1890ff',
                        }
                    },
                    centered: true,
                    styles: {
                        body: { padding: '16px 24px 0' },
                        mask: { backdropFilter: 'blur(4px)' },
                        content: {
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
                        }
                    },
                    onOk() {
                        try {
                            // 先恢复表单数据
                            if (formData) {
                                form.setFieldsValue(formData);
                                
                                // 恢复选中的尺寸
                                if (formData.sizes && Array.isArray(formData.sizes)) {
                                    setSelectedSizes(formData.sizes);
                                }
                                
                                // 设置表单已准备好状态
                                setOrderIdEntered(!!formData.orderId);
                                setReceiverNameEntered(!!formData.receiver);
                            }
                            
                            // 恢复照片数据（稍微延迟以确保表单已恢复）
                            setTimeout(() => {
                                setFileList(photoData);
                                message.success(`已恢复 ${photoCount} 张照片数据`);
                                
                                // 清除localStorage中的数据
                                localStorage.removeItem('photoUploadData');
                            }, 100);
                        } catch (error) {
                            console.error('恢复数据失败:', error);
                            message.error('恢复数据失败，请重新上传');
                            localStorage.removeItem('photoUploadData');
                        }
                    },
                    onCancel() {
                        // 清除localStorage中的数据
                        localStorage.removeItem('photoUploadData');
                        message.info('已放弃恢复，您可以重新上传照片');
                    }
                });
            }
        } catch (error) {
            console.error('恢复数据失败:', error);
            // 清除可能损坏的数据
            localStorage.removeItem('photoUploadData');
        }
    }, []);

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

    // 优化渲染 - 只渲染有限数量的文件，并将上传按钮放在照片列表的最后面
    const renderFileList = (size) => {
        const files = fileList[size] || [];
        const totalFiles = files.length;
        
        // 创建一个上传按钮组件
        const renderUploadButton = () => (
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
        );
        
        // 如果文件数量少，直接渲染全部
        if (totalFiles <= renderCount) {
        return (
            <div>
                    {/* 使用自定义列表组件显示上传的文件 */}
                    <CustomUploadList 
                        files={files} 
                        size={size}
                        onPreview={onPreview}
                        onRemove={handleRemove}
                    />
                    
                    {/* 上传按钮放在最后面 */}
                    <div style={{ marginTop: '16px' }}>
                <Upload
                    listType="picture-card"
                            fileList={[]}
                    {...handleUpload(size)}
                    onPreview={(file) => onPreview(file, size)}
                    onChange={(info) => handleChange(size, info)}
                    onRemove={(file) => handleRemove(file, size)}
                    multiple={true}
                    directory={false}
                    customRequest={handleUpload(size).customRequest}
                    disabled={!formReady}
                            showUploadList={false}
                        >
                            {(files.length || 0) >= 1000 ? null : renderUploadButton()}
                        </Upload>
                            </div>
                        </div>
            );
        }
        
        // 如果文件数量多，使用虚拟列表
        const visibleFiles = files.slice(0, renderCount);
        const hiddenCount = totalFiles - renderCount;
        
        return (
            <div>
                {/* 使用自定义列表组件显示上传的文件 */}
                <CustomUploadList 
                    files={visibleFiles} 
                    size={size}
                    onPreview={onPreview}
                    onRemove={handleRemove}
                />
                
                {hiddenCount > 0 && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '12px', 
                        background: '#f9f9f9',
                        borderRadius: '8px',
                        marginTop: '12px',
                        marginBottom: '16px'
                    }}>
                        <Button 
                            type="link" 
                            onClick={() => setRenderCount(prev => prev + 20)}
                        >
                            显示更多（还有 {hiddenCount} 张未显示）
                        </Button>
                    </div>
                )}
                
                {/* 上传按钮放在最后面 */}
                <div style={{ marginTop: '16px' }}>
                    <Upload
                        listType="picture-card"
                        fileList={[]}
                        {...handleUpload(size)}
                        onPreview={(file) => onPreview(file, size)}
                        onChange={(info) => handleChange(size, info)}
                        onRemove={(file) => handleRemove(file, size)}
                        multiple={true}
                        directory={false}
                        customRequest={handleUpload(size).customRequest}
                        disabled={!formReady}
                        showUploadList={false}
                    >
                        {(files.length || 0) >= 1000 ? null : renderUploadButton()}
                    </Upload>
                </div>
            </div>
        );
    };

    // 上传进度指示器
    const renderUploadProgress = () => {
        const { total, completed, failed } = uploadStats;
        const inProgress = total - completed - failed;
        
        if (total === 0) return null;
        
        return (
            <div style={{ 
                marginTop: '16px', 
                padding: '16px', 
                background: '#f0f8ff', 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span>上传进度：{completed + failed} / {total}</span>
                    <span>{Math.round((completed + failed) / total * 100)}%</span>
                </div>
                <div style={{ 
                    height: '8px', 
                    background: '#e6e6e6', 
                    borderRadius: '4px', 
                    overflow: 'hidden' 
                }}>
                    <div style={{ 
                        width: `${(completed + failed) / total * 100}%`, 
                        height: '100%', 
                        background: failed > 0 ? 'linear-gradient(90deg, #52c41a, #faad14)' : '#52c41a',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#666'
                }}>
                    <span>成功: {completed}</span>
                    <span>失败: {failed}</span>
                    <span>进行中: {inProgress}</span>
                </div>
            </div>
        );
    };

    return (
        <Layout style={layoutStyle}>
            <Header style={headerStyle}>
                <div style={headerPatternStyle} />
                <CameraOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <h1 style={titleStyle}>田田洗照片</h1>
                {/* <p style={subtitleStyle}>自己开发的一个收集工具，服务器带宽有限，上传照片请耐心等待下哦</p> */}
            </Header>

            {/* 重要提示区域 */}
            <div style={{
                maxWidth: '900px',
                margin: '0 auto 24px',
                padding: '20px 24px',
                background: '#fff8e6',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(250, 173, 20, 0.12)',
                border: '1px solid #ffe58f'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <WarningOutlined style={{ fontSize: '24px', color: '#faad14', marginRight: '10px' }} />
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#d48806' }}>重要提示</h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '24px' }}>
                    <li style={{ marginBottom: '12px', color: '#ad6800', fontSize: '15px', fontWeight: '500', lineHeight: '1.6' }}>
                        <span style={{ backgroundColor: '#ffec3d', padding: '0 5px' }}>上传过程中一定不要刷新页面</span>，否则会需要再来一遍。
                    </li>
                    <li style={{ marginBottom: '12px', color: '#5c4e00', fontSize: '14px', lineHeight: '1.6' }}>
                        照片大于20MB会自动进行压缩，此压缩对打印质量影响微乎其微，无需担心。
                    </li>
                    <li style={{ marginBottom: '12px', color: '#5c4e00', fontSize: '14px', lineHeight: '1.6' }}>
                        手机用户建议先把照片添加到手机相册里，然后从相册中全选添加上传，操作更便捷。
                    </li>
                    <li style={{ color: '#5c4e00', fontSize: '14px', lineHeight: '1.6' }}>
                        已经提交过的用户请勿重复上传提交，新提交会覆盖以前的所有照片，请确认无误后再点击提交。
                    </li>
                </ul>
            </div>

            <Content>
                <div style={contentStyle}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                    >
                        {/* 收货人姓名字段 */}
                        <Form.Item
                            name="receiver"
                            label={<span style={{ fontSize: '16px', fontWeight: 500 }}>收货人姓名</span>}
                            rules={[{ required: true, message: '请输入收货人姓名' }]}
                            style={formItemStyle}
                        >
                            <Input 
                                placeholder="请输入收货人姓名"
                                size="large"
                                style={{ borderRadius: '6px' }}
                                onChange={handleReceiverNameChange}
                            />
                        </Form.Item>

                        <Form.Item
                            name="orderId"
                            label={<span style={{ fontSize: '16px', fontWeight: 500 }}>淘宝订单号</span>}
                            rules={[
                                { required: true, message: '请输入淘宝订单号' },
                                { pattern: /^\d{16,19}$/, message: '请输入有效的淘宝订单号（16-19位数字）' }
                            ]}
                            style={formItemStyle}
                            extra={<span style={{ color: '#666' }}>请输入淘宝订单号，通常为16-19位数字</span>}
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
                            extra={!formReady ? <span style={{ color: '#ff4d4f' }}>请先填写收货人姓名和订单号，然后再选择照片尺寸</span> : null}
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
                                    disabled={!formReady}
                                >
                                    {photoSizes.map(size => (
                                        <Checkbox 
                                            key={size.value} 
                                            value={size.value}
                                            style={checkboxStyle}
                                            disabled={!formReady}
                                        >
                                            {size.label}
                                        </Checkbox>
                                    ))}
                                </Checkbox.Group>
                            </div>
                        </Form.Item>

                        {/* 照片上传区域 */}
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
                                    {renderFileList(size)}
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
                        
                        {/* 上传进度指示器 - 移到提交按钮上方 */}
                        {uploading && renderUploadProgress()}

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
                        </Form.Item>
                    </Form>
                </div>
            </Content>
            
            {/* 添加自定义离开确认弹窗 */}
            {renderLeaveConfirmModal()}
        </Layout>
    );
};

export default PhotoUpload;