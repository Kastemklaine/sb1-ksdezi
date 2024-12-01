import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Workspace } from './components/workspace/Workspace';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <Routes>
        <Route path="/" element={<Workspace />} />
      </Routes>
    </div>
  );
}

export default App;