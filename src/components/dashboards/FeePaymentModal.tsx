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
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Basic validation
      if (!amount || !paidDate) {
        setError('Amount and Paid Date are required.');
        return;
      }

      const paymentData = {
        feeId: fee.id,
        amount,
        paidDate,
        paymentDetails,
        paymentProof: '', // Placeholder for now
      };

      // Handle file upload (this is a simplified example)
      if (paymentProof) {
        // You would typically upload the file to a service like S3 or Cloudinary
        // and get a URL back. For this example, we'll just use the file name.
        paymentData.paymentProof = paymentProof.name;
      }

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
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Upload Screenshot/Proof</Form.Label>
            <Form.Control
              type="file"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
            />
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
