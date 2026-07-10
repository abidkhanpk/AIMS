import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Spinner, Alert } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { currencies } from '../../utils/currencies';

export default function AcademySettingsTab() {
    const { t } = useTranslation('common');
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState('');
  const [smtpReplyTo, setSmtpReplyTo] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [testEmail, setTestEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
          setSmtpSecure(data.smtpSecure || 'tls');
          setSmtpReplyTo(data.smtpReplyTo || '');
          setSmtpFrom(data.smtpFrom || '');
          setDefaultCurrency(data.defaultCurrency || 'USD');
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
          smtpSecure: smtpSecure || null,
          smtpReplyTo: smtpReplyTo || null,
          smtpFrom: smtpFrom || null,
          defaultCurrency: defaultCurrency || 'USD'
        })
      });

      if (!res.ok) throw new Error('Failed to update academy settings');

      setSuccess(t('auto.academySettingsUpdatedSuccessfully', `Academy settings updated successfully.`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating settings');
    } finally {
      setUpdating(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      alert(t('auto.pleaseEnterADestinationEmail', `Please enter a destination email address to test.`));
      return;
    }
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSecure,
          smtpReplyTo,
          smtpFrom,
          testEmail
        })
      });
      const data = await res.json();
      setSmtpTestResult({
        success: res.ok && data.success,
        message: data.message
      });
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'An error occurred during testing.'
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">{t('auto.loadingSettings', `Loading settings...`)}</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4 mb-0">
          <i className="bi bi-gear-fill text-primary me-2"></i>
          {t('auto.academySettings', `Academy Settings`)}
                          </h2>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0 fw-bold text-muted">{t('auto.academyPreferences', `Academy Preferences`)}</h5>
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t('auto.defaultCurrency', `Default Currency`)}</Form.Label>
            <Form.Select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="bg-white"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} ({c.name})
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              {t('auto.defaultCurrencyDesc', `This is the default currency used for courses, fee invoices, and teacher pay rates.`)}
            </Form.Text>
          </Form.Group>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0 fw-bold text-muted">{t('auto.smtpConfiguration', `SMTP Configuration`)}</h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted small">
            {t('auto.configureYourAcademyapossSmtpC', `Configure your Academy&apos;s SMTP credentials here. These will be used for sending progress reports and fee invoices to your students and parents.`)}
                                </p>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('auto.smtpHost', `SMTP Host`)}</Form.Label>
              <Form.Control 
                type="text" 
                placeholder={t('auto.egSmtpgmailcom', `e.g. smtp.gmail.com`)} 
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('auto.smtpPort', `SMTP Port`)}</Form.Label>
              <Form.Control 
                type="text" 
                placeholder={t('auto.eg587', `e.g. 587`)} 
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('auto.smtpUser', `SMTP User`)}</Form.Label>
              <Form.Control 
                type="text" 
                placeholder={t('auto.egYouracademygmailcom', `e.g. your-academy@gmail.com`)} 
                value={smtpUser}
                onChange={e => setSmtpUser(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>{t('auto.smtpPassword', `SMTP Password`)}</Form.Label>
              <Form.Control 
                type="password" 
                placeholder={t('auto.appPasswordOrSmtpSecret', `App Password or SMTP Secret`)} 
                value={smtpPass}
                onChange={e => setSmtpPass(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>{t('auto.smtpSecure', `Security Protocol (TLS/SSL)`)}</Form.Label>
              <Form.Select 
                value={smtpSecure}
                onChange={e => setSmtpSecure(e.target.value)}
              >
                <option value="tls">{t('auto.tlsstarttls', `TLS/STARTTLS`)}</option>
                <option value="ssl">{t('auto.sslsmtps', `SSL/SMTPS`)}</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>{t('auto.smtpFrom', `SMTP From Email`)}</Form.Label>
              <Form.Control 
                type="text" 
                placeholder={t('auto.egAimsAdminnoReplyaimsCom', `e.g. AIMS Admin <no-reply@aims.com>`)} 
                value={smtpFrom}
                onChange={e => setSmtpFrom(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>{t('auto.smtpReplyTo', `SMTP Reply-To Email`)}</Form.Label>
              <Form.Control 
                type="email" 
                placeholder={t('auto.egSupportaimscom', `e.g. support@aims.com`)} 
                value={smtpReplyTo}
                onChange={e => setSmtpReplyTo(e.target.value)}
              />
            </Form.Group>
            
            <div className="p-3 bg-light border rounded mb-4">
              <h6 className="fw-bold"><i className="bi bi-envelope-fill me-2 text-secondary"></i>{t('auto.testSmtpConfiguration', 'Test SMTP Configuration')}</h6>
              <p className="text-muted small mb-3">{t('auto.testSmtpDesc', 'Enter a destination email address to verify SMTP connectivity and credentials.')}</p>
              <div className="d-flex gap-2">
                <Form.Control
                  type="email"
                  placeholder={t('auto.enterTestEmail', 'Enter test destination email')}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  style={{ maxWidth: '300px' }}
                  className="bg-white"
                />
                <Button 
                  variant="outline-primary" 
                  onClick={handleTestSmtp}
                  disabled={testingSmtp || !testEmail}
                >
                  {testingSmtp ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2"/>
                      {t('auto.testing', 'Testing...')}
                    </>
                  ) : (
                    t('auto.sendTestEmail', 'Send Test Email')
                  )}
                </Button>
              </div>
              {smtpTestResult && (
                <Alert 
                  variant={smtpTestResult.success ? 'success' : 'danger'} 
                  className="mt-3 mb-0 py-2 small"
                >
                  {smtpTestResult.message}
                </Alert>
              )}
            </div>
            
            <Button variant="primary" onClick={handleSave} disabled={updating}>
              {updating ? <><Spinner size="sm" animation="border" className="me-2"/>{t('auto.saving', `Saving...`)}</> : 'Save SMTP Settings'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
