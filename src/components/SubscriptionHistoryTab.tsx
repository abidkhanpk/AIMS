import { useState, useEffect, useCallback } from 'react';
import { Table, Spinner, Alert, Badge, Button, Modal, Form, Row, Col } from 'react-bootstrap';

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
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extending, setExtending] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Extension form states
  const [extensionType, setExtensionType] = useState('MONTHLY');
  const [extensionAmount, setExtensionAmount] = useState(29.99);
  const [extensionCurrency, setExtensionCurrency] = useState('USD');
  const [paymentDetails, setPaymentDetails] = useState('');

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  ];

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
        return <Badge bg="success">Active</Badge>;
      case 'EXPIRED':
        return <Badge bg="danger">Expired</Badge>;
      case 'PENDING':
        return <Badge bg="warning">Pending</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" />
        <p className="mt-2 text-muted small">Loading subscription history...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {!hideHeaders && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Subscription History & Management</h6>
          {allowVerify && (
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowExtendModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Extend Subscription
            </Button>
          )}
        </div>
      )}

      {/* Current Subscriptions */}
      <div className="mb-4">
        {!hideHeaders && <h6 className="text-muted mb-2">Current Subscriptions</h6>}
        {subscriptions.length === 0 ? (
          <div className="text-center py-3 text-muted">
            <i className="bi bi-calendar-x display-6"></i>
            <p className="mt-2 mb-0">No subscription records found</p>
          </div>
        ) : (
          <div className="table-responsive">
            <Table size="sm" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Paid Date</th>
                  {allowVerify && <th>Actions</th>}
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
          <h6 className="text-muted mb-2">Payment History</h6>
          {payments.length === 0 ? (
            <div className="text-center py-3 text-muted">
              <i className="bi bi-credit-card display-6"></i>
              <p className="mt-2 mb-0">No payment records found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Payment Date</th>
                    <th>Expiry Extended</th>
                    <th>Details</th>
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
            Extend Subscription
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Extension Type</Form.Label>
                  <Form.Select 
                    value={extensionType}
                    onChange={(e) => setExtensionType(e.target.value)}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="LIFETIME">Lifetime</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select 
                    value={extensionCurrency}
                    onChange={(e) => setExtensionCurrency(e.target.value)}
                  >
                    {currencies.map((currency) => (
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
                  <Form.Label>Amount</Form.Label>
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
                  <Form.Label>Payment Details</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={3}
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    placeholder="Enter payment confirmation details, transaction ID, etc."
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtendModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleExtendSubscription}
            disabled={extending}
          >
            {extending ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Extending...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Extend Subscription
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
