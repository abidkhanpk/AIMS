import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Form, Button, Table, Card, Row, Col, Modal, Alert, Spinner, Badge, Tabs, Tab } from 'react-bootstrap';
import SubscriptionHistoryTab from '../SubscriptionHistoryTab';
import { currencies } from '../../utils/currencies';
import { useTranslation } from 'react-i18next';

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
    storageProvider?: 'DRIVE' | 'CLOUDINARY';
    driveFolderId?: string | null;
    cloudinaryFolder?: string | null;
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
  storageProvider?: 'DRIVE' | 'CLOUDINARY';
  driveFolderId?: string | null;
  cloudinaryFolder?: string | null;
  smtpHost?: string | null;
  smtpPort?: string | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpSecure?: string | null;
  smtpReplyTo?: string | null;
  smtpFrom?: string | null;
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
    const { t } = useTranslation('common');
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
  const [showCreateForm, setShowCreateForm] = useState(false);

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
        setShowCreateForm(false);
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
    
    const getSubEffectiveDate = (sub: any) => {
      if (sub?.plan === 'LIFETIME') {
        return new Date('9999-12-31');
      }
      return new Date(sub?.endDate || sub?.startDate || 0);
    };

    const activeSub = admin.subscriptions?.length 
      ? admin.subscriptions.reduce((latest: any, sub: any) =>
          getSubEffectiveDate(sub) > getSubEffectiveDate(latest) ? sub : latest,
          admin.subscriptions[0])
      : null;
    setSubscriptionCurrency(activeSub?.currency || 'USD');
    
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

      {showCreateForm && (
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-person-plus me-2"></i>
              {t('auto.createNewAdmin', `Create New Admin`)}
            </h5>
            <Button variant="outline-light" size="sm" onClick={() => setShowCreateForm(false)}>
              {t('auto.cancel', `Cancel`)}
            </Button>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleCreateAdmin}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.fullName', `Full Name *`)}</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder={t('auto.enterAdminsFullName', `Enter admin's full name`)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.emailAddress', `Email Address *`)}</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder={t('auto.enterAdminsEmail', `Enter admin's email`)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.password', `Password *`)}</Form.Label>
                  <Form.Control 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder={t('auto.enterSecurePassword', `Enter secure password`)}
                    minLength={6}
                  />
                  <Form.Text className="text-muted">
                    {t('auto.passwordMustBeAtLeast6Characte', `Password must be at least 6 characters long`)}
                                                        </Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.mobileNumber', `Mobile Number`)}</Form.Label>
                  <Form.Control 
                    type="tel" 
                    value={mobile} 
                    onChange={(e) => setMobile(e.target.value)} 
                    placeholder={t('auto.enterMobileNumber', `Enter mobile number`)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.address', `Address`)}</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={2}
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder={t('auto.enterAddress', `Enter address`)}
                  />
                </Form.Group>
                
                {/* Subscription Settings */}
                <hr />
                <h6 className="text-muted mb-3">{t('auto.subscriptionSettings', `Subscription Settings`)}</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('auto.subscriptionType', `Subscription Type`)}</Form.Label>
                      <Form.Select 
                        value={subscriptionType} 
                        onChange={(e) => setSubscriptionType(e.target.value)}
                      >
                        <option value="MONTHLY">{t('auto.monthly', `Monthly`)}</option>
                        <option value="YEARLY">{t('auto.yearly', `Yearly`)}</option>
                        <option value="LIFETIME">{t('auto.lifetime', `Lifetime`)}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
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
                      <Form.Label>{t('auto.amount', `Amount`)}</Form.Label>
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
                      <Form.Label>{t('auto.startDate', `Start Date`)}</Form.Label>
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
                        <Form.Label>{t('auto.endDateAutocalculated', `End Date (Auto-calculated)`)}</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={calculateEndDate(subscriptionStartDate, subscriptionType) || 'N/A'}
                          disabled
                          className="bg-light"
                        />
                        <Form.Text className="text-muted">
                          {t('auto.endDateIsAutomaticallyCalculat', `End date is automatically calculated based on subscription type`)}
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
                      {t('auto.creating', `Creating...`)}
                                                              </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      {t('auto.createAdmin', `Create Admin`)}
                                                                  </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        )}

        <Card className="shadow-sm">
          <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-people me-2"></i>
                  {t('auto.systemAdministrators', `System Administrators`)}
                </h5>
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="secondary">{admins.length} {t('auto.total', `Total`)}</Badge>
                  <Button
                    size="sm"
                    variant={showCreateForm ? 'secondary' : 'primary'}
                    onClick={() => setShowCreateForm((v) => !v)}
                  >
                    <i className="bi bi-person-plus me-1"></i>
                    {showCreateForm ? t('auto.cancel', 'Cancel') : t('auto.addNewAdmin', 'Add New Admin')}
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                  <p className="mt-2 text-muted">{t('auto.loadingAdministrators', `Loading administrators...`)}</p>
                </div>
              ) : admins.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-people display-4 text-muted"></i>
                  <p className="mt-2 text-muted">{t('auto.noAdministratorsFound', `No administrators found`)}</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>{t('auto.name', `Name`)}</th>
                        <th>{t('auto.email', `Email`)}</th>
                        <th>{t('auto.status', `Status`)}</th>
                        <th>{t('auto.subscription', `Subscription`)}</th>
                        <th>{t('auto.appTitle', `App Title`)}</th>
                        <th>{t('auto.currency', `Currency`)}</th>
                        <th>{t('auto.created', `Created`)}</th>
                        <th>{t('auto.actions', `Actions`)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => (
                        <tr key={admin.id}>
                          <td className="fw-medium">
                            {admin.name}
                            {admin.subscriptions?.some(sub => sub.status === 'PROCESSING') && (
                              <Badge bg="danger" className="ms-2 align-middle">
                                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                {t('auto.actionRequired', 'Action Required')}
                              </Badge>
                            )}
                          </td>
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
                                title={t('auto.editAdmin', `Edit Admin`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                onClick={() => handleShowSettings(admin)}
                                title={t('auto.settingsSubscription', `Settings & Subscription`)}
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
                                title={t('auto.deleteAdmin', `Delete Admin`)}
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

      {/* Edit Admin Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            {t('auto.editAdmin', `Edit Admin:`)} {selectedAdmin?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('auto.fullName', `Full Name *`)}</Form.Label>
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
                  <Form.Label>{t('auto.emailAddress', `Email Address *`)}</Form.Label>
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
                  <Form.Label>{t('auto.mobileNumber', `Mobile Number`)}</Form.Label>
                  <Form.Control 
                    type="tel" 
                    value={editMobile} 
                    onChange={(e) => setEditMobile(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>{t('auto.address', `Address`)}</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                value={editAddress} 
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('auto.newPassword', `New Password`)}</Form.Label>
              <Form.Control 
                type="password" 
                value={editPassword} 
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder={t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                minLength={6}
              />
              <Form.Text className="text-muted">
                {t('auto.leaveBlankToKeepCurrentPasswor', `Leave blank to keep current password`)}
                                            </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            {t('auto.cancel', `Cancel`)}
                                </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateAdmin}
            disabled={updating}
          >
            {updating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('auto.updating', `Updating...`)}
                                            </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                {t('auto.updateAdmin', `Update Admin`)}
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
            {t('auto.settingsSubscriptionFor', `Settings & Subscription for`)} {selectedAdmin?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey="app-settings" className="mb-3">
            <Tab eventKey="app-settings" title={t('auto.appSettings', `App Settings`)}>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('auto.appTitle', `App Title`)}</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={appTitle} 
                        onChange={(e) => setAppTitle(e.target.value)}
                        placeholder={t('auto.enterAppTitle', `Enter app title`)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('auto.defaultCurrency', `Default Currency`)}</Form.Label>
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
                      <Form.Label>{t('auto.tagline', `Tagline`)}</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={tagline} 
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder={t('auto.enterTagline', `Enter tagline`)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('auto.headerLogoUpload', `Header Logo (Upload)`)}</Form.Label>
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
                        {t('auto.uploadJpegPngGifOrWebpMax5mb', `Upload JPEG, PNG, GIF, or WebP (max 5MB)`)}
                                                                    </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('auto.headerLogoUrl', `Header Logo (URL)`)}</Form.Label>
                      <Form.Control 
                        type="url" 
                        value={headerImageUrl} 
                        onChange={(e) => {
                          setHeaderImageUrl(e.target.value);
                          if (e.target.value) {
                            setHeaderImage(e.target.value);
                          }
                        }}
                        placeholder={t('auto.enterLogoUrl', `Enter logo URL`)}
                      />
                      <Form.Text className="text-muted">
                        {t('auto.alternativeToFileUpload', `Alternative to file upload`)}
                                                                    </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Enable Homepage toggle removed from admin settings. This is controlled globally in Global Settings. */}
                
                {headerImage && (
                  <div className="mb-3">
                    <Form.Label>{t('auto.currentLogoPreview', `Current Logo Preview`)}</Form.Label>
                    <div className="border rounded p-3 bg-light text-center">
                      <Image
                        src={headerImage || '/assets/default-logo.png'}
                        alt={t('auto.headerPreview', `Header preview`)}
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
            <Tab eventKey="subscription" title={t('auto.subscription', `Subscription`)}>
              <Form>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('auto.subscriptionType', `Subscription Type`)}</Form.Label>
                      <Form.Select 
                        value={subscriptionType} 
                        onChange={(e) => setSubscriptionType(e.target.value)}
                      >
                        <option value="MONTHLY">{t('auto.monthly', `Monthly`)}</option>
                        <option value="YEARLY">{t('auto.yearly', `Yearly`)}</option>
                        <option value="LIFETIME">{t('auto.lifetime', `Lifetime`)}</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('auto.currency', `Currency`)}</Form.Label>
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
                      <Form.Label>{t('auto.amount', `Amount`)}</Form.Label>
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
                      <Form.Label>{t('auto.startDate', `Start Date`)}</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={subscriptionStartDate} 
                        onChange={(e) => setSubscriptionStartDate(e.target.value)} 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('auto.endDateAutocalculated', `End Date (Auto-calculated)`)}</Form.Label>
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
                        {t('auto.endDateIsAutomaticallyCalculat', `End date is automatically calculated based on subscription type and start date`)}
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
            {t('auto.cancel', `Cancel`)}
                                </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveSettings}
            disabled={updatingSettings}
          >
            {updatingSettings ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {t('auto.saving', `Saving...`)}
                                            </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                {t('auto.saveChanges', `Save Changes`)}
                                                </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function GlobalSettingsTab() {
    const { t } = useTranslation('common');
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appName, setAppName] = useState('');
  const [appLogo, setAppLogo] = useState('');
  const [tagline, setTagline] = useState('');
  const [enableHomePage, setEnableHomePage] = useState(true);
  const [storageProvider, setStorageProvider] = useState<'DRIVE' | 'CLOUDINARY'>('DRIVE');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [cloudinaryFolder, setCloudinaryFolder] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState('');
  const [smtpReplyTo, setSmtpReplyTo] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
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
        setStorageProvider((data.storageProvider as any) || 'DRIVE');
        setDriveFolderId(data.driveFolderId || '');
        setCloudinaryFolder(data.cloudinaryFolder || '');
        setSmtpHost(data.smtpHost || '');
        setSmtpPort(data.smtpPort || '');
        setSmtpUser(data.smtpUser || '');
        setSmtpPass(data.smtpPass || '');
        setSmtpSecure(data.smtpSecure || 'tls');
        setSmtpReplyTo(data.smtpReplyTo || '');
        setSmtpFrom(data.smtpFrom || '');
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
          enableHomePage,
          storageProvider,
          driveFolderId: driveFolderId || null,
          cloudinaryFolder: cloudinaryFolder || null,
          smtpHost: smtpHost || null,
          smtpPort: smtpPort || null,
          smtpUser: smtpUser || null,
          smtpPass: smtpPass || null,
          smtpSecure: smtpSecure || null,
          smtpReplyTo: smtpReplyTo || null,
          smtpFrom: smtpFrom || null,
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

  const handleTestSmtp = async () => {
    if (!testEmail) {
      alert('Please enter a destination email address to test.');
      return;
    }
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpSecure,
          smtpReplyTo,
          smtpFrom,
          testEmail
        })
      });
      const data = await res.json();
      setSmtpTestResult({
        success: res.ok && data.success,
        message: data.message
      });
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'An error occurred during testing.'
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">{t('auto.loadingGlobalSettings', `Loading global settings...`)}</p>
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
            {t('auto.globalApplicationSettings', `Global Application Settings`)}
                                </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.applicationName', `Application Name`)}</Form.Label>
                <Form.Control 
                  type="text" 
                  value={appName} 
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder={t('auto.enterApplicationName', `Enter application name`)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.applicationTagline', `Application Tagline`)}</Form.Label>
                <Form.Control 
                  type="text" 
                  value={tagline} 
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder={t('auto.enterApplicationTagline', `Enter application tagline`)}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.storageProvider', `Storage Provider`)}</Form.Label>
                <Form.Select
                  value={storageProvider}
                  onChange={(e) => setStorageProvider(e.target.value as 'DRIVE' | 'CLOUDINARY')}
                >
                  <option value="DRIVE">{t('auto.googleDrive', `Google Drive`)}</option>
                  <option value="CLOUDINARY">{t('auto.cloudinary', `Cloudinary`)}</option>
                </Form.Select>
                <Form.Text className="text-muted">{t('auto.chooseWhereUploadsLogosproofsA', `Choose where uploads (logos/proofs) are stored.`)}</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{storageProvider === 'CLOUDINARY' ? 'Cloudinary Folder' : 'Drive Folder ID'}</Form.Label>
                <Form.Control
                  type="text"
                  value={storageProvider === 'CLOUDINARY' ? cloudinaryFolder : driveFolderId}
                  onChange={(e) =>
                    storageProvider === 'CLOUDINARY'
                      ? setCloudinaryFolder(e.target.value)
                      : setDriveFolderId(e.target.value)
                  }
                  placeholder={storageProvider === 'CLOUDINARY' ? 'e.g. aims-uploads' : 'Drive folder ID (optional)'}
                />
                <Form.Text className="text-muted">
                  {storageProvider === 'CLOUDINARY'
                    ? 'Optional Cloudinary folder for uploads.'
                    : 'Optional Drive folder to place uploads under.'}
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <div className="p-3 bg-light rounded border">
                <div className="fw-semibold mb-2">
                  {t('auto.requiredSecretsFor', `Required secrets for`)} {storageProvider === 'CLOUDINARY' ? 'Cloudinary' : 'Google Drive'}
                </div>
                {storageProvider === 'CLOUDINARY' ? (
                  <ul className="mb-0 small">
                    <li>{t('auto.cloudinarycloudname', `CLOUDINARY_CLOUD_NAME`)}</li>
                    <li>{t('auto.cloudinaryapikey', `CLOUDINARY_API_KEY`)}</li>
                    <li>{t('auto.cloudinaryapisecret', `CLOUDINARY_API_SECRET`)}</li>
                  </ul>
                ) : (
                  <ul className="mb-0 small">
                    <li>{t('auto.googleclientid', `GOOGLE_CLIENT_ID`)}</li>
                    <li>{t('auto.googleclientsecret', `GOOGLE_CLIENT_SECRET`)}</li>
                    <li>{t('auto.googledriverefreshtoken', `GOOGLE_DRIVE_REFRESH_TOKEN`)}</li>
                    <li>{t('auto.drivefolderidOptional', `DRIVE_FOLDER_ID (optional)`)}</li>
                    <li>{t('auto.drivesharedidDriveshareddrivei', `DRIVE_SHARED_ID / DRIVE_SHARED_DRIVE_ID (optional for shared drive)`)}</li>
                  </ul>
                )}
              </div>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.applicationLogo', `Application Logo`)}</Form.Label>
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
                  {t('auto.uploadJpegPngGifOrWebpMax5mb', `Upload JPEG, PNG, GIF, or WebP (max 5MB)`)}
                                                  </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.smtpHost', `SMTP Host`)}</Form.Label>
                <Form.Control
                  type="text"
                  value={smtpHost}
                  onChange={e => setSmtpHost(e.target.value)}
                  placeholder="e.g. smtp.gmail.com"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.smtpPort', `SMTP Port`)}</Form.Label>
                <Form.Control
                  type="text"
                  value={smtpPort}
                  onChange={e => setSmtpPort(e.target.value)}
                  placeholder="e.g. 587 or 465"
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.smtpUser', `SMTP User / Email`)}</Form.Label>
                <Form.Control
                  type="email"
                  value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)}
                  placeholder="e.g. your-email@gmail.com"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.smtpPass', `SMTP Password`)}</Form.Label>
                <Form.Control
                  type="password"
                  value={smtpPass}
                  onChange={e => setSmtpPass(e.target.value)}
                  placeholder="SMTP server password"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.smtpSecure', `Security Protocol (TLS/SSL)`)}</Form.Label>
                <Form.Select 
                  value={smtpSecure}
                  onChange={e => setSmtpSecure(e.target.value)}
                >
                  <option value="tls">TLS/STARTTLS</option>
                  <option value="ssl">SSL/SMTPS</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>{t('auto.smtpFrom', `SMTP From Email`)}</Form.Label>
                <Form.Control
                  type="text"
                  value={smtpFrom}
                  onChange={e => setSmtpFrom(e.target.value)}
                  placeholder="e.g. AIMS <no-reply@aims.com>"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                 <Form.Label>{t('auto.smtpReplyTo', `SMTP Reply-To Email`)}</Form.Label>
                 <Form.Control
                   type="email"
                   value={smtpReplyTo}
                   onChange={e => setSmtpReplyTo(e.target.value)}
                   placeholder="e.g. support@aims.com"
                 />
               </Form.Group>
             </Col>
           </Row>

          <Row className="mb-4">
            <Col md={12}>
              <div className="p-3 bg-light border rounded">
                <h6 className="fw-bold"><i className="bi bi-envelope-fill me-2 text-secondary"></i>{t('auto.testSmtpConfiguration', 'Test SMTP Configuration')}</h6>
                <p className="text-muted small mb-3">{t('auto.testSmtpDesc', 'Enter a destination email address to verify SMTP connectivity and credentials.')}</p>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="email"
                    placeholder={t('auto.enterTestEmail', 'Enter test destination email')}
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    style={{ maxWidth: '300px' }}
                    className="bg-white"
                  />
                  <Button 
                    variant="outline-primary" 
                    onClick={handleTestSmtp}
                    disabled={testingSmtp || !testEmail}
                  >
                    {testingSmtp ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2"/>
                        {t('auto.testing', 'Testing...')}
                      </>
                    ) : (
                      t('auto.sendTestEmail', 'Send Test Email')
                    )}
                  </Button>
                </div>
                {smtpTestResult && (
                  <Alert 
                    variant={smtpTestResult.success ? 'success' : 'danger'} 
                    className="mt-3 mb-0 py-2 small"
                  >
                    {smtpTestResult.message}
                  </Alert>
                )}
              </div>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-4">
                <Form.Check
                  type="switch"
                  id="global-enable-homepage"
                  label={t('auto.enableHomepageGlobally', `Enable Homepage Globally`)}
                  checked={enableHomePage}
                  onChange={(e) => setEnableHomePage(e.target.checked)}
                />
                <Form.Text className="text-muted">
                  <strong>{t('auto.globalHomepageControl', `Global Homepage Control:`)}</strong> {t('auto.whenDisabledAllUsersWillBeRedi', `When disabled, all users will be redirected directly to the sign-in page instead of the homepage.`)}
                                                  </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          
          {appLogo && (
            <div className="mb-4">
              <Form.Label>{t('auto.currentLogoPreview', `Current Logo Preview`)}</Form.Label>
              <div className="border rounded p-3 bg-light text-center">
                <Image
                  src={appLogo || '/assets/app-logo.png'}
                  alt={t('auto.appLogoPreview', `App logo preview`)}
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
                  {t('auto.updating', `Updating...`)}
                                                  </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  {t('auto.saveGlobalSettings', `Save Global Settings`)}
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
    const { t } = useTranslation('common');
  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-0">
            <i className="bi bi-code-slash me-2 text-secondary"></i>
            {t('auto.developerDashboard', `Developer Dashboard`)}
                                </h1>
          <p className="text-muted">{t('auto.manageSystemAdministratorsAndG', `Manage system administrators and global settings`)}</p>
        </div>
      </div>

      <Tabs defaultActiveKey="global-settings" id="developer-dashboard-tabs" className="mb-4">
        <Tab 
          eventKey="global-settings" 
          title={
            <span>
              <i className="bi bi-globe me-2"></i>
              {t('auto.globalSettings', `Global Settings`)}
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
              {t('auto.administrators', `Administrators`)}
                              </span>
          }
        >
          <AdminManagementTab />
        </Tab>
      </Tabs>
      
      <div className="text-center mt-5 pt-4 border-top">
        <small className="text-muted">
          © {new Date().getFullYear()} {t('auto.aimsAcademyInformationAndManag', `AIMS - Academy Information and Management System. All rights reserved.`)}
                          </small>
      </div>
    </div>
  );
}
