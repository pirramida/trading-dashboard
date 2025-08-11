import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const [expandedGroups, setExpandedGroups] = useState({
    markets: true,
    strategies: true,
    tools: false
  });

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-group">
        <div 
          className="sidebar-group-header"
          onClick={() => toggleGroup('markets')}
        >
          <span>Markets</span>
          <span>{expandedGroups.markets ? '−' : '+'}</span>
        </div>
        {expandedGroups.markets && (
          <div className="sidebar-items">
            <NavLink 
              to="/markets/spot" 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              Spot
            </NavLink>
            <NavLink 
              to="/markets/futures" 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              Futures
            </NavLink>
          </div>
        )}
      </div>

      <div className="sidebar-group">
        <div 
          className="sidebar-group-header"
          onClick={() => toggleGroup('strategies')}
        >
          <span>Strategies</span>
          <span>{expandedGroups.strategies ? '−' : '+'}</span>
        </div>
        {expandedGroups.strategies && (
          <div className="sidebar-items">
            <NavLink 
              to="/strategies/trend-following" 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              Trend Following
            </NavLink>
            <NavLink 
              to="/strategies/mean-reversion" 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              Mean Reversion
            </NavLink>
          </div>
        )}
      </div>

      <div className="sidebar-group">
        <div 
          className="sidebar-group-header"
          onClick={() => toggleGroup('tools')}
        >
          <span>Tools</span>
          <span>{expandedGroups.tools ? '−' : '+'}</span>
        </div>
        {expandedGroups.tools && (
          <div className="sidebar-items">
            <NavLink 
              to="/tools/backtester" 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              Backtester
            </NavLink>
            <NavLink 
              to="/tools/calculator" 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              Calculator
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;