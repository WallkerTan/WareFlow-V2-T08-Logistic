import { useState, useEffect } from 'react';
import './WFSpinner.css';

interface WFSpinnerProps {
  timeoutMs?: number;
  message?: string;
}

export function WFSpinner({ timeoutMs = 10000, message }: WFSpinnerProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [timeoutMs]);

  if (timedOut) {
    return (
      <div className="spinner-container" role="alert">
        <div className="spinner-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Không thể kết nối</span>
        </div>
      </div>
    );
  }

  return (
    <div className="spinner-container" role="status" aria-label="Đang tải dữ liệu">
      <div className="spinner">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      {message && <span style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{message}</span>}
    </div>
  );
}

export default WFSpinner;
