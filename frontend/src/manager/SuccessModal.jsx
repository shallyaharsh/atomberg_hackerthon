import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const SuccessModal = ({ 
  isOpen, 
  onClose, 
  title = "Action Successful!", 
  message, 
  badgeTitle = "Employee Notified", 
  badgeDescription = "An automated email containing your remarks and decisions has been sent to the employee." 
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
      backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 
    }}>
      <div style={{ 
        background: '#FFFFFF', width: '420px', borderRadius: '16px', 
        border: '1px solid #E5E7EB', padding: '2.5rem 2rem', 
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)', textAlign: 'center' 
      }}>
        {/* Animated Green Tick Circle */}
        <div style={{ 
          background: '#D1FAE5', width: '60px', height: '60px', borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' 
        }}>
          <CheckCircle2 size={32} color="#059669" />
        </div>
        
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827', fontSize: '1.25rem', fontWeight: '800' }}>{title}</h3>
        <p style={{ margin: '0 0 1.5rem 0', color: '#4B5563', fontSize: '0.9rem', lineHeight: '1.5' }}>
          {message}
        </p>
        
        {/* 📧 Email Notification Info Card */}
        <div style={{ 
          background: '#F9FAFB', border: '1px dashed #D1D5DB', padding: '1rem', 
          borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', 
          alignItems: 'flex-start', gap: '10px', textAlign: 'left' 
        }}>
          <span style={{ fontSize: '1.2rem' }}>📧</span>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#111827' }}>{badgeTitle}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>{badgeDescription}</div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={onClose} 
          style={{ 
            width: '100%', background: 'var(--atomberg-yellow)', border: 'none', 
            borderRadius: '8px', padding: '0.75rem', fontWeight: '800', 
            color: '#000000', cursor: 'pointer', fontSize: '0.9rem', 
            boxShadow: '0 4px 15px rgba(255,198,0,0.2)' 
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;