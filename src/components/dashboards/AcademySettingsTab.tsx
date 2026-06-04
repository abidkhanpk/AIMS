import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Spinner, Alert } from 'react-bootstrap';
import { useSession } from 'next-auth/react';

export default function AcademySettingsTab() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings/academy');
        if (!res.ok) throw new Error('Failed to fetch academy settings');
        const data = await res.json();
        if (data) {
          setSmtpHost(data.smtpHost || '');
          setSmtpPort(data.smtpPort || '');
          setSmtpUser(data.smtpUser || '');
          setSmtpPass(data.smtpPass || '');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/academy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: smtpHost || null,
          smtpPort: smtpPort || null,
          smtpUser: smtpUser || null,
          smtpPass: smtpPass || null,
        })
      });

      if (!res.ok) throw new Error('Failed to update academy settings');
      setSuccess('Academy settings updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating settings');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4 mb-0">
          <i className="bi bi-gear-fill text-primary me-2"></i>
          Academy Settings
        </h2>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0 fw-bold text-muted">SMTP Configuration</h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted small">
            Configure your Academy&apos;s SMTP credentials here. These will be used for sending progress reports and fee invoices to your students and parents.
          </p>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>SMTP Host</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g. smtp.gmail.com" 
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>SMTP Port</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g. 587" 
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>SMTP User</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g. your-academy@gmail.com" 
                value={smtpUser}
                onChange={e => setSmtpUser(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>SMTP Password</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="App Password or SMTP Secret" 
                value={smtpPass}
                onChange={e => setSmtpPass(e.target.value)}
              />
            </Form.Group>
            
            <Button variant="primary" onClick={handleSave} disabled={updating}>
              {updating ? <><Spinner size="sm" animation="border" className="me-2"/>Saving...</> : 'Save SMTP Settings'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
