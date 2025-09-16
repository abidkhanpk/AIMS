import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';

interface SubscriptionPaymentModalProps {
  show: boolean;
  onHide: () => void;
  subscription: any; // Minimal shape expected: { id, plan, amount, currency }
  onPaymentSubmit: (paymentDetails: {
    subscriptionId: string;
    paidAmount: number;
    paidDate?: string;
    paymentDetails?: string;
    paymentProof?: string;
  }) => Promise<void>;
}

export default function SubscriptionPaymentModal({ show, onHide, subscription, onPaymentSubmit }: SubscriptionPaymentModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [paidDate, setPaidDate] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (subscription) {
      setAmount(String(subscription.amount || ''));
      setPaidDate(new Date().toISOString().split('T')[0]);
      setDetails('');
      setProofFile(null);
      setError('');
    }
  }, [subscription, show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!amount || !paidDate) {
        setError('Amount and Paid Date are required');
        return;
      }

      const payload = {
        subscriptionId: subscription.id,
        paidAmount: parseFloat(amount),
        paidDate,
        paymentDetails: details || undefined,
        paymentProof: undefined as string | undefined,
      };

      if (proofFile) {
        // In a real app, upload and use the returned URL. For now, store filename.
        payload.paymentProof = proofFile.name;
      }

      await onPaymentSubmit(payload);
      onHide();
    } catch (err: any) {
      setError(err.message || 'Failed to submit subscription payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>
          Pay Subscription: {subscription?.plan}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Amount</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Form.Text className="text-muted">Currency: {subscription?.currency || 'USD'}</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Paid Date</Form.Label>
            <Form.Control
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Payment Details / Remarks</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Enter reference, transaction id, or remarks"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Upload Screenshot / Proof</Form.Label>
            <Form.Control
              type="file"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProofFile(e.target.files ? e.target.files[0] : null)}
            />
          </Form.Group>
          <div className="d-flex justify-content-end">
            <Button variant="secondary" className="me-2" onClick={onHide} disabled={submitting}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? <Spinner as="span" animation="border" size="sm" /> : 'Submit Payment'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
