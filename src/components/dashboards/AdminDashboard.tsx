import FeeVerificationTab from './FeeVerificationTab';
import FeeSubform from './FeeSubform';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ParentAssociationSubform from '../ParentAssociationSubform';
import { Form, Button, Table, Card, Row, Col, Tabs, Tab, Alert, Spinner, Badge, Modal, InputGroup } from 'react-bootstrap';
import { Role, FeeStatus, AttendanceStatus, SalaryStatus, ClassDay, PayType } from '@prisma/client';
import { timezones, getTimezonesByRegion, findTimezone } from '../../utils/timezones';
import FeeManagementTab from './FeeManagementTab';
import AdminSubscriptionTab from './AdminSubscriptionTab';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  mobile?: string;
  dateOfBirth?: string;
  address?: string;
  qualification?: string;
  payRate?: number;
  payType?: PayType;
  payCurrency?: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  _count?: {
    studentCourses: number;
  };
}

interface Assignment {
  id: string;
  studentId: string;
  courseId: string;
  teacherId: string;
  assignmentDate: string;
  startTime?: string;
  duration?: number;
  classDays: ClassDay[];
  timezone: string;
  monthlyFee?: number;
  currency: string;
  isActive: boolean;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    name: string;
    description?: string;
  };
  teacher: {
    id: string;
    name: string;
    email: string;
  };
}

interface Fee {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: FeeStatus;
  paidDate?: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  paidBy?: {
    id: string;
    name: string;
    email: string;
  };
  course?: {
    id: string;
    name: string;
  };
}

interface Salary {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: SalaryStatus;
  paidDate?: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  paidBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Progress {
  id: string;
  date: string;
  lesson?: string;
  homework?: string;
  lessonProgress?: number;
  score?: number;
  remarks?: string;
  attendance: AttendanceStatus;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    name: string;
  };
  parentRemarks?: Array<{
    id: string;
    remark: string;
    createdAt: string;
    parent: {
      name: string;
    };
  }>;
}

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
];

const roleConfig = {
  TEACHER: { icon: 'bi-person-workspace', color: 'success', title: 'Teachers' },
  PARENT: { icon: 'bi-people', color: 'info', title: 'Parents' },
  STUDENT: { icon: 'bi-mortarboard', color: 'warning', title: 'Students' },
  DEVELOPER: { icon: 'bi-code-slash', color: 'secondary', title: 'Developers' },
  ADMIN: { icon: 'bi-gear-fill', color: 'primary', title: 'Admins' }
} as const;

const daysOfWeek = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

// Global getCurrencySymbol function for the main component
const getCurrencySymbol = (currencyCode: string) => {
  const currency = currencies.find(c => c.code === currencyCode);
  return currency ? currency.symbol : currencyCode;
};

