import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';

interface DirectMessageModalProps {
  show: boolean;
  onHide: () => void;
  targetId: string | null;
  targetName?: string;
  onSent?: () => void;
}

export default function DirectMessageModal({ show, onHide, targetId, targetName, onSent }: DirectMessageModalProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setText('');
      setError('');
    }
  }, [show]);

  const handleSend = async () => {
    if (!targetId || !text.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: targetId, content: text.trim() }),
      });
      if (res.ok) {
        setText('');
        onSent?.();
        onHide();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-envelope me-2"></i>
          Message {targetName || 'user'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <Form.Group className="mb-3">
          <Form.Label>Message</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button variant="primary" onClick={handleSend} disabled={!text.trim() || sending || !targetId}>
          {sending ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Sending...
            </>
          ) : (
            <>
              <i className="bi bi-send me-1"></i>Send
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
