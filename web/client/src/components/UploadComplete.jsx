import React from 'react';
import { Result, Button, Layout } from 'antd';
import { CheckCircleOutlined, CameraOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header, Content } = Layout;

const UploadComplete = () => {
    const navigate = useNavigate();

    const handleBackToUpload = () => {
        navigate('/');
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
                    <Result
                        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        title="照片上传成功！"
                        subTitle="请静候佳音哦～我们将尽快处理您的照片"
                        extra={[
                            <Button 
                                type="primary" 
                                key="console" 
                                onClick={handleBackToUpload}
                                size="large"
                                style={{
                                    height: '48px',
                                    borderRadius: '6px',
                                    fontSize: '16px'
                                }}
                            >
                                继续上传
                            </Button>
                        ]}
                    />
                </div>
            </Content>
        </Layout>
    );
};

export default UploadComplete; 