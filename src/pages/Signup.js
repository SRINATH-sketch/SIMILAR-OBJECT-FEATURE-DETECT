import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, CircuitBoard } from 'lucide-react';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Simulate signup for now
    navigate('/login');
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-box">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <CircuitBoard size={48} color="var(--secondary)" />
        </div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Sign up to get started</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="username">Username</label>
            <input 
              type="text" 
              id="username" 
              className="input-field" 
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              className="input-field" 
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              className="input-field" 
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}>
            <UserPlus size={20} />
            Sign Up
          </button>
        </form>
        
        <div className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
