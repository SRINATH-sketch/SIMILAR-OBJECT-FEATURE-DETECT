import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, CircuitBoard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/history');
      const data = await response.json();
      if (data.status === 'success') {
        setHistory(data.history);
      } else {
        console.error("Failed to load history:", data.message);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="header-title">
          <Clock className="header-icon" size={28} />
          <span>Detection History</span>
        </div>
        <button className="btn" style={{ width: 'auto', background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </header>

      <main className="main-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto', marginBottom: '1rem' }}></div>
            <p>Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
            <CircuitBoard size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3>No history found</h3>
            <p style={{ color: 'var(--text-muted)' }}>You haven't saved any detections yet.</p>
          </div>
        ) : (
          <div className="gallery-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {history.map((item) => (
              <div key={item.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img 
                    src={item.image} 
                    alt={`Detection at ${item.timestamp}`} 
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.25rem' }}>{item.count}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <Clock size={14} />
                    {item.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
