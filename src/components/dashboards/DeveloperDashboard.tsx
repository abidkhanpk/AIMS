import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Form, Button, Table, Card, Row, Col, Modal, Alert, Spinner, Badge, Tabs, Tab } from 'react-bootstrap';
import SubscriptionHistoryTab from '../SubscriptionHistoryTab';
import { currencies } from '../../utils/currencies';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mobile?: string;
  address?: string;
  createdAt: string;
  settings?: {
    appTitle: string;
    headerImg: string;
    headerImgUrl?: string;
    tagline: string;
    enableHomePage: boolean;
    defaultCurrency: string;
    subscriptionType: string;
    subscriptionAmount: number;
    subscriptionStartDate: string;
    subscriptionEndDate?: string;
  };
  subscriptions?: Array<{
    id: string;
    plan: string;
    amount: number;
    currency: string;
    startDate: string;
    endDate?: string;
    status: string;
  }>;
}

interface AppSettings {
  id: string;
  appLogo: string;
  appName: string;
  tagline: string;
  enableHomePage: boolean;
  defaultCurrency: string;
}

interface Subscription {
  id: string;
  adminId: string;
  plan: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: string;
  admin: {
    name: string;
    email: string;
  };
}

function AdminManagementTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [appTitle, setAppTitle] = useState('');
  const [headerImage, setHeaderImage] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [enableHomePage, setEnableHomePage] = useState(true);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscription fields
  const [subscriptionType, setSubscriptionType] = useState('MONTHLY');
  const [subscriptionAmount, setSubscriptionAmount] = useState(29.99);
  const [subscriptionCurrency, setSubscriptionCurrency] = useState('USD');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState('');

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  // currencies imported from utils/currencies

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Calculate subscription end date automatically
  const calculateEndDate = (startDate: string, type: string) => {
    if (!startDate || type === 'LIFETIME') return null;
    
    const start = new Date(startDate);
    const end = new Date(start);
    
    switch (type) {
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'YEARLY':
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        return null;
    }
    
    return end.toISOString().split('T')[0];
  };

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
      const endDate = calculateEndDate(subscriptionStartDate, subscriptionType);
      
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          role: 'ADMIN',
          mobile: mobile || null,
          address: address || null,
          subscriptionType,
          subscriptionAmount,
          subscriptionCurrency,
          subscriptionStartDate: subscriptionStartDate || new Date().toISOString(),
          subscriptionEndDate: endDate
        }),
      });

      if (res.ok) {
        setSuccess('Admin created successfully!');
        fetchAdmins();
        setName('');
        setEmail('');
        setPassword('');
        setMobile('');
        setAddress('');
        setSubscriptionType('MONTHLY');
        setSubscriptionAmount(29.99);
        setSubscriptionCurrency('USD');
        setSubscriptionStartDate('');
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

  const handleShowEdit = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditMobile(admin.mobile || '');
    setEditAddress(admin.address || '');
    setEditPassword('');
    setShowEditModal(true);
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const updateData: any = {
        id: selectedAdmin.id,
        name: editName,
        email: editEmail,
        mobile: editMobile || null,
        address: editAddress || null,
      };

      if (editPassword) {
        updateData.password = editPassword;
      }

      const res = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setSuccess('Admin updated successfully!');
        fetchAdmins();
        setShowEditModal(false);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update admin');
      }
    } catch (error) {
      setError('Error updating admin');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/users/enable-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminId,
          enable: !currentStatus 
        }),
      });

      if (res.ok) {
        setSuccess(`Admin ${!currentStatus ? 'enabled' : 'disabled'} successfully!`);
        fetchAdmins();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update admin status');
      }
    } catch (error) {
      setError('Error updating admin status');
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Delete this admin account and all related records? This action cannot be undone.')) return;
    setDeletingAdminId(adminId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adminId }),
      });
      if (res.ok) {
        setSuccess('Admin deleted successfully');
        fetchAdmins();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to delete admin');
      }
    } catch {
      setError('Error deleting admin');
    } finally {
      setDeletingAdminId(null);
    }
  };

  const handleShowSettings = (admin: Admin) => {
    setSelectedAdmin(admin);
    setAppTitle(admin.settings?.appTitle || 'AIMS');
    const existingHeader = admin.settings?.headerImgUrl || admin.settings?.headerImg || '/assets/default-logo.png';
    setHeaderImage(existingHeader);
    setHeaderImageUrl(admin.settings?.headerImgUrl || admin.settings?.headerImg || '');
    setTagline(admin.settings?.tagline || 'Academy Information and Management System');
    setEnableHomePage(admin.settings?.enableHomePage ?? true);
    setDefaultCurrency(admin.settings?.defaultCurrency || 'USD');
    setSubscriptionType(admin.settings?.subscriptionType || 'MONTHLY');
    setSubscriptionAmount(admin.settings?.subscriptionAmount || 29.99);
    setSubscriptionCurrency(admin.settings?.subscriptionType === 'LIFETIME' ? 'USD' : 'USD'); // Default currency for subscription
    setSubscriptionStartDate(admin.settings?.subscriptionStartDate ? admin.settings.subscriptionStartDate.split('T')[0] : '');
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
        setHeaderImageUrl(data.logoUrl);
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
      const endDate = calculateEndDate(subscriptionStartDate, subscriptionType);
      const resolvedHeader = headerImageUrl || headerImage || null;
      
      const res = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminId: selectedAdmin.id, 
          appTitle, 
          headerImg: resolvedHeader || '/assets/default-logo.png',
          headerImgUrl: resolvedHeader,
          tagline,
          enableHomePage,
          defaultCurrency,
          subscriptionType,
          subscriptionAmount,
          subscriptionCurrency,
          subscriptionStartDate: subscriptionStartDate ? new Date(subscriptionStartDate).toISOString() : null,
          subscriptionEndDate: endDate ? new Date(endDate).toISOString() : null
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
    <div>
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
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Enter admin's full name"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address *</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="Enter admin's email"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password *</Form.Label>
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
                <Form.Group className="mb-3">
                  <Form.Label>Mobile Number</Form.Label>
                  <Form.Control 
                    type="tel" 
                    value={mobile} 
                    onChange={(e) => setMobile(e.target.value)} 
                    placeholder="Enter mobile number"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={2}
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Enter address"
                  />
                </Form.Group>
                
                {/* Subscription Settings */}
                <hr />
                <h6 className="text-muted mb-3">Subscription Settings</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Subscription Type</Form.Label>
                      <Form.Select 
                        value={subscriptionType} 
                        onChange={(e) => setSubscriptionType(e.target.value)}
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                        <option value="LIFETIME">Lifetime</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select 
                        value={subscriptionCurrency} 
                        onChange={(e) => setSubscriptionCurrency(e.target.value)}
                      >
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Amount</Form.Label>
                      <Form.Control 
                        type="number" 
                        step="0.01"
                        value={subscriptionAmount} 
                        onChange={(e) => setSubscriptionAmount(parseFloat(e.target.value))} 
                        placeholder="0.00"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Date</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={subscriptionStartDate} 
                        onChange={(e) => setSubscriptionStartDate(e.target.value)} 
                      />
                    </Form.Group>
                  </Col>
                </Row>
                {subscriptionStartDate && subscriptionType !== 'LIFETIME' && (
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>End Date (Auto-calculated)</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={calculateEndDate(subscriptionStartDate, subscriptionType) || 'N/A'}
                          disabled
                          className="bg-light"
                        />
                        <Form.Text className="text-muted">
                          End date is automatically calculated based on subscription type
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
                
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
                        <th>Status</th>
                        <th>Subscription</th>
                        <th>App Title</th>
                        <th>Currency</th>
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
                            <Badge bg={admin.isActive ? 'success' : 'danger'}>
                              {admin.isActive ? 'Active' : 'Disabled'}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg="warning" className="text-dark">
                              {admin.settings?.subscriptionType || 'MONTHLY'}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg="info" className="text-dark">
                              {admin.settings?.appTitle || 'Default'}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {admin.settings?.defaultCurrency || 'USD'}
                            </Badge>
                          </td>
                          <td className="text-muted small">
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                onClick={() => handleShowEdit(admin)}
                                title="Edit Admin"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                onClick={() => handleShowSettings(admin)}
                                title="Settings & Subscription"
                              >
                                <i className="bi bi-gear"></i>
                              </Button>
                              <Button 
                                variant={admin.isActive ? "outline-danger" : "outline-success"}
                                size="sm" 
                                onClick={() => handleToggleAdminStatus(admin.id, admin.isActive)}
                                title={admin.isActive ? "Disable Admin (Manual)" : "Enable Admin"}
                              >
                                <i className={`bi bi-${admin.isActive ? 'x-circle' : 'check-circle'}`}></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteAdmin(admin.id)}
                                title="Delete Admin"
                                disabled={deletingAdminId === admin.id}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
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

      {/* Edit Admin Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Edit Admin: {selectedAdmin?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address *</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={editEmail} 
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Mobile Number</Form.Label>
                  <Form.Control 
                    type="tel" 
                    value={editMobile} 
                    onChange={(e) => setEditMobile(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                value={editAddress} 
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control 
                type="password" 
                value={editPassword} 
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                minLength={6}
              />
              <Form.Text className="text-muted">
                Leave blank to keep current password
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateAdmin}
            disabled={updating}
          >
            {updating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Updating...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Update Admin
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Settings Modal */}
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-gear me-2"></i>
            Settings & Subscription for {selectedAdmin?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey="app-settings" className="mb-3">
            <Tab eventKey="app-settings" title="App Settings">
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
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Default Currency</Form.Label>
                      <Form.Select 
                        value={defaultCurrency} 
                        onChange={(e) => setDefaultCurrency(e.target.value)}
                      >
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.name} ({currency.code})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tagline</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={tagline} 
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="Enter tagline"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Header Logo (Upload)</Form.Label>
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
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Header Logo (URL)</Form.Label>
                      <Form.Control 
                        type="url" 
                        value={headerImageUrl} 
                        onChange={(e) => {
                          setHeaderImageUrl(e.target.value);
                          if (e.target.value) {
                            setHeaderImage(e.target.value);
                          }
                        }}
                        placeholder="Enter logo URL"
                      />
                      <Form.Text className="text-muted">
                        Alternative to file upload
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Enable Homepage toggle removed from admin settings. This is controlled globally in Global Settings. */}
                
                {headerImage && (
                  <div className="mb-3">
                    <Form.Label>Current Logo Preview</Form.Label>
                    <div className="border rounded p-3 bg-light text-center">
                      <Image
                        src={headerImage || '/assets/default-logo.png'}
                        alt="Header preview"
                        width={200}
                        height={80}
                        style={{ height: 'auto', width: 'auto', maxHeight: '80px', maxWidth: '200px' }}
                        className="rounded"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/assets/default-logo.png';
                        }}
                      />
                    </div>
                  </div>
                )}
              </Form>
            </Tab>
            <Tab eventKey="subscription" title="Subscription">
              <Form>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Subscription Type</Form.Label>
                      <Form.Select 
                        value={subscriptionType} 
                        onChange={(e) => setSubscriptionType(e.target.value)}
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                        <option value="LIFETIME">Lifetime</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select 
                        value={subscriptionCurrency} 
                        onChange={(e) => setSubscriptionCurrency(e.target.value)}
                      >
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Amount</Form.Label>
                      <Form.Control 
                        type="number" 
                        step="0.01"
                        value={subscriptionAmount} 
                        onChange={(e) => setSubscriptionAmount(parseFloat(e.target.value))} 
                        placeholder="0.00"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Date</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={subscriptionStartDate} 
                        onChange={(e) => setSubscriptionStartDate(e.target.value)} 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>End Date (Auto-calculated)</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={subscriptionStartDate && subscriptionType !== 'LIFETIME' 
                          ? calculateEndDate(subscriptionStartDate, subscriptionType) || 'N/A'
                          : subscriptionType === 'LIFETIME' ? 'Lifetime - No Expiry' : 'N/A'
                        }
                        disabled
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        End date is automatically calculated based on subscription type and start date
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
              {selectedAdmin && (
                <div className="mt-4">
                  <SubscriptionHistoryTab adminId={selectedAdmin.id} allowVerify />
                </div>
              )}
            </Tab>
          </Tabs>
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

