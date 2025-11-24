import { useEffect, useState, useMemo } from 'react';
import { Card, Table, Alert, Spinner } from 'react-bootstrap';
import { useSession } from 'next-auth/react';

export default function MessagesPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  return (
    <div className="container py-4">
      <h1 className="h4 mb-4">
        <i className="bi bi-envelope me-2"></i>
        Messages
      </h1>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

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
            <div className="p-3 d-flex flex-column gap-2">
              {sortedMessages.map((msg) => {
                const isMine = currentUserId && msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`px-3 py-2 rounded ${isMine ? 'ms-auto' : 'me-auto'}`}
                    style={{ backgroundColor: isMine ? '#e0f2ff' : '#eef2ff', maxWidth: '90%' }}
                  >
                    <div className="d-flex justify-content-between">
                      <small className="text-muted">{isMine ? 'You' : msg.senderId}</small>
                      <small className="text-muted">{new Date(msg.createdAt).toLocaleString()}</small>
                    </div>
                    <div>{msg.content}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
