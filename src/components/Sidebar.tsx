import React from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNewRecording?: () => void;
}

export default function Sidebar({ collapsed, onToggle, onNewRecording }: SidebarProps) {
  return (
    <aside
      style={{
        width: collapsed ? 64 : 260,
        background: '#fff',
        padding: collapsed ? '24px 0' : '32px 0 24px 0',
        borderRight: '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        transition: 'width 0.2s cubic-bezier(.4,2,.6,1)',
        position: 'relative',
        zIndex: 2
      }}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: 18,
          right: collapsed ? -18 : -18,
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
          transition: 'right 0.2s',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span style={{
          display: 'inline-block',
          transform: collapsed ? 'rotate(180deg)' : 'none',
          fontSize: 18,
          color: '#888',
          transition: 'transform 0.2s'
        }}>
          {'❮'}
        </span>
      </button>
      {/* Profile */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 32,
        width: collapsed ? 48 : '88%',
        minWidth: 0,
        marginTop: 48
      }}>
        <div style={{
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
        }}>JS</div>
        {!collapsed && (
          <span style={{ fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>John Smith</span>
        )}
      </div>
      {/* New Recording Button */}
      <button onClick={onNewRecording} style={{
        width: collapsed ? 48 : '88%',
        background: '#2563eb',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        fontWeight: 500,
        padding: collapsed ? '12px' : '16px',
        fontSize: '1.05rem',
        marginBottom: 12,
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(37,99,235,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 20, marginRight: collapsed ? 0 : 8 }}>•</span>
        {!collapsed && 'New Recording'}
      </button>
      {/* Import File Button */}
      <button style={{
        width: collapsed ? 48 : '88%',
        background: '#f7f7f7',
        color: '#222',
        border: 'none',
        borderRadius: 12,
        fontWeight: 500,
        padding: collapsed ? '10px' : '14px',
        fontSize: '1rem',
        marginBottom: 32,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: collapsed ? 0 : 10
      }}>
        <span style={{ display: 'inline-block', width: 18, height: 18, background: '#666', borderRadius: 4, marginRight: collapsed ? 0 : 6 }}></span>
        {!collapsed && 'Import File'}
      </button>
      {/* Dashboard Menu (just for show, not clickable) */}
      <div style={{ width: collapsed ? 48 : '88%', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#e0f2fe',
          color: '#2563eb',
          fontWeight: 500,
          borderRadius: 9,
          fontSize: '1.05rem',
          gap: 10,
          padding: collapsed ? '12px 0' : '12px 13px',
          marginBottom: 3,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <span style={{ display: 'inline-block', width: 18, height: 18, background: '#2563eb', borderRadius: 3, marginRight: collapsed ? 0 : 2, opacity: 0.2 }}></span>
          {!collapsed && 'Dashboard'}
        </div>
      </div>
    </aside>
  );
}
