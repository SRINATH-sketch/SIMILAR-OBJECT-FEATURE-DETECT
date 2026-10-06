import React, { useState, useRef } from 'react';
import { Upload, Crosshair, Image as ImageIcon, CheckCircle, LogOut, Save, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [topK, setTopK] = useState(5);
  const [minSim, setMinSim] = useState(0.75);
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  
  const imageRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResultImage(null);
      setGallery([]);
      setMessage('');
    }
  };

  const handleImageClick = async (e) => {
    if (!file || !imageRef.current || loading) return;

    // Get click coordinates relative to the image element
    const rect = imageRef.current.getBoundingClientRect();
    const xClient = e.clientX - rect.left;
    const yClient = e.clientY - rect.top;

    // Calculate scaling factors
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

    // Original image coordinates
    const originalX = Math.round(xClient * scaleX);
    const originalY = Math.round(yClient * scaleY);

    submitDetection(originalX, originalY);
  };

  const submitDetection = async (x, y) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('x', x);
    formData.append('y', y);
    formData.append('top_k', topK);
    formData.append('min_sim', minSim);

    try {
      const response = await fetch('http://localhost:8000/detect', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.error) {
        setMessage(`Error: ${data.error}`);
      } else {
        setResultImage(data.annotated_image);
        setGallery(data.gallery || []);
        setMessage(data.message || 'Detection complete');
      }
    } catch (error) {
      setMessage('Failed to connect to the server. Is the backend running?');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResult = async () => {
    if (!resultImage || saving) return;
    setSaving(true);
    
    try {
      const response = await fetch('http://localhost:8000/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: resultImage,
          count: message
        }),
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setMessage('Result saved to history!');
      } else {
        setMessage(`Save Error: ${data.message}`);
      }
    } catch (error) {
      setMessage('Failed to save result.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="header-title">
          <Crosshair className="header-icon" size={28} />
          <span>FeatureDetect AI</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" style={{ width: 'auto', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)' }} onClick={() => navigate('/history')}>
            <Clock size={18} />
            History
          </button>
          <button className="btn" style={{ width: 'auto', background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <div className="layout-grid">
        <aside className="sidebar">
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ImageIcon size={20} className="header-icon" />
              Detection Settings
            </h3>
            
            <div className="control-group">
              <label className="input-label">Top K Matches</label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={topK} 
                onChange={(e) => setTopK(parseInt(e.target.value))} 
              />
              <div className="slider-labels">
                <span>1</span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{topK}</span>
                <span>20</span>
              </div>
            </div>

            <div className="control-group" style={{ marginTop: '1.5rem' }}>
              <label className="input-label">Minimum Similarity</label>
              <input 
                type="range" 
                min="0.5" 
                max="0.99" 
                step="0.01" 
                value={minSim} 
                onChange={(e) => setMinSim(parseFloat(e.target.value))} 
              />
              <div className="slider-labels">
                <span>0.50</span>
                <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{minSim.toFixed(2)}</span>
                <span>0.99</span>
              </div>
            </div>

            {message && (
              <div className="glass-panel" style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--accent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: '600' }}>
                  <CheckCircle size={18} />
                  Result
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>{message}</p>
              </div>
            )}
          </div>
        </aside>

        <main className="main-content">
          <div className="glass-panel">
            {!preview ? (
              <label className="upload-area">
                <Upload size={48} className="upload-icon" />
                <h3 style={{ marginBottom: '0.5rem' }}>Upload PCB Image</h3>
                <p style={{ color: 'var(--text-muted)' }}>Click or drag and drop to upload</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="image-container">
                {loading && (
                  <div className="loader-overlay">
                    <div className="spinner"></div>
                    <p>Analyzing component features...</p>
                  </div>
                )}
                
                <img 
                  ref={imageRef}
                  src={resultImage || preview} 
                  alt="PCB preview" 
                  className="displayed-image"
                  onClick={handleImageClick}
                />
                {!resultImage && !loading && (
                  <div className="instruction-toast">
                    Click on a component to detect similar objects
                  </div>
                )}
              </div>
            )}
            
            {preview && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setResultImage(null);
                  setGallery([]);
                  setMessage('');
                }}>
                  Upload New Image
                </button>
                {resultImage && (
                  <button 
                    className="btn" 
                    style={{ width: 'auto', background: 'var(--accent)', color: 'white' }} 
                    onClick={handleSaveResult}
                    disabled={saving}
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Result'}
                  </button>
                )}
              </div>
            )}
          </div>

          {gallery.length > 0 && (
            <div className="glass-panel gallery-section">
              <h3 className="gallery-title">
                <CheckCircle size={24} color="var(--accent)" />
                Detected Similar Components
              </h3>
              <div className="gallery-grid">
                {gallery.map((item, index) => (
                  <div key={index} className="gallery-item">
                    <img src={item.image} alt={`Match ${index + 1}`} />
                    <div className="gallery-item-footer">
                      Similarity: {item.similarity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
