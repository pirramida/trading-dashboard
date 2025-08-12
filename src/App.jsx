import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import WindowManager from "./ui/layouts/WindowManager/WindowManager";
import ExchangeConnector from "./ui/components/ExchangeConnector/ExchangeConnector";
import StrategyConnector from "./ui/components/StrategyConnector/StrategyConnector";

function App() {
  return (
    <div className="App" style={{ height: "100vh", overflow: "hidden" }}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <div style={{ display: "flex", height: "100%" }}>
                <div
                  style={{
                    width: "250px",
                    background: "#1e222d",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    overflowY: "auto",
                  }}
                >
                  <ExchangeConnector />
                  <div
                    style={{
                      height: "1px",
                      background: "#3a3f4b",
                      margin: "5px 0",
                    }}
                  ></div>
                  <div
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #3a3f4b",
                    }}
                  >
                    <h3 style={{ color: "#fff", margin: 0 }}>Strategies</h3>
                  </div>
                  <StrategyConnector />
                </div>
                <div
                  style={{ flex: 1, position: "relative", overflow: "hidden" }}
                >
                  <WindowManager />
                </div>
              </div>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
