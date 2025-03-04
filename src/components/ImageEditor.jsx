import React from 'react';
import { Modal, Button } from 'antd';
import { RotateLeftOutlined, RotateRightOutlined, ZoomInOutlined, ZoomOutOutlined, SwapOutlined } from '@ant-design/icons';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const ImageEditor = ({
    visible,
    image,
    crop,
    rotation,
    scale,
    aspectRatio,
    onClose,
    onSave,
    onCropChange,
    onRotate,
    onZoom,
    onAspectRatioToggle
}) => {
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
            onOk={onSave}
            onCancel={onClose}
            width={800}
            style={{ top: 20 }}
            bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}
        >
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <Button.Group size="large">
                    <Button 
                        onClick={() => onRotate('left')} 
                        icon={<RotateLeftOutlined style={{ fontSize: '24px' }} />}
                        style={{ padding: '8px 16px' }}
                    />
                    <Button 
                        onClick={() => onRotate('right')} 
                        icon={<RotateRightOutlined style={{ fontSize: '24px' }} />}
                        style={{ padding: '8px 16px' }}
                    />
                    <Button 
                        onClick={() => onZoom('in')} 
                        icon={<ZoomInOutlined style={{ fontSize: '24px' }} />}
                        style={{ padding: '8px 16px' }}
                    />
                    <Button 
                        onClick={() => onZoom('out')} 
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
            {image && (
                <div style={{ textAlign: 'center' }}>
                    <ReactCrop
                        crop={crop}
                        onChange={onCropChange}
                        aspect={aspectRatio}
                        minWidth={100}
                        minHeight={100}
                    >
                        <img
                            src={image.url}
                            alt="编辑预览"
                            style={{
                                maxWidth: '100%',
                                transform: `rotate(${rotation}deg) scale(${scale})`
                            }}
                        />
                    </ReactCrop>
                </div>
            )}
        </Modal>
    );
};

export default ImageEditor; 