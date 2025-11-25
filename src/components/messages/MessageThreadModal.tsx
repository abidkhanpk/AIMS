import React, { useState } from 'react';
import { Modal, Card, Button, Form, Spinner } from 'react-bootstrap';

interface MessageAuthor {
  id?: string;
  name?: string;
  role?: string;
}

export interface MessageItem {
  id: string;
  content: string;
  createdAt: string;
  author: MessageAuthor;
}

interface MessageThreadModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  messages: MessageItem[];
  currentUserId?: string;
  loading?: boolean;
  onReply?: (content: string) => Promise<boolean | void> | boolean | void;
  onRefresh?: () => void;
  onMessageUser?: (userId?: string, userName?: string) => void;
}

const MessageThreadModal: React.FC<MessageThreadModalProps> = ({
  show,
  onHide,
  title,
  messages,
  currentUserId,
  loading = false,
  onReply,
  onRefresh,
  onMessageUser,
}) => {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitReply = async () => {
    if (!onReply || !draft.trim()) return;
    setSubmitting(true);
    const result = await onReply(draft.trim());
    if (result !== false) {
      setDraft('');
    }
    setSubmitting(false);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton className="align-items-center">
        <div className="d-flex align-items-center w-100 gap-2">
          <Modal.Title className="fs-5 m-0">
            <i className="bi bi-envelope-open me-2"></i>
            {title}
          </Modal.Title>
          {onRefresh && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="ms-auto me-2"
              onClick={onRefresh}
            >
              <i className="bi bi-arrow-repeat"></i>
            </Button>
          )}
        </div>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted py-3">No messages</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {messages.map((msg) => {
              const isMine = currentUserId && msg.author?.id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`px-3 py-2 rounded shadow-sm ${isMine ? 'ms-auto' : 'me-auto'}`}
                  style={{
                    maxWidth: '95%',
                    backgroundColor: isMine ? '#e6f4ff' : '#f4f4f6',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div>
                      <strong
                        className={`${onMessageUser ? 'text-decoration-underline text-primary' : ''}`}
                        role={onMessageUser ? 'button' : undefined}
                        onClick={() => onMessageUser?.(msg.author?.id, msg.author?.name)}
                      >
                        {msg.author?.name || 'User'}
                      </strong>
                      {msg.author?.role && <span className="ms-1 text-muted">({msg.author.role})</span>}
                    </div>
                    <small className="text-muted">{new Date(msg.createdAt).toLocaleString()}</small>
                  </div>
                  <div>{msg.content}</div>
                </div>
              );
            })}
          </div>
        )}
      </Modal.Body>
      {onReply && (
        <Modal.Footer className="flex-column align-items-stretch">
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="Reply..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="d-flex justify-content-end mt-2">
            <Button
              size="sm"
              variant="primary"
              disabled={submitting || !draft.trim()}
              onClick={submitReply}
            >
              {submitting ? (
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
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default MessageThreadModal;
