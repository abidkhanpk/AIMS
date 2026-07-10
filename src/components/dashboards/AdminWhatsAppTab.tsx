import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spinner, Badge, Form, Table, Row, Col, Modal, Tabs, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  feeReminderMessage,
  attendanceAlertMessage,
  progressReportMessage,
  feePaymentConfirmationMessage,
  newParentWelcomeMessage,
  newTeacherWelcomeMessage,
  testResultMessage,
  MESSAGE_TYPE_LABELS,
} from '../../utils/whatsapp-templates';

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

export default function AdminWhatsAppTab() {
  const { t } = useTranslation('common');

  // Session state
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [activeAction, setActiveAction] = useState<'disconnect' | 'logout' | null>(null);
  const [qrPolling, setQrPolling] = useState(false);

  // Quick action data
  const [overdueFees, setOverdueFees] = useState<any[]>([]);
  const [absentToday, setAbsentToday] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Custom message state
  const [customRecipientType, setCustomRecipientType] = useState('parents');
  const [customSelectedRecipients, setCustomSelectedRecipients] = useState<string[]>([]);
  const [customText, setCustomText] = useState('');

  // Welcome message state
  const [welcomeType, setWelcomeType] = useState<'parent' | 'teacher'>('parent');
  const [welcomeRecipient, setWelcomeRecipient] = useState('');
  const [welcomePassword, setWelcomePassword] = useState('');
  const [welcomeStudentId, setWelcomeStudentId] = useState('');

  // Sending state
  const [sending, setSending] = useState(false);
  const [sendingAction, setSendingAction] = useState('');

  // Message logs
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logTypeFilter, setLogTypeFilter] = useState('');

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

  // Fetch recipient data
  const fetchRecipientData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [feesRes, absentRes, paymentsRes, parentsRes, teachersRes] = await Promise.all([
        fetch('/api/whatsapp/recipients?type=overdue-fees'),
        fetch('/api/whatsapp/recipients?type=absent-today'),
        fetch('/api/whatsapp/recipients?type=recent-payments'),
        fetch('/api/whatsapp/recipients?type=parents'),
        fetch('/api/whatsapp/recipients?type=teachers'),
      ]);

      if (feesRes.ok) setOverdueFees(await feesRes.json());
      if (absentRes.ok) setAbsentToday(await absentRes.json());
      if (paymentsRes.ok) setRecentPayments(await paymentsRes.json());
      if (parentsRes.ok) setParents(await parentsRes.json());
      if (teachersRes.ok) setTeachers(await teachersRes.json());
    } catch (e) {
      console.error('Failed to fetch recipient data:', e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Fetch message logs
  const fetchLogs = useCallback(async (page: number, typeFilter?: string) => {
    setLoadingLogs(true);
    try {
      let url = `/api/whatsapp/logs?page=${page}&limit=20`;
      if (typeFilter) url += `&messageType=${typeFilter}`;
      const res = await fetch(url);
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
    fetchRecipientData();
    fetchLogs(1);
  }, [fetchStatus, fetchRecipientData, fetchLogs]);

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
      } catch (e) { /* ignore */ }
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
        setTimeout(async () => {
          const qrRes = await fetch('/api/whatsapp/qr');
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            if (qrData.qr) setQrCode(qrData.qr);
            else if (qrData.connected) {
              setQrPolling(false);
              setConnecting(false);
              setSuccess(t('auto.whatsappConnectedSuccessfully', 'WhatsApp connected successfully!'));
              fetchStatus();
            }
          }
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to initialize');
        setConnecting(false);
      }
    } catch (e) {
      setError('Failed to connect to WhatsApp server');
      setConnecting(false);
    }
  };

  // Disconnect / Logout
  const handleDisconnect = async (removeAuth: boolean) => {
    const msg = removeAuth 
      ? t('auto.confirmLogoutWhatsapp', 'Are you sure you want to log out from WhatsApp? This will unlink your device, and you will need to scan the QR code again.')
      : t('auto.confirmDisconnectWhatsapp', 'Are you sure you want to disconnect WhatsApp? This will temporarily close the connection, but it will automatically wake up and reconnect when the next message is sent.');
      
    if (!confirm(msg)) return;
    setActiveAction(removeAuth ? 'logout' : 'disconnect');
    setDisconnecting(true);
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
      }
    } catch (e) {
      setError(removeAuth ? 'Failed to log out' : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
      setActiveAction(null);
    }
  };

  // Generic send helper
  const sendMessages = async (
    messages: Array<{ to: string; text: string; recipientName?: string; messageType?: string }>,
    messageType: string,
    actionLabel: string
  ) => {
    if (messages.length === 0) {
      setError(t('auto.noRecipientsFound', 'No recipients found for this action'));
      return;
    }
    setSending(true);
    setSendingAction(actionLabel);
    setError('');
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ to: m.to, text: m.text, recipientName: m.recipientName, messageType: m.messageType || messageType })),
          messageType,
        }),
      });
      if (res.ok) {
        setSuccess(`${messages.length} ${t('auto.messagesQueued', 'message(s) queued for delivery')}`);
        fetchLogs(1, logTypeFilter);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to send');
      }
    } catch (e) {
      setError('Failed to send messages');
    } finally {
      setSending(false);
      setSendingAction('');
    }
  };

  // ─── Quick Action Handlers ────────────────────────────

  const handleSendFeeReminders = () => {
    const messages = overdueFees.flatMap(fee =>
      (fee.student?.studentParents || []).map((ps: any) => ({
        to: ps.parent.mobile,
        text: feeReminderMessage({
          parentName: ps.parent.name,
          studentName: fee.student.name,
          feeTitle: fee.title,
          amount: fee.amount,
          currency: fee.currency,
          dueDate: new Date(fee.dueDate).toLocaleDateString(),
          courseName: fee.course?.name,
        }),
        recipientName: ps.parent.name,
        messageType: 'FEE_REMINDER',
      }))
    );
    sendMessages(messages, 'FEE_REMINDER', t('auto.feeReminders', 'Fee Reminders'));
  };

  const handleSendAttendanceAlerts = () => {
    const messages = absentToday.flatMap((absence: any) =>
      (absence.student?.studentParents || []).map((ps: any) => ({
        to: ps.parent.mobile,
        text: attendanceAlertMessage({
          parentName: ps.parent.name,
          studentName: absence.student.name,
          date: new Date(absence.date).toLocaleDateString(),
          courseName: absence.course?.name || '',
          teacherName: absence.teacher?.name,
        }),
        recipientName: ps.parent.name,
        messageType: 'ATTENDANCE_ALERT',
      }))
    );
    sendMessages(messages, 'ATTENDANCE_ALERT', t('auto.attendanceAlerts', 'Attendance Alerts'));
  };

  const handleSendPaymentConfirmations = () => {
    const messages = recentPayments.flatMap((fee: any) =>
      (fee.student?.studentParents || []).map((ps: any) => ({
        to: ps.parent.mobile,
        text: feePaymentConfirmationMessage({
          parentName: ps.parent.name,
          studentName: fee.student.name,
          feeTitle: fee.title,
          amount: fee.amount,
          currency: fee.currency,
          paidDate: fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : '-',
        }),
        recipientName: ps.parent.name,
        messageType: 'FEE_CONFIRMATION',
      }))
    );
    sendMessages(messages, 'FEE_CONFIRMATION', t('auto.paymentConfirmations', 'Payment Confirmations'));
  };

  const handleSendCustomMessages = () => {
    if (!customText.trim()) {
      setError(t('auto.pleaseEnterMessageText', 'Please enter the message text'));
      return;
    }
    const recipients = customRecipientType === 'parents' ? parents : teachers;
    const messages = recipients
      .filter(r => customSelectedRecipients.includes(r.id))
      .map(r => ({
        to: r.mobile,
        text: customText,
        recipientName: r.name,
        messageType: 'CUSTOM',
      }));
    sendMessages(messages, 'CUSTOM', t('auto.customMessages', 'Custom Messages'));
  };

  const handleSendWelcome = () => {
    if (!welcomeRecipient || !welcomePassword) {
      setError(t('auto.pleaseSelectRecipientAndPassword', 'Please select a recipient and enter the password'));
      return;
    }
    const list = welcomeType === 'parent' ? parents : teachers;
    const recipient = list.find((r: any) => r.id === welcomeRecipient);
    if (!recipient?.mobile) {
      setError(t('auto.recipientHasNoWhatsapp', 'Selected recipient has no WhatsApp number'));
      return;
    }

    let text: string;
    let msgType: string;

    if (welcomeType === 'parent') {
      const studentName = recipient.parentChildren?.[0]?.student?.name || '';
      text = newParentWelcomeMessage({
        parentName: recipient.name,
        studentName,
        email: recipient.email,
        password: welcomePassword,
      });
      msgType = 'WELCOME_PARENT';
    } else {
      text = newTeacherWelcomeMessage({
        teacherName: recipient.name,
        email: recipient.email,
        password: welcomePassword,
      });
      msgType = 'WELCOME_TEACHER';
    }

    sendMessages(
      [{ to: recipient.mobile, text, recipientName: recipient.name, messageType: msgType }],
      msgType,
      t('auto.welcomeMessage', 'Welcome Message')
    );
    setWelcomeRecipient('');
    setWelcomePassword('');
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

  const toggleRecipient = (id: string) => {
    setCustomSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleAllRecipients = () => {
    const list = customRecipientType === 'parents' ? parents : teachers;
    if (customSelectedRecipients.length === list.length) {
      setCustomSelectedRecipients([]);
    } else {
      setCustomSelectedRecipients(list.map((r: any) => r.id));
    }
  };

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

      {/* Sending overlay */}
      {sending && (
        <Alert variant="info">
          <Spinner animation="border" size="sm" className="me-2" />
          {t('auto.sendingMessages', 'Sending')}: {sendingAction}...
        </Alert>
      )}

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
                    width: 12, height: 12, borderRadius: '50%',
                    backgroundColor: isConnected ? '#28a745' : '#dc3545',
                    boxShadow: isConnected ? '0 0 8px rgba(40,167,69,0.5)' : '0 0 8px rgba(220,53,69,0.5)',
                  }}
                />
                <div>
                  <strong>{isConnected ? t('auto.connected', 'Connected') : t('auto.disconnected', 'Disconnected')}</strong>
                  {isConnected && sessionStatus?.phoneNumber && (
                    <div className="text-muted small"><i className="bi bi-phone me-1"></i>+{sessionStatus.phoneNumber}</div>
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
                    <i className="bi bi-qr-code me-2"></i>{t('auto.connectWhatsapp', 'Connect WhatsApp')}
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

          {connecting && (
            <div className="text-center mt-4 p-4 border rounded bg-light">
              {qrCode ? (
                <>
                  <p className="text-muted mb-3"><i className="bi bi-phone me-2"></i>{t('auto.scanQrWithWhatsapp', 'Open WhatsApp → Linked Devices → Link a Device → Scan QR')}</p>
                  <img src={qrCode} alt="QR" style={{ maxWidth: 300, border: '4px solid #25D366', borderRadius: 12, padding: 8 }} />
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

      {/* Quick Actions (only when connected) */}
      {isConnected && (
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-lightning me-2"></i>
              {t('auto.quickMessageActions', 'Quick Message Actions')}
            </h5>
          </Card.Header>
          <Card.Body>
            {loadingData ? (
              <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
            ) : (
              <Tabs defaultActiveKey="fee-reminders" className="mb-3">
                {/* Fee Reminders Tab */}
                <Tab eventKey="fee-reminders" title={<span><i className="bi bi-cash-coin me-1"></i>{t('auto.feeReminders', 'Fee Reminders')} <Badge bg="danger">{overdueFees.length}</Badge></span>}>
                  <div className="mb-3">
                    <p className="text-muted small">{t('auto.feeRemindersDesc', 'Send fee reminders to parents of students with overdue/pending fees')}</p>
                    {overdueFees.length > 0 ? (
                      <>
                        <div className="table-responsive">
                          <Table size="sm" hover className="mb-3">
                            <thead className="table-light">
                              <tr>
                                <th>{t('auto.student', 'Student')}</th>
                                <th>{t('auto.fee', 'Fee')}</th>
                                <th>{t('auto.amount', 'Amount')}</th>
                                <th>{t('auto.dueDate', 'Due Date')}</th>
                                <th>{t('auto.parent', 'Parent')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {overdueFees.map(fee => (
                                <tr key={fee.id}>
                                  <td>{fee.student?.name}</td>
                                  <td>{fee.title}</td>
                                  <td>{fee.currency} {fee.amount}</td>
                                  <td className="small">{new Date(fee.dueDate).toLocaleDateString()}</td>
                                  <td>
                                    {fee.student?.studentParents?.map((ps: any) => (
                                      <Badge key={ps.parent.id} bg="info" className="text-dark me-1">{ps.parent.name}</Badge>
                                    )) || <span className="text-muted">-</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                        <Button variant="warning" onClick={handleSendFeeReminders} disabled={sending}>
                          <i className="bi bi-send me-2"></i>
                          {t('auto.sendAllFeeReminders', 'Send All Fee Reminders')} ({overdueFees.length})
                        </Button>
                      </>
                    ) : (
                      <div className="text-center text-muted py-3">
                        <i className="bi bi-check-circle display-6"></i>
                        <p className="mt-2">{t('auto.noOverdueFees', 'No overdue fees found')}</p>
                      </div>
                    )}
                  </div>
                </Tab>

                {/* Attendance Alerts Tab */}
                <Tab eventKey="attendance" title={<span><i className="bi bi-calendar-x me-1"></i>{t('auto.attendanceAlerts', 'Attendance')} <Badge bg="warning" className="text-dark">{absentToday.length}</Badge></span>}>
                  <p className="text-muted small">{t('auto.attendanceAlertsDesc', "Send absence alerts to parents for today's absent students")}</p>
                  {absentToday.length > 0 ? (
                    <>
                      <div className="table-responsive">
                        <Table size="sm" hover className="mb-3">
                          <thead className="table-light">
                            <tr>
                              <th>{t('auto.student', 'Student')}</th>
                              <th>{t('auto.course', 'Course')}</th>
                              <th>{t('auto.teacher', 'Teacher')}</th>
                              <th>{t('auto.parent', 'Parent')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {absentToday.map((a: any) => (
                              <tr key={a.id}>
                                <td>{a.student?.name}</td>
                                <td>{a.course?.name}</td>
                                <td>{a.teacher?.name}</td>
                                <td>
                                  {a.student?.studentParents?.map((ps: any) => (
                                    <Badge key={ps.parent.id} bg="info" className="text-dark me-1">{ps.parent.name}</Badge>
                                  )) || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                      <Button variant="warning" onClick={handleSendAttendanceAlerts} disabled={sending}>
                        <i className="bi bi-send me-2"></i>
                        {t('auto.sendAllAttendanceAlerts', 'Send All Attendance Alerts')} ({absentToday.length})
                      </Button>
                    </>
                  ) : (
                    <div className="text-center text-muted py-3">
                      <i className="bi bi-emoji-smile display-6"></i>
                      <p className="mt-2">{t('auto.noAbsencesToday', 'No absences recorded today')}</p>
                    </div>
                  )}
                </Tab>

                {/* Payment Confirmations Tab */}
                <Tab eventKey="payments" title={<span><i className="bi bi-check-circle me-1"></i>{t('auto.paymentConfirmations', 'Payments')} <Badge bg="success">{recentPayments.length}</Badge></span>}>
                  <p className="text-muted small">{t('auto.paymentConfirmationsDesc', 'Send payment confirmation to parents for recently paid fees (last 7 days)')}</p>
                  {recentPayments.length > 0 ? (
                    <>
                      <div className="table-responsive">
                        <Table size="sm" hover className="mb-3">
                          <thead className="table-light">
                            <tr>
                              <th>{t('auto.student', 'Student')}</th>
                              <th>{t('auto.fee', 'Fee')}</th>
                              <th>{t('auto.amount', 'Amount')}</th>
                              <th>{t('auto.paidDate', 'Paid Date')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentPayments.map((p: any) => (
                              <tr key={p.id}>
                                <td>{p.student?.name}</td>
                                <td>{p.title}</td>
                                <td>{p.currency} {p.amount}</td>
                                <td className="small">{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                      <Button variant="success" onClick={handleSendPaymentConfirmations} disabled={sending}>
                        <i className="bi bi-send me-2"></i>
                        {t('auto.sendAllConfirmations', 'Send All Confirmations')} ({recentPayments.length})
                      </Button>
                    </>
                  ) : (
                    <div className="text-center text-muted py-3">
                      <i className="bi bi-inbox display-6"></i>
                      <p className="mt-2">{t('auto.noRecentPayments', 'No recent payments found')}</p>
                    </div>
                  )}
                </Tab>

                {/* Welcome Messages Tab */}
                <Tab eventKey="welcome" title={<span><i className="bi bi-person-plus me-1"></i>{t('auto.welcome', 'Welcome')}</span>}>
                  <p className="text-muted small">{t('auto.welcomeDesc', 'Send welcome message with login credentials to new parents or teachers')}</p>
                  <Row className="g-3">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>{t('auto.recipientType', 'Type')}</Form.Label>
                        <Form.Select value={welcomeType} onChange={(e) => { setWelcomeType(e.target.value as any); setWelcomeRecipient(''); }}>
                          <option value="parent">{t('auto.parent', 'Parent')}</option>
                          <option value="teacher">{t('auto.teacher', 'Teacher')}</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>{t('auto.selectRecipient', 'Recipient')}</Form.Label>
                        <Form.Select value={welcomeRecipient} onChange={(e) => setWelcomeRecipient(e.target.value)}>
                          <option value="">{t('auto.choose', 'Choose...')}</option>
                          {(welcomeType === 'parent' ? parents : teachers).map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name} ({r.mobile})</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>{t('auto.password', 'Password')}</Form.Label>
                        <Form.Control
                          type="text"
                          value={welcomePassword}
                          onChange={(e) => setWelcomePassword(e.target.value)}
                          placeholder={t('auto.enterPassword', 'Enter password')}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={2} className="d-flex align-items-end">
                      <Button variant="primary" onClick={handleSendWelcome} disabled={sending || !welcomeRecipient || !welcomePassword} className="w-100">
                        <i className="bi bi-send me-1"></i>{t('auto.send', 'Send')}
                      </Button>
                    </Col>
                  </Row>
                </Tab>

                {/* Custom Message Tab */}
                <Tab eventKey="custom" title={<span><i className="bi bi-pencil-square me-1"></i>{t('auto.customMessage', 'Custom')}</span>}>
                  <p className="text-muted small">{t('auto.customMessageDesc', 'Send a custom message to selected parents or teachers')}</p>
                  <Row className="g-3">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>{t('auto.sendTo', 'Send To')}</Form.Label>
                        <Form.Select value={customRecipientType} onChange={(e) => { setCustomRecipientType(e.target.value); setCustomSelectedRecipients([]); }}>
                          <option value="parents">{t('auto.parents', 'Parents')}</option>
                          <option value="teachers">{t('auto.teachers', 'Teachers')}</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={9}>
                      <Form.Group>
                        <Form.Label>
                          {t('auto.message', 'Message')}
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          placeholder={t('auto.typeYourMessage', 'Type your message...')}
                          dir="rtl"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <div className="border rounded p-3" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        <Form.Check
                          type="checkbox"
                          label={<strong>{t('auto.selectAll', 'Select All')}</strong>}
                          checked={customSelectedRecipients.length === (customRecipientType === 'parents' ? parents : teachers).length && customSelectedRecipients.length > 0}
                          onChange={toggleAllRecipients}
                          className="mb-2"
                        />
                        <hr className="my-1" />
                        {(customRecipientType === 'parents' ? parents : teachers).map((r: any) => (
                          <Form.Check
                            key={r.id}
                            type="checkbox"
                            label={`${r.name} (${r.mobile})`}
                            checked={customSelectedRecipients.includes(r.id)}
                            onChange={() => toggleRecipient(r.id)}
                          />
                        ))}
                      </div>
                    </Col>
                    <Col md={12}>
                      <Button
                        variant="primary"
                        onClick={handleSendCustomMessages}
                        disabled={sending || customSelectedRecipients.length === 0 || !customText.trim()}
                      >
                        <i className="bi bi-send me-2"></i>
                        {t('auto.sendToSelected', 'Send to Selected')} ({customSelectedRecipients.length})
                      </Button>
                    </Col>
                  </Row>
                </Tab>
              </Tabs>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Settings Section */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0"><i className="bi bi-gear me-2"></i>{t('auto.messageQueueSettings', 'Message Queue Settings')}</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('auto.minDelaySeconds', 'Min Delay (seconds)')}</Form.Label>
                <Form.Control type="number" min={1} value={minDelay} onChange={(e) => setMinDelay(parseInt(e.target.value) || 1)} />
                <Form.Text className="text-muted">{t('auto.minimumWaitBetweenMessages', 'Minimum wait between messages')}</Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('auto.maxDelaySeconds', 'Max Delay (seconds)')}</Form.Label>
                <Form.Control type="number" min={1} value={maxDelay} onChange={(e) => setMaxDelay(parseInt(e.target.value) || 1)} />
                <Form.Text className="text-muted">{t('auto.maximumWaitBetweenMessages', 'Maximum wait between messages')}</Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('auto.dailyMessageLimit', 'Daily Limit')}</Form.Label>
                <Form.Control type="number" min={1} value={maxBatch} onChange={(e) => setMaxBatch(parseInt(e.target.value) || 1)} />
                <Form.Text className="text-muted">{t('auto.maxMessagesPerDay', 'Max messages per day')}</Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <div className="mt-3">
            <Button variant="primary" onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? <><Spinner animation="border" size="sm" className="me-2" />{t('auto.saving', 'Saving...')}</> : <><i className="bi bi-check-circle me-2"></i>{t('auto.saveSettings', 'Save Settings')}</>}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Message Logs */}
      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 className="mb-0"><i className="bi bi-clock-history me-2"></i>{t('auto.messageLogs', 'Message Logs')} <Badge bg="secondary">{logsTotal}</Badge></h5>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => fetchLogs(logsPage, logTypeFilter)}
              title={t('auto.refreshLogs', 'Refresh Logs')}
              disabled={loadingLogs}
            >
              <i className={`bi bi-arrow-clockwise ${loadingLogs ? 'spin' : ''}`}></i>
            </Button>
            <Form.Select
              style={{ width: 200 }}
              size="sm"
              value={logTypeFilter}
              onChange={(e) => { setLogTypeFilter(e.target.value); fetchLogs(1, e.target.value); }}
            >
              <option value="">{t('auto.allTypes', 'All Types')}</option>
              {Object.entries(MESSAGE_TYPE_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.en}</option>
              ))}
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loadingLogs ? (
            <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
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
                        <td><Badge bg="info" className="text-dark">{log.messageType}</Badge></td>
                        <td>
                          <Badge bg={log.status === 'SENT' ? 'success' : log.status === 'FAILED' ? 'danger' : 'warning'}>{log.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {logsTotal > 20 && (
                <div className="d-flex justify-content-center p-3 gap-2">
                  <Button variant="outline-secondary" size="sm" disabled={logsPage <= 1} onClick={() => fetchLogs(logsPage - 1, logTypeFilter)}>
                    <i className="bi bi-chevron-left"></i>
                  </Button>
                  <span className="align-self-center small text-muted">{t('auto.page', 'Page')} {logsPage}/{Math.ceil(logsTotal / 20)}</span>
                  <Button variant="outline-secondary" size="sm" disabled={logsPage >= Math.ceil(logsTotal / 20)} onClick={() => fetchLogs(logsPage + 1, logTypeFilter)}>
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
