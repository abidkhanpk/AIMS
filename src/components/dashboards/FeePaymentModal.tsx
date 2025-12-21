import { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';

interface FeePaymentModalProps {
  show: boolean;
  onHide: () => void;
  fee: any; // Replace with a proper Fee interface
  onPaymentSubmit: (paymentDetails: any) => Promise<void>;
}

const FeePaymentModal = ({ show, onHide, fee, onPaymentSubmit }: FeePaymentModalProps) => {
  const [amount, setAmount] = useState(fee?.amount || '');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadProof = async () => {
    if (!paymentProof) return undefined;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', paymentProof);
      const res = await fetch('/api/upload/file?folder=fee-payments&prefix=fee-proof', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to upload proof');
      }
      const data = await res.json();
      return data.url as string | undefined;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!amount || !paidDate || !paymentDetails.trim()) {
        setError('Amount, Paid Date, and Payment Details are required.');
        setSubmitting(false);
        return;
      }

      let proofUrl: string | undefined;
      if (paymentProof) {
        proofUrl = await uploadProof();
      }

      const paymentData = {
        feeId: fee.id,
        amount,
        paidDate,
        paymentDetails,
        paymentProof: proofUrl,
      };

      await onPaymentSubmit(paymentData);
      onHide();
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Pay Fee: {fee?.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Amount</Form.Label>
            <Form.Control
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
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
            <Form.Label>Payment Details/Remarks</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Upload Screenshot/Proof</Form.Label>
            <Form.Control
              type="file"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
            />
            {uploading && <div className="small text-muted mt-1">Uploading proof...</div>}
          </Form.Group>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Submit Payment'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default FeePaymentModal;
