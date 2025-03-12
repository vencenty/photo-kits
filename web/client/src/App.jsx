import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PhotoUpload from './components/PhotoUpload';
import UploadComplete from './components/UploadComplete';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <main>
          <Routes>
            <Route path="/" element={<PhotoUpload />} />
            <Route path="/upload-complete" element={<UploadComplete />} />
          </Routes>
        </main>
        <footer className="App-footer">
          <p>© 2023 照片管理系统</p>
        </footer>
      </div>
    </Router>
  );
}

export default App; 