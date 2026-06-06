import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface TeacherAnalyticsData {
  averageTestScore: number;
  attendanceRate: number;
}

interface TeacherAnalyticsProps {
  onTabChange?: (tab: string) => void;
}

export default function TeacherAnalytics({ onTabChange }: TeacherAnalyticsProps = {}) {
    const { t } = useTranslation('common');
  const [data, setData] = useState<TeacherAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics/teacher');
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
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" size="sm" />
        <span className="ms-2 text-muted small">{t('auto.loadingAnalytics', `Loading analytics...`)}</span>
      </div>
    );
  }

  if (error || !data) {
    return null; // Fail silently or show minimal error so it doesn't break the dashboard
  }

  return (
    <Row className="g-3 mb-4">
      <Col md={6}>
        <Card 
          className={`shadow-sm border-0 bg-primary text-white h-100 ${onTabChange ? 'interactive-card' : ''}`}
          onClick={() => onTabChange?.('tests')}
        >
          <Card.Body className="d-flex align-items-center">
            <div className="fs-2 me-3 opacity-75">
              <i className="bi bi-journal-check"></i>
            </div>
            <div>
              <h6 className="mb-0 text-uppercase fw-bold opacity-75 small">{t('auto.avgTestScore', `Avg Test Score`)}</h6>
              <h3 className="mb-0 fw-bold">{data.averageTestScore}%</h3>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        <Card 
          className={`shadow-sm border-0 bg-success text-white h-100 ${onTabChange ? 'interactive-card' : ''}`}
          onClick={() => onTabChange?.('progress')}
        >
          <Card.Body className="d-flex align-items-center">
            <div className="fs-2 me-3 opacity-75">
              <i className="bi bi-people-fill"></i>
            </div>
            <div>
              <h6 className="mb-0 text-uppercase fw-bold opacity-75 small">{t('auto.classAttendance', `Class Attendance`)}</h6>
              <h3 className="mb-0 fw-bold">{data.attendanceRate}%</h3>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
