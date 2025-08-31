import React, { useState, useEffect, useCallback } from 'react';
import { Table, Badge, Button, Alert, Spinner, Card } from 'react-bootstrap';
import { Fee, FeeStatus } from '@prisma/client';

const FeeVerificationTab = () => {
  const [pendingFees, setPendingFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPendingFees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fees?status=PROCESSING');
      if (res.ok) {
        const data = await res.json();
        setPendingFees(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch pending fees');
        setPendingFees([]);
      }
    } catch (error) {
      setError('Error fetching pending fees');
      setPendingFees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingFees();
  }, [fetchPendingFees]);

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
        fetchPendingFees();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to verify payment');
      }
    } catch (error) {
      setError('Error verifying payment');
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
        <Card.Header className="bg-light">
          <h6 className="mb-0">
            <i className="bi bi-check-circle me-2"></i>
            Pending Fee Verifications
          </h6>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading pending fees...</p>
            </div>
          ) : pendingFees.length === 0 ? (
            <div className="text-center py-4">
              <p className="mt-2 text-muted small">No pending fee verifications found</p>
            </div>
          ) : (
            <Table hover size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Fee Title</th>
                  <th>Amount Paid</th>
                  <th>Paid Date</th>
                  <th>Payment Details</th>
                  <th>Proof</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingFees.map((fee: any) => (
                  <tr key={fee.id}>
                    <td>{fee.student.name}</td>
                    <td>{fee.title || fee.feeDefinition?.title || 'N/A'}</td>
                    <td>{fee.paidAmount} {fee.feeDefinition?.currency || fee.currency || 'USD'}</td>
                    <td>{fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : '-'}</td>
                    <td>{fee.paymentDetails}</td>
                    <td>
                      {fee.paymentProof ? (
                        <a href={fee.paymentProof} target="_blank" rel="noopener noreferrer">View Proof</a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <Button variant="outline-success" size="sm" onClick={() => handleVerification(fee.id, true)}>
                        <i className="bi bi-check-lg"></i> Approve
                      </Button>
                      <Button variant="outline-danger" size="sm" className="ms-2" onClick={() => handleVerification(fee.id, false)}>
                        <i className="bi bi-x-lg"></i> Reject
                      </Button>
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
