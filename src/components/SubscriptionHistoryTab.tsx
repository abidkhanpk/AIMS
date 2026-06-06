import { useState, useEffect, useCallback } from 'react';
import { Table, Spinner, Alert, Badge, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import { currencies } from '../utils/currencies';
import { useTranslation } from 'react-i18next';

interface SubscriptionHistoryProps {
  adminId?: string; // if undefined and user is ADMIN, server will use session user
  allowVerify?: boolean; // when true (developer context), show verify actions
  hideHeaders?: boolean; // when true, hide top headings/labels
  hidePaymentHistory?: boolean; // when true, skip payment history table
}

interface SubscriptionRecord {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate?: string;
  status: string;
  paidDate?: string;
  paidBy?: {
    name: string;
    email: string;
  };
  paidAmount?: number;
  paymentDetails?: string;
  paymentProof?: string;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  plan: string;
  paymentDate: string;
  expiryExtended: string;
  paymentDetails?: string;
  createdAt: string;
}

export default function SubscriptionHistoryTab({
  adminId,
  allowVerify = false,
  hideHeaders = false,
  hidePaymentHistory = false,
}: SubscriptionHistoryProps) {
    const { t } = useTranslation('common');
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extending, setExtending] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriptionRecord | null>(null);

  // Extension form states
  const [extensionType, setExtensionType] = useState('MONTHLY');
  const [extensionAmount, setExtensionAmount] = useState(29.99);
  const [extensionCurrency, setExtensionCurrency] = useState('USD');
  const [paymentDetails, setPaymentDetails] = useState('');

  const fetchSubscriptionHistory = useCallback(async () => {
    try {
      setLoading(true);
      const url = adminId ? `/api/subscriptions/history?adminId=${adminId}` : '/api/subscriptions/history';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
        setPayments(data.payments || []);
      } else {
        setError('Failed to fetch subscription history');
      }
    } catch (error) {
      setError('Error fetching subscription history');
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchSubscriptionHistory();
  }, [adminId, fetchSubscriptionHistory]);

  const handleExtendSubscription = async () => {
    setExtending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/subscriptions/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId,
          plan: extensionType,
          amount: extensionAmount,
          currency: extensionCurrency,
          paymentDetails
        })
      });

      if (res.ok) {
        setSuccess('Subscription extended successfully!');
        fetchSubscriptionHistory();
        setShowExtendModal(false);
        setPaymentDetails('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to extend subscription');
      }
    } catch (error) {
      setError('Error extending subscription');
    } finally {
      setExtending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge bg="success">{t('auto.active', `Active`)}</Badge>;
      case 'EXPIRED':
        return <Badge bg="danger">{t('auto.expired', `Expired`)}</Badge>;
      case 'PENDING':
        return <Badge bg="warning">{t('auto.pending', `Pending`)}</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">{t('auto.cancelled', `Cancelled`)}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find((c: any) => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" />
        <p className="mt-2 text-muted small">{t('auto.loadingSubscriptionHistory', `Loading subscription history...`)}</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {!hideHeaders && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">{t('auto.subscriptionHistoryManagement', `Subscription History & Management`)}</h6>
          {allowVerify && (
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowExtendModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              {t('auto.extendSubscription', `Extend Subscription`)}
                                      </Button>
          )}
        </div>
      )}

      {/* Current Subscriptions */}
      <div className="mb-4">
        {!hideHeaders && <h6 className="text-muted mb-2">{t('auto.currentSubscriptions', `Current Subscriptions`)}</h6>}
        {subscriptions.length === 0 ? (
          <div className="text-center py-3 text-muted">
            <i className="bi bi-calendar-x display-6"></i>
            <p className="mt-2 mb-0">{t('auto.noSubscriptionRecordsFound', `No subscription records found`)}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table size="sm" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>{t('auto.plan', `Plan`)}</th>
                  <th>{t('auto.amount', `Amount`)}</th>
                  <th>{t('auto.startDate', `Start Date`)}</th>
                  <th>{t('auto.endDate', `End Date`)}</th>
                  <th>{t('auto.status', `Status`)}</th>
                  <th>{t('auto.paidDate', `Paid Date`)}</th>
                  <th>{t('auto.details', `Details`)}</th>
                  {allowVerify && <th>{t('auto.actions', `Actions`)}</th>}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <Badge bg="info">{sub.plan}</Badge>
                    </td>
                    <td className="fw-bold text-success">
                      {getCurrencySymbol(sub.currency)}{sub.amount.toFixed(2)}
                    </td>
                    <td className="small">
                      {new Date(sub.startDate).toLocaleDateString()}
                    </td>
                    <td className="small">
                      {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'Lifetime'}
                    </td>
                    <td>{getStatusBadge(sub.status)}</td>
                    <td className="small">
                      {sub.paidDate ? new Date(sub.paidDate).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => {
                          setSelectedSub(sub);
                          setShowDetailsModal(true);
                        }}
                      >
                        <i className="bi bi-eye"></i>
                      </Button>
                    </td>
                    {allowVerify && (
                      <td>
                        {sub.status === 'PROCESSING' ? (
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-success"
                              disabled={verifyingId === sub.id}
                              onClick={async () => {
                                setVerifyingId(sub.id);
                                setError('');
                                setSuccess('');
                                try {
                                  const res = await fetch('/api/subscriptions/verify', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ subscriptionId: sub.id, approved: true })
                                  });
                                  if (res.ok) {
                                    setSuccess('Subscription payment approved');
                                    fetchSubscriptionHistory();
                                  } else {
                                    const err = await res.json();
                                    setError(err.message || 'Failed to approve');
                                  }
                                } catch (e) {
                                  setError('Error approving payment');
                                } finally {
                                  setVerifyingId(null);
                                }
                              }}
                            >
                              <i className="bi bi-check-lg"></i>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              disabled={verifyingId === sub.id}
                              onClick={async () => {
                                setVerifyingId(sub.id);
                                setError('');
                                setSuccess('');
                                try {
                                  const res = await fetch('/api/subscriptions/verify', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ subscriptionId: sub.id, approved: false })
                                  });
                                  if (res.ok) {
                                    setSuccess('Subscription payment rejected');
                                    fetchSubscriptionHistory();
                                  } else {
                                    const err = await res.json();
                                    setError(err.message || 'Failed to reject');
                                  }
                                } catch (e) {
                                  setError('Error rejecting payment');
                                } finally {
                                  setVerifyingId(null);
                                }
                              }}
                            >
                              <i className="bi bi-x-lg"></i>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Payment History */}
      {!hidePaymentHistory && (
        <div>
          <h6 className="text-muted mb-2">{t('auto.paymentHistory', `Payment History`)}</h6>
          {payments.length === 0 ? (
            <div className="text-center py-3 text-muted">
              <i className="bi bi-credit-card display-6"></i>
              <p className="mt-2 mb-0">{t('auto.noPaymentRecordsFound', `No payment records found`)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('auto.plan', `Plan`)}</th>
                    <th>{t('auto.amount', `Amount`)}</th>
                    <th>{t('auto.paymentDate', `Payment Date`)}</th>
                    <th>{t('auto.expiryExtended', `Expiry Extended`)}</th>
                    <th>{t('auto.details', `Details`)}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <Badge bg="warning" className="text-dark">{payment.plan}</Badge>
                      </td>
                      <td className="fw-bold text-success">
                        {getCurrencySymbol(payment.currency)}{payment.amount.toFixed(2)}
                      </td>
                      <td className="small">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="small">
                        {new Date(payment.expiryExtended).toLocaleDateString()}
                      </td>
                      <td className="small">
                        {payment.paymentDetails || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Extend Subscription Modal */}
      <Modal show={showExtendModal} onHide={() => setShowExtendModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-calendar-plus me-2"></i>
            {t('auto.extendSubscription', `Extend Subscription`)}
                                </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.extensionType', `Extension Type`)}</Form.Label>
                  <Form.Select 
                    value={extensionType}
                    onChange={(e) => setExtensionType(e.target.value)}
                  >
                    <option value="MONTHLY">{t('auto.monthly', `Monthly`)}</option>
                    <option value="YEARLY">{t('auto.yearly', `Yearly`)}</option>
                    <option value="LIFETIME">{t('auto.lifetime', `Lifetime`)}</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
                  <Form.Select 
                    value={extensionCurrency}
                    onChange={(e) => setExtensionCurrency(e.target.value)}
                  >
                    {currencies.map((currency: any) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.amount', `Amount`)}</Form.Label>
                  <Form.Control 
                    type="number"
                    step="0.01"
                    value={extensionAmount}
                    onChange={(e) => setExtensionAmount(parseFloat(e.target.value))}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.paymentDetails', `Payment Details`)}</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={3}
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    placeholder={t('auto.enterPaymentConfirmationDetail', `Enter payment confirmation details, transaction ID, etc.`)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtendModal(false)}>
            {t('auto.cancel', `Cancel`)}
                                </Button>
          <Button 
            variant="primary" 
            onClick={handleExtendSubscription}
            disabled={extending}
          >
            {extending ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('auto.extending', `Extending...`)}
                                            </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                {t('auto.extendSubscription', `Extend Subscription`)}
                                                </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-file-earmark-text me-2"></i>
            {t('auto.paymentDetailsTitle', 'Subscription Payment Details')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSub && (
            <div>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.planLabel', 'Plan:')}</strong>{' '}
                  <Badge bg="info">{selectedSub.plan}</Badge>
                </Col>
                <Col md={6}>
                  <strong>{t('auto.statusLabel', 'Status:')}</strong>{' '}
                  {getStatusBadge(selectedSub.status)}
                </Col>
              </Row>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.amountLabel', 'Expected Amount:')}</strong>{' '}
                  <span className="fw-bold text-success">
                    {getCurrencySymbol(selectedSub.currency)}{selectedSub.amount.toFixed(2)}
                  </span>
                </Col>
                <Col md={6}>
                  <strong>{t('auto.paidAmountLabel', 'Paid Amount:')}</strong>{' '}
                  <span className="fw-bold text-success">
                    {selectedSub.paidAmount !== undefined && selectedSub.paidAmount !== null ? (
                      `${getCurrencySymbol(selectedSub.currency)}${selectedSub.paidAmount.toFixed(2)}`
                    ) : (
                      '-'
                    )}
                  </span>
                </Col>
              </Row>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.startDateLabel', 'Start Date:')}</strong>{' '}
                  {new Date(selectedSub.startDate).toLocaleDateString()}
                </Col>
                <Col md={6}>
                  <strong>{t('auto.endDateLabel', 'End Date:')}</strong>{' '}
                  {selectedSub.endDate ? new Date(selectedSub.endDate).toLocaleDateString() : 'Lifetime'}
                </Col>
              </Row>
              <Row className="mb-3 border-bottom pb-2 g-2">
                <Col md={6}>
                  <strong>{t('auto.paidDateLabel', 'Submitted/Paid Date:')}</strong>{' '}
                  {selectedSub.paidDate ? new Date(selectedSub.paidDate).toLocaleDateString() : '-'}
                </Col>
                <Col md={6}>
                  <strong>{t('auto.paidByLabel', 'Paid By:')}</strong>{' '}
                  {selectedSub.paidBy ? `${selectedSub.paidBy.name} (${selectedSub.paidBy.email})` : '-'}
                </Col>
              </Row>
              <div className="mb-3 border-bottom pb-2">
                <strong>{t('auto.detailsLabel', 'Payment Details/Remarks:')}</strong>
                <p className="bg-light p-2 rounded mt-1 border" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedSub.paymentDetails || t('auto.noDetailsSubmitted', 'No details submitted')}
                </p>
              </div>
              <div className="mb-3">
                <strong>{t('auto.paymentProof', 'Payment Proof:')}</strong>
                {selectedSub.paymentProof ? (
                  <div className="mt-2 border rounded p-2 bg-light text-center">
                    <div className="mb-2">
                      <a
                        href={selectedSub.paymentProof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-box-arrow-up-right me-1"></i>
                        {t('auto.openInNewTab', 'Open Image in New Tab')}
                      </a>
                    </div>
                    <img
                      src={selectedSub.paymentProof}
                      alt={t('auto.paymentProofAlt', 'Payment Proof Screenshot')}
                      className="img-fluid rounded border shadow-sm"
                      style={{ maxHeight: '400px', objectFit: 'contain', cursor: 'pointer' }}
                      onClick={() => window.open(selectedSub.paymentProof, '_blank')}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.style.display = 'none';
                        const msg = img.nextSibling as HTMLElement | null;
                        if (msg) msg.style.display = 'block';
                      }}
                    />
                    <p className="text-danger small mt-1" style={{ display: 'none' }}>
                      {t('auto.imageLoadError', 'Could not load image. Use "Open Image in New Tab" to view it.')}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted mt-1">{t('auto.noProofUploaded', 'No proof screenshot uploaded')}</p>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {allowVerify && selectedSub && selectedSub.status === 'PROCESSING' && (
            <div className="d-flex gap-2 me-auto">
              <Button
                variant="success"
                disabled={verifyingId === selectedSub.id}
                onClick={async () => {
                  setVerifyingId(selectedSub.id);
                  setError('');
                  setSuccess('');
                  try {
                    const res = await fetch('/api/subscriptions/verify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subscriptionId: selectedSub.id, approved: true })
                    });
                    if (res.ok) {
                      setSuccess('Subscription payment approved');
                      setShowDetailsModal(false);
                      fetchSubscriptionHistory();
                    } else {
                      const err = await res.json();
                      setError(err.message || 'Failed to approve');
                    }
                  } catch (e) {
                    setError('Error approving payment');
                  } finally {
                    setVerifyingId(null);
                  }
                }}
              >
                {verifyingId === selectedSub.id ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-check-lg me-1"></i>}
                {t('auto.approve', 'Approve')}
              </Button>
              <Button
                variant="danger"
                disabled={verifyingId === selectedSub.id}
                onClick={async () => {
                  setVerifyingId(selectedSub.id);
                  setError('');
                  setSuccess('');
                  try {
                    const res = await fetch('/api/subscriptions/verify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subscriptionId: selectedSub.id, approved: false })
                    });
                    if (res.ok) {
                      setSuccess('Subscription payment rejected');
                      setShowDetailsModal(false);
                      fetchSubscriptionHistory();
                    } else {
                      const err = await res.json();
                      setError(err.message || 'Failed to reject');
                    }
                  } catch (e) {
                    setError('Error rejecting payment');
                  } finally {
                    setVerifyingId(null);
                  }
                }}
              >
                {verifyingId === selectedSub.id ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-x-lg me-1"></i>}
                {t('auto.reject', 'Reject')}
              </Button>
            </div>
          )}
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            {t('auto.close', 'Close')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
