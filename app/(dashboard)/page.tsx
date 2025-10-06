'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [deviceId, setDeviceId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert(`Querying device: ${deviceId} from ${fromDate} to ${toDate}`);
    }, 1000);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        Water Quality Dashboard
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Monitor and analyze water quality readings from Sui blockchain
      </p>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '1.5rem',
        marginBottom: '2rem',
        backgroundColor: '#f9f9f9'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Query Water Quality Data</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Device ID
            </label>
            <input
              type="text"
              placeholder="Enter device ID"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Start Date (UTC)
              </label>
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                End Date (UTC)
              </label>
              <input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                setFromDate(from.toISOString().slice(0, 16));
                setToDate(now.toISOString().slice(0, 16));
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Last 24h
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                setFromDate(from.toISOString().slice(0, 16));
                setToDate(now.toISOString().slice(0, 16));
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Last 7d
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Querying...' : 'Query Data'}
          </button>
        </form>
      </div>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '1.5rem',
        backgroundColor: '#f9f9f9'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>KPI Cards</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1rem', 
            borderRadius: '4px',
            border: '1px solid #eee'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>Temperature</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>--°C</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>No data available</div>
          </div>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1rem', 
            borderRadius: '4px',
            border: '1px solid #eee'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>Dissolved Oxygen</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>-- mg/L</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>No data available</div>
          </div>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1rem', 
            borderRadius: '4px',
            border: '1px solid #eee'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>pH</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>--</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>No data available</div>
          </div>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1rem', 
            borderRadius: '4px',
            border: '1px solid #eee'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>Turbidity</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>-- NTU</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>No data available</div>
          </div>
        </div>
      </div>

      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '1.5rem',
        marginTop: '2rem',
        backgroundColor: '#f9f9f9'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Data Export</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Export filtered data as CSV or JSON. Enter a device ID and time range to start querying.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            disabled
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'not-allowed'
            }}
          >
            Download CSV (0)
          </button>
          <button
            disabled
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'not-allowed'
            }}
          >
            Download JSON (0)
          </button>
        </div>
      </div>
    </div>
  );
}
