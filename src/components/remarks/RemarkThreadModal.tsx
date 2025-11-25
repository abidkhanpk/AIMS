import React, { useState } from 'react';
import { Modal, Card, Button, Form, Spinner } from 'react-bootstrap';

interface RemarkAuthor {
  id?: string;
  name: string;
  role?: string;
}

interface RemarkReply {
  id: string;
  content: string;
  createdAt: string;
  author: RemarkAuthor;
}

export interface RemarkThread {
  id: string;
  remark: string;
  createdAt: string;
  parent: RemarkAuthor;
  progress?: {
    student?: { name: string };
    course?: { name: string };
    teacher?: { name: string };
  };
  replies?: RemarkReply[];
}

interface RemarkThreadModalProps {
  show: boolean;
  onHide: () => void;
  remarks: RemarkThread[];
  title?: string;
  currentUserId?: string;
  loading?: boolean;
  onReply?: (remarkId: string, content: string) => Promise<boolean | void> | boolean | void;
  onRefresh?: (remarkId: string) => Promise<void> | void;
  onRefreshAll?: () => Promise<void> | void;
  onDeleteRemark?: (remarkId: string) => Promise<void> | void;
  onDeleteReply?: (replyId: string) => Promise<void> | void;
  onMessageParent?: (parentId?: string, parentName?: string) => void;
  emptyMessage?: string;
}

const RemarkThreadModal: React.FC<RemarkThreadModalProps> = ({
  show,
  onHide,
  remarks,
  title = 'Remarks for this progress',
  currentUserId,
  loading = false,
  onReply,
  onRefresh,
  onRefreshAll,
  onDeleteRemark,
  onDeleteReply,
  onMessageParent,
  emptyMessage = 'No remarks',
}) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const setDraft = (remarkId: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [remarkId]: value }));
  };

  const submitReply = async (remarkId: string) => {
    if (!onReply) return;
    const content = (drafts[remarkId] || '').trim();
    if (!content) return;
    setSubmitting((prev) => ({ ...prev, [remarkId]: true }));
    try {
      const result = await onReply(remarkId, content);
      if (result !== false) {
        setDraft(remarkId, '');
      }
    } finally {
      setSubmitting((prev) => ({ ...prev, [remarkId]: false }));
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-chat-dots me-2"></i>
          {title}
        </Modal.Title>
        {onRefreshAll && (
          <Button variant="outline-secondary" size="sm" onClick={onRefreshAll}>
            <i className="bi bi-arrow-repeat"></i>
          </Button>
        )}
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
          </div>
        ) : !remarks || remarks.length === 0 ? (
          <div className="text-center text-muted py-3">{emptyMessage}</div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {remarks.map((remark) => (
              <Card key={remark.id} className="border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <strong className="text-primary">{remark.parent?.name || 'Parent'}</strong>
                        {onMessageParent && remark.parent?.id && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => onMessageParent(remark.parent?.id, remark.parent?.name)}
                          >
                            <i className="bi bi-envelope"></i>
                          </Button>
                        )}
                      </div>
                      {(remark.progress?.student || remark.progress?.course) && (
                        <div className="small text-muted">
                          {remark.progress?.student?.name && <span>{remark.progress?.student?.name}</span>}
                          {remark.progress?.student?.name && remark.progress?.course?.name && ' • '}
                          {remark.progress?.course?.name && <span>{remark.progress?.course?.name}</span>}
                        </div>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {onRefresh && (
                        <Button variant="outline-secondary" size="sm" onClick={() => onRefresh(remark.id)}>
                          <i className="bi bi-arrow-repeat"></i>
                        </Button>
                      )}
                      {onDeleteRemark && (
                        <Button variant="outline-danger" size="sm" onClick={() => onDeleteRemark(remark.id)}>
                          <i className="bi bi-trash"></i>
                        </Button>
                      )}
                      <small className="text-muted">{new Date(remark.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                  <div className="mb-2">{remark.remark}</div>
                  {remark.replies && remark.replies.length > 0 && (
                    <div className="d-flex flex-column gap-2 mt-2">
                      {remark.replies.map((reply) => {
                        const isMine = currentUserId && reply.author?.id === currentUserId;
                        return (
                          <div
                            key={reply.id}
                            className={`px-3 py-2 rounded ${isMine ? 'ms-auto' : 'me-auto'}`}
                            style={{ backgroundColor: isMine ? '#e0f2ff' : '#eef2ff', maxWidth: '95%' }}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <strong>{reply.author?.name}</strong>
                                {reply.author?.role && <span className="ms-1 text-muted">({reply.author.role})</span>}
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <small className="text-muted">{new Date(reply.createdAt).toLocaleString()}</small>
                                {onDeleteReply && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => onDeleteReply(reply.id)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div>{reply.content}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {onReply && (
                    <div className="mt-3">
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Reply..."
                        value={drafts[remark.id] || ''}
                        onChange={(e) => setDraft(remark.id, e.target.value)}
                      />
                      <div className="d-flex justify-content-end mt-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={submitting[remark.id] || !(drafts[remark.id] || '').trim()}
                          onClick={() => submitReply(remark.id)}
                        >
                          {submitting[remark.id] ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Replying...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-send me-1"></i>
                              Reply
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RemarkThreadModal;