// Assignment Subform Component
function AssignmentSubform({ 
  studentId, 
  assignments, 
  onAssignmentChange 
}: { 
  studentId: string;
  assignments: Assignment[];
  onAssignmentChange: () => void;
}) {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Assignment form states
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [classDays, setClassDays] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('UTC');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [currency, setCurrency] = useState('USD');

  const timezonesByRegion = getTimezonesByRegion();

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teachersRes, subjectsRes] = await Promise.all([
        fetch('/api/users?role=TEACHER'),
        fetch('/api/subjects'),
      ]);
      
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
    } catch (error) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseId: selectedSubject,
          teacherId: selectedTeacher,
          assignmentDate: assignmentDate || new Date().toISOString(),
          startTime,
          duration: duration ? parseInt(duration) : null,
          classDays,
          timezone,
          monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
          currency,
        }),
      });

      if (res.ok) {
        setSuccess('Assignment created successfully!');
        onAssignmentChange();
        resetForm();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create assignment');
      }
    } catch (error) {
      setError('Error creating assignment');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedSubject('');
    setSelectedTeacher('');
    setAssignmentDate('');
    setStartTime('');
    setDuration('');
    setClassDays([]);
    setTimezone('UTC');
    setMonthlyFee('');
    setCurrency('USD');
  };

  const handleDayToggle = (day: string) => {
    setClassDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const res = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignmentId }),
      });

      if (res.ok) {
        setSuccess('Assignment deleted successfully!');
        onAssignmentChange();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to delete assignment');
      }
    } catch (error) {
      setError('Error deleting assignment');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
        <p className="mt-2 text-muted small">Loading assignment data...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-3">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Create Assignment
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateAssignment}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject *</Form.Label>
                  <Form.Select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a subject...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Teacher *</Form.Label>
                  <Form.Select 
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a teacher...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Assignment Date</Form.Label>
                  <Form.Control 
                    type="date"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                    size="sm"
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Time</Form.Label>
                      <Form.Control 
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Duration (minutes)</Form.Label>
                      <Form.Control 
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="60"
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Timezone</Form.Label>
                  <Form.Select 
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    size="sm"
                  >
                    {Object.entries(timezonesByRegion).map(([region, tzList]) => (
                      <optgroup key={region} label={region}>
                        {tzList.map(tz => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label} ({tz.offset})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Class Days</Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {daysOfWeek.map(day => (
                      <Form.Check
                        key={day.value}
                        type="checkbox"
                        id={`day-${day.value}`}
                        label={day.label}
                        checked={classDays.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                        className="me-2"
                      />
                    ))}
                  </div>
                </Form.Group>

                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Monthly Fee</Form.Label>
                      <Form.Control 
                        type="number"
                        step="0.01"
                        value={monthlyFee}
                        onChange={(e) => setMonthlyFee(e.target.value)}
                        placeholder="0.00"
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        size="sm"
                      >
                        {currencies.map(curr => (
                          <option key={curr.code} value={curr.code}>
                            {curr.code}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Assignment
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-list-task me-2"></i>
                  Current Assignments
                </h6>
                <Badge bg="primary">{assignments.length}</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {assignments.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-list-task display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No assignments found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Schedule</th>
                        <th>Fee</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="fw-medium">{assignment.course?.name}</td>
                          <td className="text-muted">{assignment.teacher?.name}</td>
                          <td className="small">
                            {assignment.startTime && (
                              <div>{assignment.startTime}</div>
                            )}
                            {assignment.duration && (
                              <div className="text-muted">{assignment.duration}min</div>
                            )}
                            {assignment.classDays && assignment.classDays.length > 0 && (
                              <div className="text-muted">
                                {assignment.classDays.join(', ')}
                              </div>
                            )}
                            {assignment.timezone && (
                              <div className="text-muted small">
                                {findTimezone(assignment.timezone)?.label || assignment.timezone}
                              </div>
                            )}
                          </td>
                          <td>
                            {assignment.monthlyFee ? (
                              <Badge bg="success">
                                {getCurrencySymbol(assignment.currency)}{assignment.monthlyFee}
                              </Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                              title="Delete Assignment"
                            >
                              <i className="bi bi-trash"></i>
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
    </div>
  );
}

// Detail View Modal Component
function DetailViewModal({ show, onHide, title, data }: { show: boolean; onHide: () => void; title: string; data: any }) {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-eye me-2"></i>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          {Object.entries(data || {}).map(([key, value]) => (
            <div key={key} className="col-md-6 mb-3">
              <strong className="text-capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong>
              <div className="mt-1">
                {typeof value === 'object' && value !== null ? (
                  JSON.stringify(value, null, 2)
                ) : (
                  String(value || '-')
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Expandable Text Component
function ExpandableText({ text, maxLength = 50 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!text || text.length <= maxLength) {
    return <span>{text || '-'}</span>;
  }

  return (
    <span>
      {expanded ? text : `${text.substring(0, maxLength)}...`}
      <Button
        variant="link"
        size="sm"
        className="p-0 ms-1"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show less' : 'Show more'}
      </Button>
    </span>
  );
}

function UserManagementTab({ role }: { role: Role }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  
  // Teacher-specific fields
  const [qualification, setQualification] = useState('');
  const [payRate, setPayRate] = useState('');
  const [payType, setPayType] = useState<PayType>('MONTHLY');
  const [payCurrency, setPayCurrency] = useState('USD');

  // Salary management states for teacher edit
  const [teacherPayments, setTeacherPayments] = useState<any[]>([]);
  const [teacherAdvances, setTeacherAdvances] = useState<any[]>([]);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [creatingAdvance, setCreatingAdvance] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [advancePrincipal, setAdvancePrincipal] = useState('');
  const [advanceInstallments, setAdvanceInstallments] = useState('');
  const [advancePayType, setAdvancePayType] = useState<PayType>('MONTHLY');
  const [advanceCurrency, setAdvanceCurrency] = useState('USD');
  const [advanceDetails, setAdvanceDetails] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  // Student-specific states
  const [studentAssignments, setStudentAssignments] = useState<Assignment[]>([]);
  const [studentFees, setStudentFees] = useState<Fee[]>([]);
  const [parentAssociations, setParentAssociations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  const config = roleConfig[role as keyof typeof roleConfig];

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?role=${role}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch users');
        setUsers([]);
      }
    } catch (error) {
      setError('Error fetching users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const userData: any = { 
        name, 
        email, 
        password, 
        role,
        mobile: mobile || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address || undefined
      };

      // Only add teacher-specific fields for teachers
      if (role === 'TEACHER') {
        userData.qualification = qualification || undefined;
        userData.payRate = payRate ? parseFloat(payRate) : undefined;
        userData.payType = payType;
        userData.payCurrency = payCurrency;
      }

      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        setSuccess(`${role.toLowerCase()} created successfully!`);
        fetchUsers();
        resetForm();
      } else {
        const errorData = await res.json();
        setError(errorData.message || `Failed to create ${role.toLowerCase()}`);
      }
    } catch (error) {
      setError(`Error creating ${role.toLowerCase()}`);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setMobile('');
    setDateOfBirth('');
    setAddress('');
    setQualification('');
    setPayRate('');
    setPayType('MONTHLY');
    setPayCurrency('USD');
    setActiveTab('basic');
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setMobile(user.mobile || '');
    setDateOfBirth(user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '');
    setAddress(user.address || '');
    setQualification(user.qualification || '');
    setPayRate(user.payRate?.toString() || '');
    setPayType(user.payType || 'MONTHLY');
    setPayCurrency(user.payCurrency || 'USD');
    setActiveTab('basic');
    
    if (role === 'STUDENT') {
      fetchStudentData(user.id);
    }
    if (role === 'TEACHER') {
      fetchTeacherSalaryData(user.id);
    }
    
    setShowEditModal(true);
  };

  const fetchStudentData = async (studentId: string) => {
    try {
      setLoading(true);
      const [assignmentsRes, feesRes, associationsRes] = await Promise.all([
        fetch('/api/assignments'),
        fetch('/api/fees'),
        fetch(`/api/users/parent-associations?studentId=${studentId}`),
      ]);

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setStudentAssignments(assignmentsData.filter((a: Assignment) => a.studentId === studentId));
      } else {
        setError('Failed to fetch assignments');
        setStudentAssignments([]);
      }

      if (feesRes.ok) {
        const feesData = await feesRes.json();
        setStudentFees(feesData.filter((f: Fee) => f.student.id === studentId));
      } else {
        setError('Failed to fetch student data');
        setStudentFees([]);
      }

      if (associationsRes.ok) {
        const associationsData = await associationsRes.json();
        setParentAssociations(associationsData);
      } else {
        setError('Failed to fetch parent associations');
        setParentAssociations([]);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherSalaryData = async (teacherId: string) => {
    try {
      const res = await fetch(`/api/salaries/payments?teacherId=${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        setTeacherPayments(data.payments || []);
        setTeacherAdvances(data.advances || []);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleRecordPayment = async () => {
    if (!editingUser) return;
    setRecordingPayment(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/salaries/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: editingUser.id,
          amount: parseFloat(paymentAmount),
          paidDate: paymentDate || undefined,
          paymentDetails: paymentDetails || undefined
        })
      });
      if (res.ok) {
        setSuccess('Salary payment recorded');
        setPaymentAmount('');
        setPaymentDate('');
        setPaymentDetails('');
        fetchTeacherSalaryData(editingUser.id);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to record payment');
      }
    } catch (error) {
      setError('Error recording payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleCreateAdvance = async () => {
    if (!editingUser) return;
    setCreatingAdvance(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/salaries/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: editingUser.id,
          principal: parseFloat(advancePrincipal),
          installments: parseInt(advanceInstallments || '1', 10),
          payType: advancePayType,
          currency: advanceCurrency,
          details: advanceDetails || undefined
        })
      });
      if (res.ok) {
        setSuccess('Salary advance created');
        setAdvancePrincipal('');
        setAdvanceInstallments('');
        setAdvanceDetails('');
        fetchTeacherSalaryData(editingUser.id);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create salary advance');
      }
    } catch (error) {
      setError('Error creating salary advance');
    } finally {
      setCreatingAdvance(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditing(true);
    setError('');
    setSuccess('');

    try {
      const updateData: any = { 
        id: editingUser.id,
        name, 
        email, 
        ...(password && { password }),
        mobile: mobile || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address || undefined
      };

      // Only add teacher-specific fields for teachers
      if (role === 'TEACHER') {
        updateData.qualification = qualification || undefined;
        updateData.payRate = payRate ? parseFloat(payRate) : undefined;
        updateData.payType = payType;
        updateData.payCurrency = payCurrency;
      }

      const res = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setSuccess(`${role.toLowerCase()} updated successfully!`);
        fetchUsers();
        setShowEditModal(false);
        setEditingUser(null);
      } else {
        const errorData = await res.json();
        setError(errorData.message || `Failed to update ${role.toLowerCase()}`);
      }
    } catch (error) {
      setError(`Error updating ${role.toLowerCase()}`);
    } finally {
      setEditing(false);
    }
  };

  const handleViewDetails = (user: User) => {
    setDetailData(user);
    setShowDetailModal(true);
  };

  const handleAssignmentChange = () => {
    if (editingUser) {
      fetchStudentData(editingUser.id);
    }
  };

  const handleFeeChange = () => {
    if (editingUser) {
      fetchStudentData(editingUser.id);
    }
  };

  const handleAssociationChange = () => {
    if (editingUser) {
      fetchStudentData(editingUser.id);
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className={`bg-${config.color} text-white`}>
              <h6 className="mb-0">
                <i className={`${config.icon} me-2`}></i>
                Create New {role.charAt(0) + role.slice(1).toLowerCase()}
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateUser}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Enter full name"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="Enter email address"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder="Enter password"
                    minLength={6}
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Mobile Number</Form.Label>
                  <Form.Control 
                    type="tel" 
                    value={mobile} 
                    onChange={(e) => setMobile(e.target.value)} 
                    placeholder="Enter mobile number"
                    size="sm"
                  />
                </Form.Group>
                {(role === 'STUDENT' || role === 'TEACHER') && (
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control 
                      type="date" 
                      value={dateOfBirth} 
                      onChange={(e) => setDateOfBirth(e.target.value)} 
                      size="sm"
                    />
                  </Form.Group>
                )}
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={2}
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Enter address"
                    size="sm"
                  />
                </Form.Group>
                
                {/* Teacher-specific fields - only show for teachers */}
                {role === 'TEACHER' && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Qualification</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={qualification} 
                        onChange={(e) => setQualification(e.target.value)} 
                        placeholder="Enter qualification"
                        size="sm"
                      />
                    </Form.Group>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Pay Rate</Form.Label>
                          <Form.Control 
                            type="number" 
                            step="0.01"
                            value={payRate} 
                            onChange={(e) => setPayRate(e.target.value)} 
                            placeholder="0.00"
                            size="sm"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Salary Type</Form.Label>
                          <Form.Select 
                            value={payType}
                            onChange={(e) => setPayType(e.target.value as PayType)}
                            size="sm"
                          >
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="FORTNIGHTLY">Fortnightly</option>
                            <option value="MONTHLY">Monthly</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Label>Pay Currency</Form.Label>
                      <Form.Select 
                        value={payCurrency}
                        onChange={(e) => setPayCurrency(e.target.value)}
                        size="sm"
                      >
                        {currencies.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </>
                )}
                
                <Button 
                  variant={config.color} 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create
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
                <h6 className="mb-0">
                  <i className={`${config.icon} me-2`}></i>
                  {config.title}
                </h6>
                <Badge bg={config.color}>{users.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2 text-muted small">Loading {config.title.toLowerCase()}...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-4">
                  <i className={`${config.icon} display-6 text-muted`}></i>
                  <p className="mt-2 text-muted small">No {config.title.toLowerCase()} found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        {role === 'TEACHER' && <th>Pay Rate</th>}
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="fw-medium">{user.name}</td>
                          <td className="text-muted">{user.email}</td>
                          <td className="text-muted">{user.mobile || '-'}</td>
                          {role === 'TEACHER' && (
                            <td className="text-muted">
                              {user.payRate ? (
                                <Badge bg="success">
                                  {getCurrencySymbol(user.payCurrency || 'USD')}{user.payRate}
                                  <small className="ms-1">/{user.payType?.toLowerCase()}</small>
                                </Badge>
                              ) : (
                                '-'
                              )}
                            </td>
                          )}
                          <td className="text-muted small">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleViewDetails(user)}
                                title="View Details"
                              >
                                <i className="bi bi-eye"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                title="Edit User"
                              >
                                <i className="bi bi-pencil"></i>
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

      {/* Enhanced Edit User Modal with Tabs for Students and salary subform for teachers */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size={role === 'STUDENT' ? 'xl' : 'lg'}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Edit {role.charAt(0) + role.slice(1).toLowerCase()}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {role === 'STUDENT' ? (
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'basic')} className="mb-3">
              <Tab eventKey="basic" title={
                <span>
                  <i className="bi bi-person me-2"></i>
                  Basic Info
                </span>
              }>
                <Form onSubmit={handleUpdateUser}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          required 
                          placeholder="Enter full name"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          required 
                          placeholder="Enter email address"
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
                          value={mobile} 
                          onChange={(e) => setMobile(e.target.value)} 
                          placeholder="Enter mobile number"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Date of Birth</Form.Label>
                        <Form.Control 
                          type="date" 
                          value={dateOfBirth} 
                          onChange={(e) => setDateOfBirth(e.target.value)} 
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control 
                      as="textarea"
                      rows={3}
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="Enter address"
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Password</Form.Label>
                    <Form.Control 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Leave blank to keep current password"
                      minLength={6}
                    />
                    <Form.Text className="text-muted">
                      Leave blank to keep current password
                    </Form.Text>
                  </Form.Group>
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="warning"
                      disabled={editing}
                    >
                      {editing ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Update
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Tab>
              
              <Tab eventKey="parents" title={
                <span>
                  <i className="bi bi-people me-2"></i>
                  Parent Associations
                  {parentAssociations.length > 0 && (
                    <Badge bg="info" className="ms-2">{parentAssociations.length}</Badge>
                  )}
                </span>
              }>
                {editingUser && (
                  <ParentAssociationSubform 
                    studentId={editingUser.id}
                    onAssociationChange={handleAssociationChange}
                  />
                )}
              </Tab>              
              <Tab eventKey="assignments" title={
                <span>
                  <i className="bi bi-diagram-3 me-2"></i>
                  Assignments
                  {studentAssignments.length > 0 && (
                    <Badge bg="primary" className="ms-2">{studentAssignments.length}</Badge>
                  )}
                </span>
              }>
                {editingUser && (
                  <AssignmentSubform 
                    studentId={editingUser.id}
                    assignments={studentAssignments}
                    onAssignmentChange={handleAssignmentChange}
                  />
                )}
              </Tab>
              
              <Tab eventKey="fees" title={
                <span>
                  <i className="bi bi-cash-stack me-2"></i>
                  Fees
                  {studentFees.length > 0 && (
                    <Badge bg="success" className="ms-2">{studentFees.length}</Badge>
                  )}
                </span>
              }>
                {editingUser && (
                  <FeeSubform
                    studentId={editingUser.id}
                    onFeeChange={handleFeeChange}
                  />
                )}
              </Tab>
                          </Tabs>
          ) : role === 'TEACHER' ? (
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'basic')} className="mb-3">
              <Tab eventKey="basic" title={<span><i className="bi bi-person me-2"></i>Basic Info</span>}>
                <Form onSubmit={handleUpdateUser}>
                  <Form.Group className="mb-3">
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                      placeholder="Enter full name"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      placeholder="Enter email address"
                    />
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
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control 
                      type="date" 
                      value={dateOfBirth} 
                      onChange={(e) => setDateOfBirth(e.target.value)} 
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
                  <Form.Group className="mb-3">
                    <Form.Label>Qualification</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={qualification} 
                      onChange={(e) => setQualification(e.target.value)} 
                      placeholder="Enter qualification"
                    />
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Pay Rate</Form.Label>
                        <Form.Control 
                          type="number" 
                          step="0.01"
                          value={payRate} 
                          onChange={(e) => setPayRate(e.target.value)} 
                          placeholder="0.00"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Salary Type</Form.Label>
                        <Form.Select 
                          value={payType}
                          onChange={(e) => setPayType(e.target.value as PayType)}
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="FORTNIGHTLY">Fortnightly</option>
                          <option value="MONTHLY">Monthly</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Pay Currency</Form.Label>
                    <Form.Select 
                      value={payCurrency}
                      onChange={(e) => setPayCurrency(e.target.value)}
                    >
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Password</Form.Label>
                    <Form.Control 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Leave blank to keep current password"
                      minLength={6}
                    />
                    <Form.Text className="text-muted">
                      Leave blank to keep current password
                    </Form.Text>
                  </Form.Group>
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="warning" disabled={editing}>
                      {editing ? (
                        <><Spinner animation="border" size="sm" className="me-2" />Updating...</>
                      ) : (
                        <><i className="bi bi-check-circle me-2"></i>Update</>
                      )}
                    </Button>
                  </div>
                </Form>
              </Tab>
              <Tab eventKey="salaries" title={<span><i className="bi bi-cash-stack me-2"></i>Salary</span>}>
                <Row className="g-3">
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light"><strong>Record Salary Payment</strong></Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Amount</Form.Label>
                              <Form.Control type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Paid Date</Form.Label>
                              <Form.Control type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                            </Form.Group>
                          </Col>
                        </Row>
                        <Form.Group className="mb-3">
                          <Form.Label>Payment Details/Remarks</Form.Label>
                          <Form.Control as="textarea" rows={2} value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} />
                        </Form.Group>
                        <div className="d-flex justify-content-end">
                          <Button variant="primary" size="sm" onClick={handleRecordPayment} disabled={recordingPayment}>
                            {recordingPayment ? 'Recording...' : 'Record Payment'}
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light"><strong>Create Salary Advance/Loan</strong></Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Principal</Form.Label>
                              <Form.Control type="number" step="0.01" value={advancePrincipal} onChange={(e) => setAdvancePrincipal(e.target.value)} />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Installments</Form.Label>
                              <Form.Control type="number" value={advanceInstallments} onChange={(e) => setAdvanceInstallments(e.target.value)} />
                            </Form.Group>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Repayment Frequency</Form.Label>
                              <Form.Select value={advancePayType} onChange={(e) => setAdvancePayType(e.target.value as PayType)}>
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="FORTNIGHTLY">Fortnightly</option>
                                <option value="MONTHLY">Monthly</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Currency</Form.Label>
                              <Form.Select value={advanceCurrency} onChange={(e) => setAdvanceCurrency(e.target.value)}>
                                {currencies.map(currency => (
                                  <option key={currency.code} value={currency.code}>{currency.code}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>
                        <Form.Group className="mb-3">
                          <Form.Label>Details/Remarks</Form.Label>
                          <Form.Control as="textarea" rows={2} value={advanceDetails} onChange={(e) => setAdvanceDetails(e.target.value)} />
                        </Form.Group>
                        <div className="d-flex justify-content-end">
                          <Button variant="warning" size="sm" onClick={handleCreateAdvance} disabled={creatingAdvance}>
                            {creatingAdvance ? 'Creating...' : 'Create Advance'}
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="g-3 mt-2">
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light"><strong>Payment History</strong></Card.Header>
                      <Card.Body className="p-0">
                        <div className="table-responsive">
                          <Table size="sm" className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherPayments.length === 0 ? (
                                <tr><td colSpan={3} className="text-center text-muted small py-3">No records</td></tr>
                              ) : teacherPayments.map((p) => (
                                <tr key={p.id}>
                                  <td className="fw-bold text-success">{getCurrencySymbol(p.currency)}{p.amount.toFixed(2)}</td>
                                  <td className="small">{new Date(p.paidDate).toLocaleDateString()}</td>
                                  <td className="small">{p.paymentDetails || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-light"><strong>Advances/Loans</strong></Card.Header>
                      <Card.Body className="p-0">
                        <div className="table-responsive">
                          <Table size="sm" className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Principal</th>
                                <th>Balance</th>
                                <th>Installments</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacherAdvances.length === 0 ? (
                                <tr><td colSpan={4} className="text-center text-muted small py-3">No records</td></tr>
                              ) : teacherAdvances.map((a) => (
                                <tr key={a.id}>
                                  <td className="fw-bold">{getCurrencySymbol(a.currency)}{a.principal.toFixed(2)}</td>
                                  <td>{getCurrencySymbol(a.currency)}{a.balance.toFixed(2)}</td>
                                  <td>{a.installments} x {a.installmentAmount}</td>
                                  <td><Badge bg={a.status === 'ACTIVE' ? 'warning' : a.status === 'COMPLETED' ? 'success' : 'secondary'}>{a.status}</Badge></td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>
            </Tabs>
          ) : (
            <Form onSubmit={handleUpdateUser}>
              <Form.Group className="mb-3">
                <Form.Label>Full Name</Form.Label>
                <Form.Control 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="Enter full name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email Address</Form.Label>
                <Form.Control 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="Enter email address"
                />
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
              
                            
              <Form.Group className="mb-4">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Leave blank to keep current password"
                  minLength={6}
                />
                <Form.Text className="text-muted">
                  Leave blank to keep current password
                </Form.Text>
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="warning"
                  disabled={editing}
                >
                  {editing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Update
                    </>
                  )}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* Detail View Modal */}
      <DetailViewModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        title={`${role.charAt(0) + role.slice(1).toLowerCase()} Details`}
        data={detailData}
      />
    </div>
  );
}

function SubjectManagementTab() {
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Course | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      } else {
        setError('Failed to fetch subjects');
      }
    } catch (error) {
      setError('Error fetching subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/subjects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        setSuccess('Subject created successfully!');
        fetchSubjects();
        setName('');
        setDescription('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create subject');
      }
    } catch (error) {
      setError('Error creating subject');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubject = (subject: Course) => {
    setEditingSubject(subject);
    setName(subject.name);
    setDescription(subject.description || '');
    setShowEditModal(true);
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    setEditing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/subjects/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingSubject.id,
          name, 
          description
        }),
      });

      if (res.ok) {
        setSuccess('Subject updated successfully!');
        fetchSubjects();
        setShowEditModal(false);
        setEditingSubject(null);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update subject');
      }
    } catch (error) {
      setError('Error updating subject');
    } finally {
      setEditing(false);
    }
  };

  const handleViewDetails = (subject: Course) => {
    setDetailData(subject);
    setShowDetailModal(true);
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-book me-2"></i>
                Create New Subject
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateSubject}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Enter subject name"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Description</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter subject description"
                    size="sm"
                  />
                </Form.Group>
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Subject
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
                <h6 className="mb-0">
                  <i className="bi bi-book me-2"></i>
                  Subjects
                </h6>
                <Badge bg="primary">{subjects.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2 text-muted small">Loading subjects...</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-book display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No subjects found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Students</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subject) => (
                        <tr key={subject.id}>
                          <td className="fw-medium">{subject.name}</td>
                          <td className="text-muted">
                            <ExpandableText 
                              text={subject.description || 'No description'} 
                              maxLength={50} 
                            />
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {subject._count?.studentCourses || 0}
                            </Badge>
                          </td>
                          <td className="text-muted small">
                            {new Date(subject.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleViewDetails(subject)}
                                title="View Details"
                              >
                                <i className="bi bi-eye"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditSubject(subject)}
                                title="Edit Subject"
                              >
                                <i className="bi bi-pencil"></i>
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

      {/* Edit Subject Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Edit Subject
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateSubject}>
            <Form.Group className="mb-3">
              <Form.Label>Subject Name</Form.Label>
              <Form.Control 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="Enter subject name"
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Description</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter subject description"
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="warning"
                disabled={editing}
              >
                {editing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Update
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Detail View Modal */}
      <DetailViewModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        title="Subject Details"
        data={detailData}
      />
    </div>
  );
}

function AssignmentsTab() {
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Unified assignment form states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [classDays, setClassDays] = useState<string[]>([]);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Edit assignment modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [updating, setUpdating] = useState(false);

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, teachersRes, subjectsRes, assignmentsRes] = await Promise.all([
        fetch('/api/users?role=STUDENT'),
        fetch('/api/users?role=TEACHER'),
        fetch('/api/subjects'),
        fetch('/api/assignments'),
      ]);
      
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
    } catch (error) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          courseId: selectedSubject,
          teacherId: selectedTeacher,
          assignmentDate: assignmentDate || new Date().toISOString(),
          startTime,
          duration: duration ? parseInt(duration) : null,
          classDays,
          monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
          currency,
        }),
      });

      if (res.ok) {
        setSuccess('Assignment created successfully!');
        fetchData();
        resetForm();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create assignment');
      }
    } catch (error) {
      setError('Error creating assignment');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent('');
    setSelectedSubject('');
    setSelectedTeacher('');
    setAssignmentDate('');
    setStartTime('');
    setDuration('');
    setClassDays([]);
    setMonthlyFee('');
    setCurrency('USD');
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setSelectedStudent(assignment.studentId);
    setSelectedSubject(assignment.courseId);
    setSelectedTeacher(assignment.teacherId);
    setAssignmentDate(assignment.assignmentDate ? assignment.assignmentDate.split('T')[0] : '');
    setStartTime(assignment.startTime || '');
    setDuration(assignment.duration?.toString() || '');
    setClassDays(assignment.classDays || []);
    setMonthlyFee(assignment.monthlyFee?.toString() || '');
    setCurrency(assignment.currency || 'USD');
    setShowEditModal(true);
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAssignment.id,
          startTime,
          duration: duration ? parseInt(duration) : null,
          classDays,
          monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
          currency,
        }),
      });

      if (res.ok) {
        setSuccess('Assignment updated successfully!');
        fetchData();
        setShowEditModal(false);
        setEditingAssignment(null);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update assignment');
      }
    } catch (error) {
      setError('Error updating assignment');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const res = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignmentId }),
      });

      if (res.ok) {
        setSuccess('Assignment deleted successfully!');
        fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to delete assignment');
      }
    } catch (error) {
      setError('Error deleting assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setClassDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2 text-muted">Loading assignment data...</p>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={5}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Create New Assignment
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateAssignment}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Student *</Form.Label>
                  <Form.Select 
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Select Subject *</Form.Label>
                  <Form.Select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a subject...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Select Teacher *</Form.Label>
                  <Form.Select 
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a teacher...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Assignment Date</Form.Label>
                  <Form.Control 
                    type="date"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                    size="sm"
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Time</Form.Label>
                      <Form.Control 
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Duration (minutes)</Form.Label>
                      <Form.Control 
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="60"
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Class Days</Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {daysOfWeek.map(day => (
                      <Form.Check
                        key={day.value}
                        type="checkbox"
                        id={`day-${day.value}`}
                        label={day.label}
                        checked={classDays.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                        className="me-3"
                      />
                    ))}
                  </div>
                </Form.Group>

                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Monthly Fee</Form.Label>
                      <Form.Control 
                        type="number"
                        step="0.01"
                        value={monthlyFee}
                        onChange={(e) => setMonthlyFee(e.target.value)}
                        placeholder="0.00"
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        size="sm"
                      >
                        {currencies.map(curr => (
                          <option key={curr.code} value={curr.code}>
                            {curr.code} - {curr.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Assignment
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="bi bi-list-task me-2"></i>
                  Current Assignments
                </h6>
                <Badge bg="primary">{assignments.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {assignments.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-list-task display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No assignments found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Student</th>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Schedule</th>
                        <th>Fee</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="fw-medium">{assignment.student?.name}</td>
                          <td>{assignment.course?.name}</td>
                          <td className="text-muted">{assignment.teacher?.name}</td>
                          <td className="small">
                            {assignment.startTime && (
                              <div>{assignment.startTime}</div>
                            )}
                            {assignment.duration && (
                              <div className="text-muted">{assignment.duration}min</div>
                            )}
                            {assignment.classDays && assignment.classDays.length > 0 && (
                              <div className="text-muted">
                                {assignment.classDays.join(', ')}
                              </div>
                            )}
                            {assignment.timezone && (
                              <div className="text-muted small">
                                {findTimezone(assignment.timezone)?.label || assignment.timezone}
                              </div>
                            )}
                          </td>
                          <td>
                            {assignment.monthlyFee ? (
                              <Badge bg="success">
                                {getCurrencySymbol(assignment.currency)}{assignment.monthlyFee}
                              </Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditAssignment(assignment)}
                                title="Edit Assignment"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                title="Delete Assignment"
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

      {/* Edit Assignment Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Edit Assignment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateAssignment}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time</Form.Label>
                  <Form.Control 
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Duration (minutes)</Form.Label>
                  <Form.Control 
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="60"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Class Days</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {daysOfWeek.map(day => (
                  <Form.Check
                    key={day.value}
                    type="checkbox"
                    id={`edit-day-${day.value}`}
                    label={day.label}
                    checked={classDays.includes(day.value)}
                    onChange={() => handleDayToggle(day.value)}
                    className="me-3"
                  />
                ))}
              </div>
            </Form.Group>

            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Monthly Fee</Form.Label>
                  <Form.Control 
                    type="number"
                    step="0.01"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    size="sm"
                  >
                    {currencies.map(curr => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
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
                    Update Assignment
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

function SalaryManagementTab() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Salary creation states
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [salaryTitle, setSalaryTitle] = useState('');
  const [salaryDescription, setSalaryDescription] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('USD');
  const [salaryDueDate, setSalaryDueDate] = useState('');

  // Edit states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salariesRes, teachersRes] = await Promise.all([
        fetch('/api/salaries'),
        fetch('/api/users?role=TEACHER'),
      ]);
      
      if (salariesRes.ok) {
        const salariesData = await salariesRes.json();
        setSalaries(salariesData);
      } else {
        setError('Failed to fetch salary data');
      }

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(teachersData);
      }
    } catch (error) {
      setError('Error fetching salary data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          title: salaryTitle,
          description: salaryDescription,
          amount: parseFloat(salaryAmount),
          currency: salaryCurrency,
          dueDate: salaryDueDate,
        }),
      });

      if (res.ok) {
        setSuccess('Salary created successfully!');
        fetchData();
        setSelectedTeacher('');
        setSalaryTitle('');
        setSalaryDescription('');
        setSalaryAmount('');
        setSalaryCurrency('USD');
        setSalaryDueDate('');
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create salary');
      }
    } catch (error) {
      setError('Error creating salary');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSalary = (salary: Salary) => {
    setEditingSalary(salary);
    setSalaryTitle(salary.title);
    setSalaryDescription(salary.description || '');
    setSalaryAmount(salary.amount.toString());
    setSalaryCurrency(salary.currency);
    setSalaryDueDate(new Date(salary.dueDate).toISOString().split('T')[0]);
    setShowEditModal(true);
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalary) return;

    setEditing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/salaries/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingSalary.id,
          title: salaryTitle,
          description: salaryDescription,
          amount: parseFloat(salaryAmount),
          currency: salaryCurrency,
          dueDate: salaryDueDate,
        }),
      });

      if (res.ok) {
        setSuccess('Salary updated successfully!');
        fetchData();
        setShowEditModal(false);
        setEditingSalary(null);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update salary');
      }
    } catch (error) {
      setError('Error updating salary');
    } finally {
      setEditing(false);
    }
  };

  const handleViewDetails = (salary: Salary) => {
    setDetailData(salary);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: SalaryStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge bg="success">Paid</Badge>;
      case 'PENDING':
        return <Badge bg="warning">Pending</Badge>;
      case 'OVERDUE':
        return <Badge bg="danger">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge bg="secondary">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-success text-white">
              <h6 className="mb-0">
                <i className="bi bi-wallet2 me-2"></i>
                Create New Salary
              </h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateSalary}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Teacher</Form.Label>
                  <Form.Select 
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    required
                    size="sm"
                  >
                    <option value="">Choose a teacher...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Salary Title</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={salaryTitle} 
                    onChange={(e) => setSalaryTitle(e.target.value)} 
                    required 
                    placeholder="Enter salary title"
                    size="sm"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={2} 
                    value={salaryDescription} 
                    onChange={(e) => setSalaryDescription(e.target.value)}
                    placeholder="Optional description"
                    size="sm"
                  />
                </Form.Group>
                <Row>
                  <Col xs={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Amount</Form.Label>
                      <Form.Control 
                        type="number" 
                        step="0.01"
                        value={salaryAmount} 
                        onChange={(e) => setSalaryAmount(e.target.value)} 
                        required 
                        placeholder="0.00"
                        size="sm"
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Select 
                        value={salaryCurrency}
                        onChange={(e) => setSalaryCurrency(e.target.value)}
                        size="sm"
                      >
                        {currencies.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-4">
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={salaryDueDate} 
                    onChange={(e) => setSalaryDueDate(e.target.value)} 
                    required 
                    size="sm"
                  />
                </Form.Group>
                <Button 
                  variant="success" 
                  type="submit" 
                  disabled={creating}
                  className="w-100"
                  size="sm"
                >
                  {creating ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Salary
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
                <h6 className="mb-0">
                  <i className="bi bi-cash-coin me-2"></i>
                  Salary Management
                </h6>
                <Badge bg="success">{salaries.length} Total</Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2 text-muted small">Loading salaries...</p>
                </div>
              ) : salaries.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-wallet2 display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No salaries found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Teacher</th>
                        <th>Title</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Paid By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaries.map((salary) => (
                        <tr key={salary.id}>
                          <td className="fw-medium">{salary.teacher.name}</td>
                          <td>{salary.title}</td>
                          <td className="fw-bold text-success">
                            {getCurrencySymbol(salary.currency)}{salary.amount.toFixed(2)}
                          </td>
                          <td className="text-muted small">
                            {new Date(salary.dueDate).toLocaleDateString()}
                          </td>
                          <td>{getStatusBadge(salary.status)}</td>
                          <td className="text-muted small">
                            {salary.paidBy ? salary.paidBy.name : '-'}
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
    </div>
  );
}

function ProgressTab() {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/progress');
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      } else {
        setError('Failed to fetch progress data');
      }
    } catch (error) {
      setError('Error fetching progress data');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return <Badge bg="success">Present</Badge>;
      case 'ABSENT':
        return <Badge bg="danger">Absent</Badge>;
      case 'LATE':
        return <Badge bg="warning">Late</Badge>;
      case 'EXCUSED':
        return <Badge bg="info">Excused</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const handleViewDetails = (progressItem: Progress) => {
    setDetailData(progressItem);
    setShowDetailModal(true);
  };

  return (
    <div>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Student Progress Overview
            </h6>
            <Badge bg="info">{progress.length} Records</Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <p className="mt-2 text-muted small">Loading progress data...</p>
            </div>
          ) : progress.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-graph-up display-6 text-muted"></i>
              <p className="mt-2 text-muted small">No progress records found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Lesson</th>
                    <th>Progress</th>
                    <th>Score</th>
                    <th>Attendance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((item) => (
                    <tr key={item.id}>
                      <td className="text-muted small">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="fw-medium">{item.student.name}</td>
                      <td>{item.course.name}</td>
                      <td className="text-muted">{item.teacher.name}</td>
                      <td className="text-muted">
                        <ExpandableText text={item.lesson || 'No lesson'} maxLength={30} />
                      </td>
                      <td>
                        {item.lessonProgress !== null ? (
                          <div className="d-flex align-items-center">
                            <div className="progress me-2" style={{ width: '60px', height: '8px' }}>
                              <div 
                                className="progress-bar bg-success" 
                                style={{ width: `${item.lessonProgress}%` }}
                              ></div>
                            </div>
                            <small className="text-muted">{item.lessonProgress}%</small>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {item.score !== null ? (
                          <Badge bg="primary">{item.score}%</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{getAttendanceBadge(item.attendance)}</td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                          title="View Details"
                        >
                          <i className="bi bi-eye"></i>
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

      {/* Detail View Modal */}
      <DetailViewModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        title="Progress Details"
        data={detailData}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('teachers');

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">
            <i className="bi bi-gear-fill me-2 text-primary"></i>
            Admin Dashboard
          </h2>
          <p className="text-muted mb-0">Manage users, subjects, assignments, and more</p>
        </div>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onSelect={(k) => setActiveTab(k || 'teachers')} 
        className="mb-4"
        variant="pills"
      >
        <Tab 
          eventKey="teachers" 
          title={
            <span>
              <i className="bi bi-person-workspace me-2"></i>
              Teachers
            </span>
          }
        >
          <UserManagementTab role="TEACHER" />
        </Tab>
        
        <Tab 
          eventKey="parents" 
          title={
            <span>
              <i className="bi bi-people me-2"></i>
              Parents
            </span>
          }
        >
          <UserManagementTab role="PARENT" />
        </Tab>
        
        <Tab 
          eventKey="students" 
          title={
            <span>
              <i className="bi bi-mortarboard me-2"></i>
              Students
            </span>
          }
        >
          <UserManagementTab role="STUDENT" />
        </Tab>
        
        
        
        <Tab 
          eventKey="subjects" 
          title={
            <span>
              <i className="bi bi-book me-2"></i>
              Subjects
            </span>
          }
        >
          <SubjectManagementTab />
        </Tab>
        
        <Tab 
          eventKey="assignments" 
          title={
            <span>
              <i className="bi bi-diagram-3 me-2"></i>
              Assignments
            </span>
          }
        >
          <AssignmentsTab />
        </Tab>
        
        <Tab 
          eventKey="fees" 
          title={
            <span>
              <i className="bi bi-cash-coin me-2"></i>
              Fees
            </span>
          }
        >
          <FeeManagementTab />
        </Tab>
        
        <Tab 
          eventKey="fee-verification" 
          title={
            <span>
              <i className="bi bi-check-circle me-2"></i>
              Fee Verification
            </span>
          }
        >
          <FeeVerificationTab />
        </Tab>
        
        <Tab 
          eventKey="salaries" 
          title={
            <span>
              <i className="bi bi-wallet2 me-2"></i>
              Salaries
            </span>
          }
        >
          <SalaryManagementTab />
        </Tab>
        
        <Tab 
          eventKey="progress" 
          title={
            <span>
              <i className="bi bi-graph-up me-2"></i>
              Progress
            </span>
          }
        >
          <ProgressTab />
        </Tab>
      </Tabs>
    </div>
  );
}