function GlobalSettingsTab() {
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appName, setAppName] = useState('');
  const [appLogo, setAppLogo] = useState('');
  const [tagline, setTagline] = useState('');
  const [enableHomePage, setEnableHomePage] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGlobalSettings();
  }, []);

  const fetchGlobalSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/developer');
      if (res.ok) {
        const data = await res.json();
        setAppSettings(data);
        setAppName(data.appName || 'AIMS');
        setAppLogo(data.appLogo || '/assets/app-logo.png');
        setTagline(data.tagline || 'Academy Information and Management System');
        setEnableHomePage(data.enableHomePage ?? true);
      } else {
        setError('Failed to fetch global settings');
      }
    } catch (error) {
      setError('Error fetching global settings');
    } finally {
      setLoading(false);
    }
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
        setAppLogo(data.logoUrl);
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

  const handleSaveGlobalSettings = async () => {
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          appName, 
          appLogo,
          tagline,
          enableHomePage
        }),
      });

      if (res.ok) {
        setSuccess('Global settings updated successfully!');
        fetchGlobalSettings();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update global settings');
      }
    } catch (error) {
      setError('Error updating global settings');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading global settings...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="shadow-sm">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">
            <i className="bi bi-globe me-2"></i>
            Global Application Settings
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Application Name</Form.Label>
                <Form.Control 
                  type="text" 
                  value={appName} 
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Enter application name"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Application Tagline</Form.Label>
                <Form.Control 
                  type="text" 
                  value={tagline} 
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Enter application tagline"
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Application Logo</Form.Label>
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

          <Row>
            <Col md={12}>
              <Form.Group className="mb-4">
                <Form.Check
                  type="switch"
                  id="global-enable-homepage"
                  label="Enable Homepage Globally"
                  checked={enableHomePage}
                  onChange={(e) => setEnableHomePage(e.target.checked)}
                />
                <Form.Text className="text-muted">
                  <strong>Global Homepage Control:</strong> When disabled, all users will be redirected directly to the sign-in page instead of the homepage.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          
          {appLogo && (
            <div className="mb-4">
              <Form.Label>Current Logo Preview</Form.Label>
              <div className="border rounded p-3 bg-light text-center">
                <Image
                  src={appLogo || '/assets/app-logo.png'}
                  alt="App logo preview"
                  width={300}
                  height={100}
                  style={{ height: 'auto', width: 'auto', maxHeight: '100px', maxWidth: '300px' }}
                  className="rounded"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/app-logo.png';
                  }}
                />
              </div>
            </div>
          )}

          <div className="d-flex justify-content-end">
            <Button 
              variant="secondary" 
              onClick={handleSaveGlobalSettings}
              disabled={updating}
              size="lg"
            >
              {updating ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Save Global Settings
                </>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default function DeveloperDashboard() {
  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">
            <i className="bi bi-code-slash me-2 text-secondary"></i>
            Developer Dashboard
          </h1>
          <p className="text-muted">Manage system administrators and global settings</p>
        </div>
      </div>

      <Tabs defaultActiveKey="global-settings" id="developer-dashboard-tabs" className="mb-4">
        <Tab 
          eventKey="global-settings" 
          title={
            <span>
              <i className="bi bi-globe me-2"></i>
              Global Settings
            </span>
          }
        >
          <GlobalSettingsTab />
        </Tab>
        <Tab 
          eventKey="admins" 
          title={
            <span>
              <i className="bi bi-people me-2"></i>
              Administrators
            </span>
          }
        >
          <AdminManagementTab />
        </Tab>
      </Tabs>
      
      <div className="text-center mt-5 pt-4 border-top">
        <small className="text-muted">
          © {new Date().getFullYear()} AIMS - Academy Information and Management System. All rights reserved.
        </small>
      </div>
    </div>
  );
}
