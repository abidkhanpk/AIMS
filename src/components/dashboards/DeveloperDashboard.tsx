import { useState, useEffect, useRef } from 'react';
import { Form, Button, Table, Card, Row, Col, Modal, Alert, Spinner, Badge } from 'react-bootstrap';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  settings?: {
    appTitle: string;
    headerImg: string;
  };
}

export default function DeveloperDashboard() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [appTitle, setAppTitle] = useState('');
  const [headerImage, setHeaderImage] = useState('');
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users?role=ADMIN');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      } else {
        setError('Failed to fetch admins');
      }
    } catch (error) {
      setError('Error fetching admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'ADMIN' }),
      });

      if (res.ok) {
        setSuccess('Admin created successfully!');
        fetchAdmins();
        setName('');
        setEmail('');
        setPassword('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create admin');
      }
    } catch (error) {
      setError('Error creating admin');
    } finally {
      setCreating(false);
    }
  };

  const handleShowSettings = (admin: Admin) => {
    setSelectedAdmin(admin);
    setAppTitle(admin.settings?.appTitle || 'LMS Academy');
    setHeaderImage(admin.settings?.headerImg || '/assets/default-logo.png');
    setShowSettingsModal(true);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPEG, PNG, GIF, or WebP images only.');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Please upload images smaller than 5MB.');
      return;
    }

    setUploadingLogo(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setHeaderImage(data.logoUrl);
        setSuccess('Logo uploaded successfully!');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to upload logo');
      }
    } catch (error) {
      setError('Error uploading logo');
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedAdmin) return;

    setUpdatingSettings(true);
    try {
      const res = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminId: selectedAdmin.id, 
          appTitle, 
          headerImg: headerImage 
        }),
      });

      if (res.ok) {
        setSuccess('Settings updated successfully!');
        fetchAdmins();
        setShowSettingsModal(false);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update settings');
      }
    } catch (error) {
      setError('Error updating settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">
            <i className="bi bi-gear-fill me-2 text-primary"></i>
            Developer Dashboard
          </h1>
          <p className="text-muted">Manage administrators and system settings</p>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-person-plus me-2"></i>
                Create New Admin
              </h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateAdmin}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Enter admin's full name"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="Enter admin's email"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder="Enter secure password"
                    minLength={6}
                  />
                  <Form.Text className="text-muted">
                    Password must be at least 6 characters long
                  </Form.Text>
                </Form.Group>
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Admin
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-people me-2"></i>
                  System Administrators
                </h5>
                <Badge bg="secondary">{admins.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                  <p className="mt-2 text-muted">Loading administrators...</p>
                </div>
              ) : admins.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-people display-4 text-muted"></i>
                  <p className="mt-2 text-muted">No administrators found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>App Title</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => (
                        <tr key={admin.id}>
                          <td className="fw-medium">{admin.name}</td>
                          <td className="text-muted">{admin.email}</td>
                          <td>
                            <Badge bg="info" className="text-dark">
                              {admin.settings?.appTitle || 'Default'}
                            </Badge>
                          </td>
                          <td className="text-muted small">
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={() => handleShowSettings(admin)}
                            >
                              <i className="bi bi-gear me-1"></i>
                              Settings
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Settings Modal */}
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-gear me-2"></i>
            Settings for {selectedAdmin?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>App Title</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={appTitle} 
                    onChange={(e) => setAppTitle(e.target.value)}
                    placeholder="Enter app title"
                  />
                  <Form.Text className="text-muted">
                    This will appear in the navigation bar
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Header Logo</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      disabled={uploadingLogo}
                    />
                    {uploadingLogo && (
                      <Spinner animation="border" size="sm" />
                    )}
                  </div>
                  <Form.Text className="text-muted">
                    Upload JPEG, PNG, GIF, or WebP (max 5MB)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            {headerImage && (
              <div className="mb-3">
                <Form.Label>Current Logo Preview</Form.Label>
                <div className="border rounded p-3 bg-light text-center">
                  <img 
                    src={headerImage} 
                    alt="Header preview" 
                    style={{ maxHeight: '80px', maxWidth: '200px' }}
                    className="rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/default-logo.png';
                    }}
                  />
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSettingsModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveSettings}
            disabled={updatingSettings}
          >
            {updatingSettings ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Save Changes
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}