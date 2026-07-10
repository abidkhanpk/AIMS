import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spinner, Badge, Form, Table, Row, Col, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { adminWelcomeMessage } from '../../utils/whatsapp-templates';

interface Admin {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  isActive: boolean;
  settings?: {
    appTitle: string;
  };
}

interface MessageLog {
  id: string;
  recipientPhone: string;
  recipientName: string | null;
  messageType: string;
  messageText: string;
  status: string;
  createdAt: string;
}

interface SessionStatus {
  exists: boolean;
  hasAuthData: boolean;
  status: string;
  phoneNumber: string | null;
  dbSession: {
    id: string;
    phoneNumber: string | null;
    isConnected: boolean;
    lastConnected: string | null;
    minDelayMs: number;
    maxDelayMs: number;
    maxBatchSize: number;
  } | null;
}

export default function DeveloperWhatsAppTab() {
  const { t } = useTranslation('common');

  // Session state
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [activeAction, setActiveAction] = useState<'disconnect' | 'logout' | null>(null);
  const [qrPolling, setQrPolling] = useState(false);

  // Send message state
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Message logs
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Settings
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [maxBatch, setMaxBatch] = useState(50);
  const [savingSettings, setSavingSettings] = useState(false);

  // Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch session status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/session');
      if (res.ok) {
        const data = await res.json();
        setSessionStatus(data);
        if (data.dbSession) {
          setMinDelay(Math.round(data.dbSession.minDelayMs / 1000));
          setMaxDelay(Math.round(data.dbSession.maxDelayMs / 1000));
          setMaxBatch(data.dbSession.maxBatchSize);
        }
      }
    } catch (e) {
      console.error('Failed to fetch session status:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch admins for sending welcome messages
  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/recipients?type=admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (e) {
      console.error('Failed to fetch admins:', e);
    }
  }, []);

  // Fetch message logs
  const fetchLogs = useCallback(async (page: number) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/whatsapp/logs?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setLogsTotal(data.total);
        setLogsPage(page);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchAdmins();
    fetchLogs(1);
  }, [fetchStatus, fetchAdmins, fetchLogs]);

  // Poll QR code while connecting
  useEffect(() => {
    if (!qrPolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/qr');
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setQrCode(null);
            setQrPolling(false);
            setConnecting(false);
            setSuccess(t('auto.whatsappConnectedSuccessfully', 'WhatsApp connected successfully!'));
            fetchStatus();
          } else if (data.qr) {
            setQrCode(data.qr);
          }
        }
      } catch (e) {
        console.error('QR poll error:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [qrPolling, t, fetchStatus]);

  // Connect WhatsApp
  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/whatsapp/session', { method: 'POST' });
      if (res.ok) {
        setQrPolling(true);
        // Fetch initial QR after a short delay
        setTimeout(async () => {
          const qrRes = await fetch('/api/whatsapp/qr');
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            if (qrData.qr) {
              setQrCode(qrData.qr);
            } else if (qrData.connected) {
              setQrPolling(false);
              setConnecting(false);
              setSuccess(t('auto.whatsappConnectedSuccessfully', 'WhatsApp connected successfully!'));
              fetchStatus();
            }
          }
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to initialize WhatsApp session');
        setConnecting(false);
      }
    } catch (e) {
      setError('Failed to connect to WhatsApp server');
      setConnecting(false);
    }
  };

  // Disconnect / Logout WhatsApp
  const handleDisconnect = async (removeAuth: boolean) => {
    const msg = removeAuth 
      ? t('auto.confirmLogoutWhatsapp', 'Are you sure you want to log out from WhatsApp? This will unlink your device, and you will need to scan the QR code again.')
      : t('auto.confirmDisconnectWhatsapp', 'Are you sure you want to disconnect WhatsApp? This will temporarily close the connection, but it will automatically wake up and reconnect when the next message is sent.');
      
    if (!confirm(msg)) return;
    setActiveAction(removeAuth ? 'logout' : 'disconnect');
    setDisconnecting(true);
    setError('');
    try {
      const res = await fetch('/api/whatsapp/session', { 
        method: removeAuth ? 'DELETE' : 'PUT' 
      });
      if (res.ok) {
        setSessionStatus(null);
        setQrCode(null);
        setQrPolling(false);
        setSuccess(
          removeAuth 
            ? t('auto.whatsappLoggedOutSuccessfully', 'WhatsApp logged out successfully')
            : t('auto.whatsappDisconnectedSuccessfully', 'WhatsApp disconnected successfully')
        );
        fetchStatus();
      } else {
        const data = await res.json();
        setError(data.message || (removeAuth ? 'Failed to log out' : 'Failed to disconnect'));
      }
    } catch (e) {
      setError(removeAuth ? 'Failed to log out WhatsApp' : 'Failed to disconnect WhatsApp');
    } finally {
      setDisconnecting(false);
      setActiveAction(null);
    }
  };

  // Send welcome message
  const handleSendWelcome = async () => {
    if (!selectedAdmin || !password) {
      setError(t('auto.pleaseSelectAdminAndEnterPassword', 'Please select an admin and enter the password'));
      return;
    }

    const admin = admins.find(a => a.id === selectedAdmin);
    if (!admin || !admin.mobile) {
      setError(t('auto.selectedAdminHasNoWhatsappNumber', 'Selected admin has no WhatsApp number'));
      return;
    }

    setSending(true);
    setError('');
    try {
      const messageText = adminWelcomeMessage({ password });
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: admin.mobile,
          text: messageText,
          messageType: 'WELCOME_ADMIN',
          recipientName: admin.name,
        }),
      });

      if (res.ok) {
        setSuccess(t('auto.welcomeMessageQueued', `Welcome message queued for ${admin.name}`));
        setSelectedAdmin('');
        setPassword('');
        setShowPreview(false);
        fetchLogs(1);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to send message');
      }
    } catch (e) {
      setError('Failed to send welcome message');
    } finally {
      setSending(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setError('');
    try {
      const res = await fetch('/api/whatsapp/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minDelayMs: minDelay * 1000,
          maxDelayMs: maxDelay * 1000,
          maxBatchSize: maxBatch,
        }),
      });

      if (res.ok) {
        setSuccess(t('auto.settingsSavedSuccessfully', 'Settings saved successfully'));
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save settings');
      }
    } catch (e) {
      setError('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const isConnected = sessionStatus?.status === 'connected';

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">{t('auto.loadingWhatsappStatus', 'Loading WhatsApp status...')}</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Connection Section */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0">
            <i className="bi bi-whatsapp me-2"></i>
            {t('auto.whatsappConnection', 'WhatsApp Connection')}
          </h5>
        </Card.Header>
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <div className="d-flex align-items-center gap-3">
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: isConnected ? '#28a745' : '#dc3545',
                    boxShadow: isConnected ? '0 0 8px rgba(40,167,69,0.5)' : '0 0 8px rgba(220,53,69,0.5)',
                  }}
                />
                <div>
                  <strong>
                    {isConnected
                      ? t('auto.connected', 'Connected')
                      : t('auto.disconnected', 'Disconnected')}
                  </strong>
                  {isConnected && sessionStatus?.phoneNumber && (
                    <div className="text-muted small">
                      <i className="bi bi-phone me-1"></i>
                      +{sessionStatus.phoneNumber}
                    </div>
                  )}
                  {sessionStatus?.dbSession?.lastConnected && (
                    <div className="text-muted small">
                      {t('auto.lastConnected', 'Last connected')}: {new Date(sessionStatus.dbSession.lastConnected).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </Col>
            <Col md={6} className="text-md-end mt-3 mt-md-0">
              {!isConnected && !connecting ? (
                sessionStatus?.hasAuthData ? (
                  <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                    <Button variant="success" onClick={handleConnect}>
                      <i className="bi bi-play-circle me-2"></i>
                      {t('auto.connect', 'Connect')}
                    </Button>
                    <Button variant="outline-danger" onClick={() => handleDisconnect(true)} disabled={disconnecting}>
                      {activeAction === 'logout' ? <><Spinner animation="border" size="sm" className="me-2" />{t('auto.loggingOut', 'Logging out...')}</> : <><i className="bi bi-box-arrow-right me-2"></i>{t('auto.logout', 'Logout')}</>}
                    </Button>
                  </div>
                ) : (
                  <Button variant="success" onClick={handleConnect}>
                    <i className="bi bi-qr-code me-2"></i>
                    {t('auto.connectWhatsapp', 'Connect WhatsApp')}
                  </Button>
                )
              ) : isConnected ? (
                <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                  <Button variant="outline-warning" onClick={() => handleDisconnect(false)} disabled={disconnecting}>
                    {activeAction === 'disconnect' ? <><Spinner animation="border" size="sm" className="me-2" />{t('auto.disconnecting', 'Disconnecting...')}</> : <><i className="bi bi-pause-circle me-2"></i>{t('auto.disconnect', 'Disconnect')}</>}
                  </Button>
                  <Button variant="outline-danger" onClick={() => handleDisconnect(true)} disabled={disconnecting}>
                    {activeAction === 'logout' ? <><Spinner animation="border" size="sm" className="me-2" />{t('auto.loggingOut', 'Logging out...')}</> : <><i className="bi bi-box-arrow-right me-2"></i>{t('auto.logout', 'Logout')}</>}
                  </Button>
                </div>
              ) : null}
            </Col>
          </Row>

          {/* QR Code Display */}
          {connecting && (
            <div className="text-center mt-4 p-4 border rounded bg-light">
              {qrCode ? (
                <>
                  <p className="text-muted mb-3">
                    <i className="bi bi-phone me-2"></i>
                    {t('auto.scanQrWithWhatsapp', 'Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → Scan this QR code')}
                  </p>
                  <img src={qrCode} alt="WhatsApp QR Code" style={{ maxWidth: 300, border: '4px solid #25D366', borderRadius: 12, padding: 8 }} />
                </>
              ) : (
                <>
                  <Spinner animation="border" variant="success" />
                  <p className="mt-2 text-muted">
                    {sessionStatus?.hasAuthData
                      ? t('auto.connectingWithSavedSession', 'Connecting using saved session details...')
                      : t('auto.generatingQrCode', 'Generating QR code...')}
                  </p>
                </>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Send Welcome Message Section (only when connected) */}
      {isConnected && (
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-send me-2"></i>
              {t('auto.sendWelcomeMessage', 'Send Welcome Message to Admin')}
            </h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={5}>
                <Form.Group>
                  <Form.Label>{t('auto.selectAdmin', 'Select Admin')}</Form.Label>
                  <Form.Select
                    value={selectedAdmin}
                    onChange={(e) => setSelectedAdmin(e.target.value)}
                  >
                    <option value="">{t('auto.chooseAnAdmin', 'Choose an admin...')}</option>
                    {admins.map(admin => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({admin.mobile})
                        {admin.settings?.appTitle ? ` — ${admin.settings.appTitle}` : ''}
                      </option>
                    ))}
                  </Form.Select>
                  {admins.length === 0 && (
                    <Form.Text className="text-warning">
                      {t('auto.noAdminsWithWhatsapp', 'No admins found with WhatsApp numbers. Ensure admins have a mobile number marked as WhatsApp.')}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>{t('auto.password', 'Password')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auto.enterAdminPassword', "Enter admin's password")}
                  />
                  <Form.Text className="text-muted">
                    {t('auto.passwordWillBeIncluded', 'This password will be included in the welcome message')}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={3} className="d-flex align-items-end gap-2">
                <Button
                  variant="outline-info"
                  onClick={() => setShowPreview(true)}
                  disabled={!password}
                >
                  <i className="bi bi-eye me-1"></i>
                  {t('auto.preview', 'Preview')}
                </Button>
                <Button
                  variant="success"
                  onClick={handleSendWelcome}
                  disabled={sending || !selectedAdmin || !password}
                >
                  {sending ? (
                    <><Spinner animation="border" size="sm" className="me-2" />{t('auto.sending', 'Sending...')}</>
                  ) : (
                    <><i className="bi bi-whatsapp me-1"></i>{t('auto.send', 'Send')}</>
                  )}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Message Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg">
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="bi bi-eye me-2"></i>
            {t('auto.messagePreview', 'Message Preview')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div
            dir="rtl"
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif",
              fontSize: '1.05rem',
              lineHeight: 2,
              background: '#dcf8c6',
              padding: 20,
              borderRadius: 12,
              border: '1px solid #b4d9a0',
            }}
          >
            {password ? adminWelcomeMessage({ password }) : '...'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            {t('auto.close', 'Close')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Settings Section */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0">
            <i className="bi bi-gear me-2"></i>
            {t('auto.messageQueueSettings', 'Message Queue Settings')}
          </h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('auto.minDelaySeconds', 'Min Delay (seconds)')}</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={minDelay}
                  onChange={(e) => setMinDelay(parseInt(e.target.value) || 1)}
                />
                <Form.Text className="text-muted">
                  {t('auto.minimumWaitBetweenMessages', 'Minimum wait time between sending messages')}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('auto.maxDelaySeconds', 'Max Delay (seconds)')}</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={maxDelay}
                  onChange={(e) => setMaxDelay(parseInt(e.target.value) || 1)}
                />
                <Form.Text className="text-muted">
                  {t('auto.maximumWaitBetweenMessages', 'Maximum wait time between sending messages')}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('auto.dailyMessageLimit', 'Daily Message Limit')}</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={maxBatch}
                  onChange={(e) => setMaxBatch(parseInt(e.target.value) || 1)}
                />
                <Form.Text className="text-muted">
                  {t('auto.maxMessagesPerDay', 'Maximum messages that can be sent per day')}
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <div className="mt-3">
            <Button variant="primary" onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? (
                <><Spinner animation="border" size="sm" className="me-2" />{t('auto.saving', 'Saving...')}</>
              ) : (
                <><i className="bi bi-check-circle me-2"></i>{t('auto.saveSettings', 'Save Settings')}</>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Message Logs */}
      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-clock-history me-2"></i>
            {t('auto.messageLogs', 'Message Logs')}
          </h5>
          <div className="d-flex gap-2 align-items-center">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => fetchLogs(logsPage)}
              title={t('auto.refreshLogs', 'Refresh')}
              disabled={loadingLogs}
            >
              <i className={`bi bi-arrow-clockwise ${loadingLogs ? 'spin' : ''}`}></i>
            </Button>
            <Badge bg="secondary">{logsTotal} {t('auto.total', 'total')}</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loadingLogs ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-chat-dots display-6"></i>
              <p className="mt-2">{t('auto.noMessagesYet', 'No messages sent yet')}</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>{t('auto.date', 'Date')}</th>
                      <th>{t('auto.recipient', 'Recipient')}</th>
                      <th>{t('auto.type', 'Type')}</th>
                      <th>{t('auto.status', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td className="small">{new Date(log.createdAt).toLocaleString()}</td>
                        <td>
                          <div>{log.recipientName || '-'}</div>
                          <div className="text-muted small">{log.recipientPhone}</div>
                        </td>
                        <td>
                          <Badge bg="info" className="text-dark">{log.messageType}</Badge>
                        </td>
                        <td>
                          <Badge bg={
                            log.status === 'SENT' ? 'success' :
                            log.status === 'FAILED' ? 'danger' :
                            'warning'
                          }>
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {logsTotal > 20 && (
                <div className="d-flex justify-content-center p-3 gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={logsPage <= 1}
                    onClick={() => fetchLogs(logsPage - 1)}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </Button>
                  <span className="align-self-center small text-muted">
                    {t('auto.page', 'Page')} {logsPage} / {Math.ceil(logsTotal / 20)}
                  </span>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={logsPage >= Math.ceil(logsTotal / 20)}
                    onClick={() => fetchLogs(logsPage + 1)}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
