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
                        title={aspectRatio === 3/2 ? "切换到竖向(2:3)" : "切换到横向(3:2)"}
                    />
                </Button.Group>
                <div style={{ 
                    marginTop: 8, 
                    fontSize: '12px', 
                    color: '#666' 
                }}>
                    当前比例: {aspectRatio === 3/2 ? "3:2 (横向)" : "2:3 (竖向)"}
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