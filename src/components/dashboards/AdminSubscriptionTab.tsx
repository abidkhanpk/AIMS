import React, { useEffect, useMemo, useState } from 'react';
import { Table, Badge, Button, Alert, Spinner, Card, Row, Col, Form } from 'react-bootstrap';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';
import { SubscriptionStatus, SubscriptionPlan } from '@prisma/client';
import SubscriptionHistoryTab from '../SubscriptionHistoryTab';

interface SubscriptionRec {
  id: string;
  adminId: string;
  plan: SubscriptionPlan;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string | null;
  status: SubscriptionStatus;
  paidAmount?: number | null;
  paidDate?: string | null;
  paymentDetails?: string | null;
  paymentProof?: string | null;
}

const statusOptions: Array<{ value: 'ALL' | SubscriptionStatus; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Paid' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const AdminSubscriptionTab: React.FC = () => {
  const [subs, setSubs] = useState<SubscriptionRec[]>([]);
  const [payments, setPayments] = useState<Array<{ id: string; amount: number; currency: string; plan: SubscriptionPlan; paymentDate: string; expiryExtended: string; paymentDetails?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Default to ALL so admins can see previous payments and any subscriptions available to pay.
  const [statusFilter, setStatusFilter] = useState<'ALL' | SubscriptionStatus>('ALL');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriptionRec | null>(null);
  const [editMode, setEditMode] = useState(false);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubs(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch subscriptions');
        setSubs([]);
      }
      // Also fetch payments history
      const res2 = await fetch('/api/subscriptions/manage');
      if (res2.ok) {
        const data2 = await res2.json();
        setPayments(data2.payments || []);
      }
    } catch (e) {
      setError('Error fetching subscriptions');
      setSubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const onSubmitPayment = async (payload: { subscriptionId: string; paidAmount: number; paidDate?: string; paymentDetails?: string; paymentProof?: string; }) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/subscriptions/pay', {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSuccess(editMode ? 'Payment updated' : 'Payment submitted for verification');
        setShowPaymentModal(false);
        setSelectedSub(null);
        setEditMode(false);
        fetchSubs();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to submit payment');
      }
    } catch (e) {
      setError('Error submitting payment');
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge bg="success">Paid</Badge>;
      case 'PENDING':
        return <Badge bg="warning">Pending</Badge>;
      case 'PROCESSING':
        return <Badge bg="info">Processing</Badge>;
      case 'EXPIRED':
        return <Badge bg="danger">Expired</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const filtered = useMemo(() => {
    const sorted = [...subs].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    if (statusFilter === 'ALL') return sorted;
    return sorted.filter(s => s.status === statusFilter);
  }, [subs, statusFilter]);

  const isNearExpiry = (sub: SubscriptionRec) => {
    if (!sub.endDate) return false;
    const end = new Date(sub.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 10; // show renewal option if expiring within 10 days
  };

  return (
    <>
      <Card className="shadow-sm mt-4">
        <Card.Header className="bg-light d-flex align-items-center justify-content-between">
          <h6 className="mb-0">
            <i className="bi bi-wallet2 me-2"></i>
            Payment History
          </h6>
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0">Status</label>
            <Form.Select size="sm" style={{ width: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              {statusOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible className="m-3">{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible className="m-3">{success}</Alert>}
          {loading ? (
            <div className="text-center py-4"><Spinner animation="border" size="sm" /><p className="mt-2 text-muted small">Loading subscriptions...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-4"><p className="mt-2 text-muted small">No subscriptions found</p></div>
          ) : (
            <Table hover size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Paid Amount</th>
                  <th>Paid Date</th>
                  <th>Payment Details</th>
                  <th>Proof</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td><Badge bg="warning" className="text-dark">{s.plan}</Badge></td>
                    <td className="fw-bold text-success">{s.amount.toFixed(2)} {s.currency}</td>
                    <td>
                      {getStatusBadge(s.status)}
                      {isNearExpiry(s) && s.status !== 'PROCESSING' && (
                        <div className="text-danger small">Expiring soon</div>
                      )}
                    </td>
                    <td className="small">{new Date(s.startDate).toLocaleDateString()}</td>
                    <td className="small">{s.endDate ? new Date(s.endDate).toLocaleDateString() : 'Lifetime'}</td>
                    <td>{s.paidAmount ?? '-'}</td>
                    <td className="small">{s.paidDate ? new Date(s.paidDate).toLocaleDateString() : '-'}</td>
                    <td className="small">{s.paymentDetails || '-'}</td>
                    <td>
                      {s.paymentProof ? (
                        <a href={s.paymentProof} target="_blank" rel="noopener noreferrer">View</a>
                      ) : 'N/A'}
                    </td>
                    <td className="d-flex gap-2">
                      {(s.status === 'PENDING' || s.status === 'EXPIRED' || isNearExpiry(s)) && (
                        <Button size="sm" variant="primary" onClick={() => { setSelectedSub(s); setEditMode(false); setShowPaymentModal(true); }}>
                          <i className="bi bi-cash me-1"></i> Pay
                        </Button>
                      )}
                      {s.status === 'PROCESSING' && (
                        <>
                          <Button size="sm" variant="warning" onClick={() => { setSelectedSub(s); setEditMode(true); setShowPaymentModal(true); }}>
                            <i className="bi bi-pencil me-1"></i>Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={async () => {
                              setError('');
                              setSuccess('');
                              try {
                                const res = await fetch('/api/subscriptions/pay', {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ subscriptionId: s.id })
                                });
                                if (res.ok) {
                                  setSuccess('Payment request deleted');
                                  fetchSubs();
                                } else {
                                  const err = await res.json();
                                  setError(err.message || 'Failed to delete payment');
                                }
                              } catch {
                                setError('Error deleting payment');
                              }
                            }}
                          >
                            <i className="bi bi-trash me-1"></i>Delete
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>

        <SubscriptionPaymentModal
          show={showPaymentModal}
          onHide={() => { setShowPaymentModal(false); setSelectedSub(null); setEditMode(false); }}
          subscription={selectedSub}
          onPaymentSubmit={onSubmitPayment}
        />
      </Card>

      <Card className="shadow-sm mt-3">
        <Card.Header className="bg-light">
          <h6 className="mb-0">Payment History (Verified)</h6>
        </Card.Header>
        <Card.Body className="p-0">
          {payments.length === 0 ? (
            <div className="text-center py-3 text-muted small">No payment records found</div>
          ) : (
            <Table hover size="sm" className="mb-0">
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
                {payments
                  .slice()
                  .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                  .map(p => (
                  <tr key={p.id}>
                    <td><Badge bg="warning" className="text-dark">{p.plan}</Badge></td>
                    <td className="fw-bold text-success">{p.amount.toFixed(2)} {p.currency}</td>
                    <td className="small">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="small">{new Date(p.expiryExtended).toLocaleDateString()}</td>
                    <td className="small">{p.paymentDetails || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm mt-3">
        <Card.Header className="bg-light">
          <h6 className="mb-0">Subscription History</h6>
        </Card.Header>
        <Card.Body>
          <SubscriptionHistoryTab />
        </Card.Body>
      </Card>
    </>
  );
};

export default AdminSubscriptionTab;
