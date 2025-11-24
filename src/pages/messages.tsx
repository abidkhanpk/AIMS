import { useEffect, useState } from 'react';
import { Card, Table, Alert, Spinner, Form, Button } from 'react-bootstrap';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load messages');
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || !content.trim()) return;
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, content }),
      });
      if (res.ok) {
        setContent('');
        setReceiverId('');
        setSuccess('Message sent');
        fetchMessages();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to send');
      }
    } catch (err) {
      setError('Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container py-4">
      <h1 className="h4 mb-4">
        <i className="bi bi-chat-dots me-2"></i>
        Messages
      </h1>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      <Card className="mb-4">
        <Card.Header>Compose</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSend}>
            <Form.Group className="mb-3">
              <Form.Label>Receiver ID</Form.Label>
              <Form.Control
                type="text"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="Enter recipient user ID"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message..."
              />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={!receiverId || !content.trim() || sending}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>Recent Messages</Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-4 text-muted">No messages</div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Content</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr key={msg.id}>
                      <td className="text-muted small">{msg.senderId}</td>
                      <td className="text-muted small">{msg.receiverId}</td>
                      <td>{msg.content}</td>
                      <td className="text-muted small">{new Date(msg.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
