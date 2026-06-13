import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

interface DirectMessageModalProps {
  show: boolean;
  onHide: () => void;
  targetId: string | null;
  targetName?: string;
  subject?: string;
  threadId?: string;
  onSent?: () => void;
}

export default function DirectMessageModal({ show, onHide, targetId, targetName, onSent, subject, threadId }: DirectMessageModalProps) {
    const { t } = useTranslation('common');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [msgSubject, setMsgSubject] = useState(subject || '');
  
  // New states for recipient selector
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (show) {
      setText('');
      setError('');
      setMsgSubject(subject || '');
      setSelectedUser('');
      
      if (!targetId) {
        fetchUsers();
      }
    }
  }, [show, subject, targetId]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        // Filter out current user if possible, but backend might not return self anyway
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to load users for messaging');
    } finally {
      setLoadingUsers(false);
    }
  };

  const actualTargetId = targetId || selectedUser;

  const handleSend = async () => {
    if (!actualTargetId || !text.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: actualTargetId,
          content: text.trim(),
          subject: msgSubject?.trim() || 'No subject',
          threadId: threadId || undefined,
        }),
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
      setError(t('auto.failedToSendMessage', `Failed to send message`));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-envelope me-2"></i>
          {targetId ? `Message ${targetName || 'user'}` : 'New Message'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        
        {!targetId && (
          <Form.Group className="mb-3">
            <Form.Label>{t('auto.to', `To`)}</Form.Label>
            {loadingUsers ? (
              <div><Spinner animation="border" size="sm" className="me-2" /> {t('auto.loadingContacts', `Loading contacts...`)}</div>
            ) : (
              <Form.Select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">{t('auto.selectARecipient', `Select a recipient...`)}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </Form.Select>
            )}
          </Form.Group>
        )}

      <Form.Group className="mb-3">
        <Form.Label>{t('auto.subject', `Subject`)}</Form.Label>
        <Form.Control
          type="text"
          value={msgSubject}
          onChange={(e) => setMsgSubject(e.target.value)}
          placeholder={t('auto.enterSubject', `Enter subject`)}
          disabled={!!threadId}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>{t('auto.message', `Message`)}</Form.Label>
        <Form.Control
          as="textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('auto.typeYourMessage', `Type your message...`)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>{t('auto.close', `Close`)}</Button>
        <Button variant="primary" onClick={handleSend} disabled={!text.trim() || sending || !actualTargetId}>
          {sending ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {t('auto.sending', `Sending...`)}
                                      </>
          ) : (
            <>
              <i className="bi bi-send me-1"></i>{t('auto.send', `Send`)}
                                          </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
