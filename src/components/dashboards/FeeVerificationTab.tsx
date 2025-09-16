import React, { useState, useEffect, useCallback } from 'react';
import { Table, Badge, Button, Alert, Spinner, Card, Form, Row, Col, Modal } from 'react-bootstrap';
import { Fee, FeeStatus } from '@prisma/client';

const FeeVerificationTab = () => {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROCESSING' | 'PENDING' | 'PAID'>('PROCESSING');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [editDueDate, setEditDueDate] = useState('');

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

  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'ALL' ? '/api/fees' : `/api/fees?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFees(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch fees');
        setFees([]);
      }
    } catch (error) {
      setError('Error fetching fees');
      setFees([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handleVerification = async (feeId: string, approve: boolean) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/fees/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId, approve }),
      });

      if (res.ok) {
        setSuccess(`Fee payment ${approve ? 'approved' : 'rejected'} successfully!`);
        fetchFees();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to verify payment');
      }
    } catch (error) {
      setError('Error verifying payment');
    }
  };

  const handleRevert = async (feeId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/fees/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId }),
      });
      if (res.ok) {
        setSuccess('Fee reverted to pending.');
        setStatusFilter('PENDING');
        fetchFees();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to revert fee');
      }
    } catch (error) {
      setError('Error reverting fee');
    }
  };

  const openEditModal = (fee: any) => {
    setEditingFee(fee);
    setEditTitle(fee.title || fee.feeDefinition?.title || '');
    setEditDescription(fee.description || '');
    setEditAmount(String(fee.amount || fee.feeDefinition?.amount || ''));
    setEditCurrency(fee.currency || fee.feeDefinition?.currency || 'USD');
    setEditDueDate(fee.dueDate ? new Date(fee.dueDate).toISOString().split('T')[0] : '');
    setShowEditModal(true);
  };

  const handleUpdateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editingFee) return;
    if (!editTitle || !editAmount || !editDueDate) {
      setError('Title, amount, and due date are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingFee.id,
          title: editTitle,
          description: editDescription,
          amount: parseFloat(editAmount),
          currency: editCurrency,
          dueDate: editDueDate,
        }),
      });

      if (res.ok) {
        setSuccess('Fee updated successfully!');
        setShowEditModal(false);
        setEditingFee(null);
        fetchFees();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update fee');
      }
    } catch (error) {
      setError('Error updating fee');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: FeeStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge bg="success">Paid</Badge>;
      case 'PENDING':
        return <Badge bg="warning">Pending</Badge>;
      case 'PROCESSING':
        return <Badge bg="info">Processing</Badge>;
      case 'OVERDUE':
        return <Badge bg="danger">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex align-items-center justify-content-between">
          <h6 className="mb-0">
            <i className="bi bi-check-circle me-2"></i>
            Fee Verification & History
          </h6>
          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0">Status</label>
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ width: 180 }}
            >
              <option value="ALL">All</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading fees...</p>
            </div>
          ) : fees.length === 0 ? (
            <div className="text-center py-4">
              <p className="mt-2 text-muted small">No fees found for selected status</p>
            </div>
          ) : (
            <Table hover size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Fee Title</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Paid Amount</th>
                  <th>Paid Date</th>
                  <th>Payment Details</th>
                  <th>Proof</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee: any) => (
                  <tr key={fee.id}>
                    <td>{fee.student?.name || '-'}</td>
                    <td>{fee.title || fee.feeDefinition?.title || 'N/A'}</td>
                    <td>{getStatusBadge(fee.status)}</td>
                    <td>{(fee.amount || fee.feeDefinition?.amount)} {(fee.currency || fee.feeDefinition?.currency) || 'USD'}</td>
                    <td>{fee.paidAmount ?? '-'}</td>
                    <td>{fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : '-'}</td>
                    <td className="small">{fee.paymentDetails || '-'}</td>
                    <td>
                      {fee.paymentProof ? (
                        <a href={fee.paymentProof} target="_blank" rel="noopener noreferrer">View</a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      {fee.status !== 'PAID' && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => openEditModal(fee)}
                          title="Edit Fee"
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                      )}
                      {fee.status === 'PROCESSING' && (
                        <>
                          <Button variant="outline-success" size="sm" onClick={() => handleVerification(fee.id, true)}>
                            <i className="bi bi-check-lg"></i>
                          </Button>
                          <Button variant="outline-danger" size="sm" className="ms-2" onClick={() => handleVerification(fee.id, false)}>
                            <i className="bi bi-x-lg"></i>
                          </Button>
                        </>
                      )}
                      {fee.status === 'PAID' && (
                        <Button variant="outline-warning" size="sm" onClick={() => handleRevert(fee.id)} title="Revert to Pending">
                          <i className="bi bi-arrow-counterclockwise"></i>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Edit Fee Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Fee</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateFee}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Amount</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    required
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name} ({curr.code})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                className="me-2"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default FeeVerificationTab;
