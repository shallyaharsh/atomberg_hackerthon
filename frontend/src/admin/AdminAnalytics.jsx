import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Target, Layers, Briefcase, Award } from 'lucide-react';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/admin/analytics-dashboard`);
        const result = await response.json();
        if (response.ok) {
          setData(result.analytics);
        }
      } catch (err) {
        console.error("Error connecting to Analytics backend channel:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [apiBaseUrl]);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: '#4B5563' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontWeight: '600' }}>Compiling Macro Analytical Intelligence Data...</span>
      </div>
    );
  }

  // Helper variables for computations
  const totalGoalsCount = data.status_breakdown.reduce((sum, item) => sum + item.count, 0);

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* HEADER ROW */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.8rem', fontWeight: '800' }}>Macro Analytics Portal</h1>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Real-time corporate metrics, QoQ growth trends, and performance heatmaps.</p>
      </div>

      {/* TOP ROW: DISTRIBUTION HEALTHBARS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Thrust Area Distribution Card */}
        <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.05rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} color="var(--atomberg-yellow)" /> Goals Distributed by Strategic Thrust Area
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {data.thrust_distribution.map((item, idx) => {
              const pct = totalGoalsCount > 0 ? Math.round((item.count / totalGoalsCount) * 100) : 0;
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
                    <span>{item.thrust_area}</span>
                    <span style={{ color: '#6B7280' }}>{item.count} Goals ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #111827, var(--atomberg-yellow))', borderRadius: '10px', transition: 'width 1s ease-out' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Progress Status Heatmap Ring */}
        <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#1D4ED8" /> Overall Core Status Density Map
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.status_breakdown.map((item, idx) => {
              const pct = totalGoalsCount > 0 ? Math.round((item.count / totalGoalsCount) * 100) : 0;
              const color = item.status === 'Completed' ? '#10B981' : item.status === 'On Track' ? '#3B82F6' : '#9CA3AF';
              const bg = item.status === 'Completed' ? '#D1FAE5' : item.status === 'On Track' ? '#DBEAFE' : '#F3F4F6';
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bg, padding: '1rem', borderRadius: '12px', border: `1px solid ${color}30` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color }}></div>
                    <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#111827' }}>{item.status}</span>
                  </div>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: color }}>{item.count} Items ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* MID ROW: QoQ TRENDBARS & UoM PILLS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* UoM Block */}
        <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.05rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} color="#059669" /> Unit of Measure (UoM) Spread
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {data.uom_distribution.map((item, idx) => (
              <div key={idx} style={{ padding: '1.2rem', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{item.count}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginTop: '4px' }}>{item.uom} Type</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quarter-over-Quarter Trend Charts */}
        <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.05rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#D97706" /> Quarter-on-Quarter (QoQ) Execution Tracker
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '160px', paddingBottom: '10px' }}>
            {data.qoq_trends.map((q, idx) => {
              const compPct = q.total_goals > 0 ? Math.round((q.completed_goals / q.total_goals) * 100) : 0;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '70px' }}>
                  <div style={{ width: '28px', height: '120px', background: '#F3F4F6', borderRadius: '6px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: '100%', height: `${compPct || 5}%`, background: 'linear-gradient(180deg, #10B981, #059669)', borderRadius: '4px', transition: 'height 1s ease' }}></div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#111827' }}>{q.quarter}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#059669' }}>{compPct}% Done</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: MANAGER OPERATIONAL EFFECTIVENESS DIRECTORY */}
      <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={20} color="#6366F1" /> Leadership Line Manager Effectiveness Metrics
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#4B5563', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Manager Executive Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Managed Team Roster</th>
              <th style={{ padding: '0.75rem 1rem' }}>Total Tracked Objectives</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Verification Compliance Load</th>
            </tr>
          </thead>
          <tbody>
            {data.manager_effectiveness.map((mgr, index) => {
              const compRate = mgr.total_team_kpis > 0 ? Math.round((mgr.verified_kpis / mgr.total_team_kpis) * 100) : 0;
              return (
                <tr key={index} style={{ borderBottom: '1px solid #F3F4F6', fontSize: '0.92rem' }}>
                  <td style={{ padding: '1.2rem 1rem', fontWeight: '800', color: '#111827' }}>{mgr.manager_name}</td>
                  <td style={{ padding: '1.2rem 1rem', color: '#4B5563', fontWeight: '600' }}>{mgr.team_size} Direct Reports</td>
                  <td style={{ padding: '1.2rem 1rem', color: '#111827', fontWeight: '700' }}>{mgr.total_team_kpis} Active Goals</td>
                  <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                    <span style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800', backgroundColor: compRate >= 80 ? '#D1FAE5' : compRate >= 40 ? '#FEF3C7' : '#FEF2F2', color: compRate >= 80 ? '#065F46' : compRate >= 40 ? '#92400E' : '#B91C1C', border: `1px solid ${compRate >= 80 ? '#A7F3D0' : compRate >= 40 ? '#FDE68A' : '#FCA5A5'}` }}>
                      {mgr.verified_kpis} Approved ({compRate}% Compliant)
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AdminAnalytics;