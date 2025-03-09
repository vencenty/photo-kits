import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PhotoUpload from './components/PhotoUpload';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>照片上传系统</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<PhotoUpload />} />
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