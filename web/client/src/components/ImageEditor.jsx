import React, { useEffect, useRef } from 'react';
import { Modal, Button } from 'antd';
import { RotateLeftOutlined, RotateRightOutlined, ZoomInOutlined, ZoomOutOutlined, SwapOutlined } from '@ant-design/icons';
import Cropper from 'cropperjs';
//import 'cropperjs/dist/cropper.css';

const ImageEditor = ({
    visible,
    image,
    aspectRatio,
    onClose,
    onSave,
    onAspectRatioToggle
}) => {
    const cropperRef = useRef(null);
    const imageRef = useRef(null);

    useEffect(() => {
        if (visible && imageRef.current) {
            // 销毁之前的实例
            if (cropperRef.current) {
                cropperRef.current.destroy();
            }

            // 创建新的 Cropper 实例
            cropperRef.current = new Cropper(imageRef.current, {
                aspectRatio: aspectRatio,
                viewMode: 2, // 限制裁切框不超出图片的范围
                dragMode: 'move',
                autoCropArea: 0.98, // 自动裁切区域为图片的98%
                restore: false,
                modal: true,
                guides: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                responsive: true,
                checkOrientation: true,
                background: true,
                ready: function() {
                    // 当裁切器准备好后，设置容器大小以适应屏幕
                    const containerData = cropperRef.current.getContainerData();
                    const viewportWidth = window.innerWidth * 0.8; // 使用80%的屏幕宽度
                    const viewportHeight = window.innerHeight * 0.7; // 使用70%的屏幕高度
                    
                    // 计算缩放比例
                    const scaleX = viewportWidth / containerData.width;
                    const scaleY = viewportHeight / containerData.height;
                    const scale = Math.min(scaleX, scaleY);
                    
                    // 调整画布大小
                    if (scale < 1) {
                        cropperRef.current.zoomTo(scale);
                    }

                    // 确保裁切框适应图片方向
                    cropperRef.current.crop();
                }
            });
        }

        return () => {
            if (cropperRef.current) {
                cropperRef.current.destroy();
                cropperRef.current = null;
            }
        };
    }, [visible, aspectRatio]);

    // 处理旋转
    const handleRotate = (direction) => {
        if (cropperRef.current) {
            cropperRef.current.rotate(direction === 'left' ? -90 : 90);
        }
    };

    // 处理缩放
    const handleZoom = (direction) => {
        if (cropperRef.current) {
            const value = direction === 'in' ? 0.1 : -0.1;
            cropperRef.current.zoom(value);
        }
    };

    // 处理保存
    const handleSave = () => {
        if (cropperRef.current) {
            const canvas = cropperRef.current.getCroppedCanvas({
                maxWidth: 4096,
                maxHeight: 4096,
                fillColor: '#fff',
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            
            canvas.toBlob((blob) => {
                const croppedImageUrl = URL.createObjectURL(blob);
                onSave(croppedImageUrl);
            }, 'image/jpeg', 0.9);
        }
    };

    // 获取当前比例的显示文本
    const getRatioText = () => {
        if (!image) return '';
        
        const ratioMap = {
            '3inch': { landscape: '3:2', portrait: '2:3' },
            '4inch': { landscape: '4:3', portrait: '3:4' },
            '5inch': { landscape: '3:2', portrait: '2:3' },
            '6inch': { landscape: '3:2', portrait: '2:3' },
            '7inch': { landscape: '10:7', portrait: '7:10' },
            '8inch': { landscape: '4:3', portrait: '3:4' },
            '10inch': { landscape: '10:8', portrait: '8:10' },
            'A4': { landscape: '297:210', portrait: '210:297' }
        };

        const sizeRatios = ratioMap[image.size] || { landscape: '3:2', portrait: '2:3' };
        const isLandscapeRatio = aspectRatio > 1;
        
        return `当前比例: ${isLandscapeRatio ? sizeRatios.landscape : sizeRatios.portrait} (${isLandscapeRatio ? '横向' : '竖向'})`;
    };

    return (
        <Modal
            title="图片编辑"
            open={visible}
            onOk={handleSave}
            onCancel={onClose}
            width="90vw"
            style={{ top: 20 }}
            bodyStyle={{ 
                maxHeight: 'calc(90vh - 100px)',
                overflow: 'hidden',
                padding: '20px 0'
            }}
        >
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <Button.Group size="large">
                    <Button 
                        onClick={() => handleRotate('left')} 
                        icon={<RotateLeftOutlined style={{ fontSize: '24px' }} />}
                        style={{ padding: '8px 16px' }}
                    />
                    <Button 
                        onClick={() => handleRotate('right')} 
                        icon={<RotateRightOutlined style={{ fontSize: '24px' }} />}
                        style={{ padding: '8px 16px' }}
                    />
                    <Button 
                        onClick={() => handleZoom('in')} 
                        icon={<ZoomInOutlined style={{ fontSize: '24px' }} />}
                        style={{ padding: '8px 16px' }}
                    />
                    <Button 
                        onClick={() => handleZoom('out')} 
                        icon={<ZoomOutOutlined style={{ fontSize: '24px' }} />}
                        style={{ padding: '8px 16px' }}
                    />
                    <Button 
                        onClick={onAspectRatioToggle} 
                        icon={<SwapOutlined style={{ fontSize: '24px' }} />}
                        style={{ padding: '8px 16px' }}
                        title="切换横竖比例"
                    />
                </Button.Group>
                <div style={{ 
                    marginTop: 8, 
                    fontSize: '12px', 
                    color: '#666' 
                }}>
                    {getRatioText()}
                </div>
            </div>
            <div style={{ 
                maxWidth: '100%',
                height: 'calc(90vh - 200px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                {image && (
                    <img
                        ref={imageRef}
                        src={image.url}
                        alt="编辑预览"
                        style={{ 
                            maxWidth: '100%',
                            maxHeight: '100%',
                            display: 'block'
                        }}
                    />
                )}
            </div>
        </Modal>
    );
};

export default ImageEditor; 