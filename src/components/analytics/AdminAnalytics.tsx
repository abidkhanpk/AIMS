import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner } from 'react-bootstrap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface AdminAnalyticsData {
  totalStudents: number;
  attendanceRate: number;
  feeCollectionRate: number;
  revenueChart: { name: string; revenue: number }[];
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics/admin');
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-5 text-danger">
        <i className="bi bi-exclamation-triangle display-4"></i>
        <p className="mt-2">Failed to load analytics: {error}</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="shadow-sm border-0 bg-primary text-white h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="fs-1 me-3 opacity-75">
                <i className="bi bi-people-fill"></i>
              </div>
              <div>
                <h6 className="mb-0 text-uppercase fw-bold opacity-75">Total Students</h6>
                <h2 className="mb-0 fw-bold">{data.totalStudents}</h2>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 bg-success text-white h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="fs-1 me-3 opacity-75">
                <i className="bi bi-calendar-check-fill"></i>
              </div>
              <div>
                <h6 className="mb-0 text-uppercase fw-bold opacity-75">Attendance Rate</h6>
                <h2 className="mb-0 fw-bold">{data.attendanceRate}%</h2>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 bg-info text-white h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="fs-1 me-3 opacity-75">
                <i className="bi bi-cash-stack"></i>
              </div>
              <div>
                <h6 className="mb-0 text-uppercase fw-bold opacity-75">Fee Collection</h6>
                <h2 className="mb-0 fw-bold">{data.feeCollectionRate}%</h2>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0 pt-4 pb-0">
          <h5 className="fw-bold text-muted mb-0">Revenue Overview (Last 6 Months)</h5>
        </Card.Header>
        <Card.Body>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={data.revenueChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                <YAxis axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0d6efd" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
