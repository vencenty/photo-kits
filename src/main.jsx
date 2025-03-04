import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// 清除现有的 HTML 内容
document.body.innerHTML = '<div id="app"></div>';
// 渲染主应用组件
const root = createRoot(document.getElementById('app'));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
