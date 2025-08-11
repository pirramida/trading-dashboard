import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import WindowManager from './ui/layouts/WindowManager';
import ExchangeConnector from './ui/components/ExchangeConnector';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={
            <div style={{ display: 'flex', height: '100vh' }}>
              <div style={{ width: '250px', background: '#1e222d', padding: '10px' }}>
                <ExchangeConnector />
              </div>
              <div style={{ flex: 1 }}>
                <WindowManager />
              </div>
            </div>
          } />
        </Routes>
      </Router>
    </div>
  );
}

export default App;