import React, { useState, useEffect, useCallback } from 'react';
import { Table, Badge, Button, Alert, Spinner, Card } from 'react-bootstrap';
import { Fee, FeeStatus } from '@prisma/client';

const FeeVerificationTab = () => {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PROCESSING' | 'PENDING' | 'PAID'>('PROCESSING');

  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/fees?status=${statusFilter}`);
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
        fetchFees();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to revert fee');
      }
    } catch (error) {
      setError('Error reverting fee');
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
              style={{ width: 160 }}
            >
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
                    <td>{fee.status}</td>
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
    </div>
  );
};

export default FeeVerificationTab;
