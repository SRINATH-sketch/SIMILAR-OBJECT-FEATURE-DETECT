import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, CircuitBoard } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Simulate login for now
    navigate('/dashboard');
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-box">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <CircuitBoard size={48} color="var(--primary)" />
        </div>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Login to your account to continue</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="username">Username</label>
            <input 
              type="text" 
              id="username" 
              className="input-field" 
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              className="input-field" 
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary">
            <LogIn size={20} />
            Login
          </button>
        </form>
        
        <div className="auth-link">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
