import React from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNewRecording?: () => void;
  onDashboardClick?: () => void;
}

export default function Sidebar({ collapsed, onToggle, onNewRecording, onDashboardClick }: SidebarProps) {
  const collapsedWidth = 60;
  const expandedWidth = 260;
  const transition = '250ms cubic-bezier(0.4, 0, 0.2, 1)';

  return (
    <aside
      style={{
        width: collapsed ? collapsedWidth : expandedWidth,
        background: '#fff',
        padding: collapsed ? '16px 0' : '32px 0 24px 0',
        borderRight: '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        position: 'relative',
        transition: `width ${transition}, padding ${transition}`,
        overflow: 'visible', // important for showing button outside
        zIndex: 5,
      }}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: 18,
          right: -18,
          width: 36,
          height: 36,
          border: 'none',
          background: '#f3f4f6',
          borderRadius: '50%',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'right 0.25s',
          zIndex: 9999, // ensures button stays on top of everything
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span
          style={{
            display: 'inline-block',
            transform: collapsed ? 'rotate(180deg)' : 'none',
            fontSize: 18,
            color: '#888',
            transition: 'transform 0.25s',
          }}
        >
          {'❮'}
        </span>
      </button>

      {/* Content Wrapper for smooth fade/slide */}
      <div
        style={{
          opacity: collapsed ? 0 : 1,
          transform: collapsed ? 'translateX(-10px)' : 'translateX(0)',
          transition: `opacity ${transition}, transform ${transition}`,
          pointerEvents: collapsed ? 'none' : 'auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Profile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 32,
            width: '88%',
            marginTop: 48,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg,#9684f5,#c857f5)',
              color: '#fff',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1.3rem',
              flexShrink: 0,
            }}
          >
            JS
          </div>
          <span
            style={{
              fontWeight: 600,
              fontSize: '1.1rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            John Smith
          </span>
        </div>

        {/* New Recording Button */}
        <button
          onClick={onNewRecording}
          style={{
            width: '88%',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontWeight: 500,
            padding: '16px',
            fontSize: '1.05rem',
            marginBottom: 32,
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(37,99,235,0.08)',
            transition: 'background 0.2s',
          }}
        >
          New Recording
        </button>

        {/* Dashboard */}
        <div
          style={{
            width: '88%',
            marginTop: 6,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <button
            onClick={onDashboardClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#e0f2fe',
              color: '#2563eb',
              fontWeight: 500,
              borderRadius: 9,
              fontSize: '1.05rem',
              padding: '12px 13px',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
              width: '100%',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#bae6fd')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#e0f2fe')}
          >
            Dashboard
          </button>
        </div>
      </div>
    </aside>
  );
}
