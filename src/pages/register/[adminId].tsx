import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import { useTranslation } from 'react-i18next';
import Head from 'next/head';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Spinner,
  Alert,
  Badge,
  InputGroup,
  Navbar
} from 'react-bootstrap';

interface Course {
  id: string;
  name: string;
  description?: string;
}

interface AcademyInfo {
  academyName: string;
  logo: string;
  tagline?: string;
  currency: string;
  courses: Course[];
}

const timezones = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland', 'Asia/Karachi'
];

const relationTypes = [
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'UNCLE', label: 'Uncle' },
  { value: 'AUNT', label: 'Aunt' },
  { value: 'OTHER', label: 'Other' },
];

const classDaysList = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
  { value: 'SATURDAY', label: 'Sat' },
  { value: 'SUNDAY', label: 'Sun' },
];

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
}

export default function PublicRegisterPage() {
  const router = useRouter();
  const { adminId } = router.query;
  const { t } = useTranslation('common');

  const [loading, setLoading] = useState(true);
  const [academyInfo, setAcademyInfo] = useState<AcademyInfo | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State - Parent
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [parentIsWhatsApp, setParentIsWhatsApp] = useState(false);
  const [parentCnic, setParentCnic] = useState('');
  const [parentProfession, setParentProfession] = useState('');
  const [parentRelation, setParentRelation] = useState('GUARDIAN');
  const [parentAddress, setParentAddress] = useState('');
  const [parentCountry, setParentCountry] = useState('');

  // Form State - Students List
  const [students, setStudents] = useState<any[]>([
    createEmptyStudent()
  ]);

  function createEmptyStudent() {
    return {
      name: '',
      email: '',
      mobile: '',
      isWhatsApp: false,
      dateOfBirth: '',
      bFormNumber: '',
      dateOfBirthInWords: '',
      religiousEducation: '',
      formalEducation: '',
      previousInstitution: '',
      previousInstitutionReason: '',
      admissionClass: '',
      admissionDepartment: '',
      fatherAlive: true,
      motherAlive: true,
      notes: '',
      subjects: [] // Array of { courseId: string, startTime: string, duration: number, classDays: string[], timezone: string }
    };
  }

  // Load Academy Config
  useEffect(() => {
    if (!adminId) return;
    async function fetchAcademy() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/academy-info?adminId=${adminId}`);
        if (res.ok) {
          const data = await res.json();
          setAcademyInfo(data);
        } else {
          setError('Failed to fetch academy settings. Please check your link.');
        }
      } catch (err) {
        setError('Error loading academy. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchAcademy();
  }, [adminId]);

  const handleLanguageToggle = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
    router.push(router.pathname, router.asPath, { locale });
  };

  const handleAddStudent = () => {
    setStudents([...students, createEmptyStudent()]);
  };

  const handleRemoveStudent = (index: number) => {
    const newStudents = [...students];
    newStudents.splice(index, 1);
    setStudents(newStudents);
  };

  const handleStudentChange = (index: number, field: string, value: any) => {
    const newStudents = [...students];
    newStudents[index][field] = value;
    setStudents(newStudents);
  };

  // Subjects handling inside students
  const handleToggleCourse = (studentIndex: number, courseId: string) => {
    const student = students[studentIndex];
    const subjectIndex = student.subjects.findIndex((sub: any) => sub.courseId === courseId);
    
    const newSubjects = [...student.subjects];
    if (subjectIndex > -1) {
      newSubjects.splice(subjectIndex, 1);
    } else {
      newSubjects.push({
        courseId,
        startTime: '16:00',
        duration: 60,
        classDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
        timezone: 'Asia/Karachi',
        monthlyFee: 0,
        currency: academyInfo?.currency || 'PKR'
      });
    }

    handleStudentChange(studentIndex, 'subjects', newSubjects);
  };

  const handleSubjectFieldChange = (studentIndex: number, subjectIndex: number, field: string, value: any) => {
    const student = students[studentIndex];
    const newSubjects = [...student.subjects];
    newSubjects[subjectIndex][field] = value;
    handleStudentChange(studentIndex, 'subjects', newSubjects);
  };

  const handleSubjectDayToggle = (studentIndex: number, subjectIndex: number, day: string) => {
    const student = students[studentIndex];
    const subject = student.subjects[subjectIndex];
    const newDays = [...subject.classDays];
    const idx = newDays.indexOf(day);
    if (idx > -1) {
      newDays.splice(idx, 1);
    } else {
      newDays.push(day);
    }
    handleSubjectFieldChange(studentIndex, subjectIndex, 'classDays', newDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        adminId,
        parentName,
        parentEmail,
        parentMobile,
        parentIsWhatsApp,
        parentCnic,
        parentProfession,
        parentRelation,
        parentAddress,
        parentCountry,
        students
      };

      const res = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.message || 'An error occurred during submission.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (success) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Card className="text-center p-5 shadow-lg border-0" style={{ maxWidth: '600px', borderRadius: '16px' }}>
          <Card.Body>
            <div className="text-success mb-4">
              <i className="bi bi-check-circle-fill" style={{ fontSize: '4.5rem' }}></i>
            </div>
            <h2 className="fw-bold mb-3">{router.locale === 'ur' ? 'داخلہ فارم موصول ہو گیا!' : 'Registration Submitted!'}</h2>
            <p className="text-muted mb-4" style={{ fontSize: '1.1rem' }}>
              {router.locale === 'ur' 
                ? 'آپ کی رجسٹریشن کی درخواست کامیابی کے ساتھ جمع ہو گئی ہے۔ ایڈمنسٹریٹر آپ کے فراہم کردہ فون یا ای میل پر اکاؤنٹ کی تفصیلات بھیجیں گے۔'
                : 'Your registration request has been successfully submitted. The administrator will approve the details and notify you with your account login credentials.'}
            </p>
            <Button variant="primary" size="lg" className="px-5 rounded-pill" onClick={() => router.reload()}>
              {router.locale === 'ur' ? 'نیا فارم بھریں' : 'Submit Another Form'}
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>{academyInfo?.academyName || 'Academy Registration'} | AIMS</title>
      </Head>

      <Navbar bg="dark" variant="dark" expand="lg" className="px-4 py-3 justify-content-between shadow-sm">
        <Navbar.Brand className="fw-bold d-flex align-items-center gap-2">
          {academyInfo?.logo && (
            <img src={academyInfo.logo} alt="Logo" style={{ maxHeight: '40px', borderRadius: '4px' }} />
          )}
          <span>{academyInfo?.academyName || 'Academy'}</span>
        </Navbar.Brand>
        <div className="d-flex gap-2">
          <Button
            size="sm"
            variant={router.locale === 'en' ? 'primary' : 'outline-light'}
            onClick={() => handleLanguageToggle('en')}
          >
            English
          </Button>
          <Button
            size="sm"
            variant={router.locale === 'ur' ? 'primary' : 'outline-light'}
            onClick={() => handleLanguageToggle('ur')}
          >
            اردو
          </Button>
        </div>
      </Navbar>

      <Container className="py-5" style={{ maxWidth: '900px' }}>
        <div className="text-center mb-5">
          <h1 className="fw-bold text-dark mb-2">
            {router.locale === 'ur' ? 'آن لائن رجسٹریشن فارم' : 'Online Registration Form'}
          </h1>
          {academyInfo?.tagline && (
            <p className="text-muted fs-5">{academyInfo.tagline}</p>
          )}
        </div>

        {error && <Alert variant="danger" className="mb-4 shadow-sm">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          {/* PARENT / GUARDIAN SECTION */}
          <Card className="shadow-sm border-0 mb-4 rounded-4 overflow-hidden">
            <Card.Header className="bg-primary text-white py-3 px-4 fw-bold fs-5">
              <i className="bi bi-person-fill me-2"></i>
              {router.locale === 'ur' ? 'والدین / سرپرست کی تفصیلات' : 'Parent / Guardian Details'}
            </Card.Header>
            <Card.Body className="p-4 bg-white">
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="parentName">
                    <Form.Label className="fw-medium">{t('auto.fullName', 'Full Name')} *</Form.Label>
                    <Form.Control
                      type="text"
                      required
                      placeholder={router.locale === 'ur' ? 'نام درج کریں' : 'Enter parent/guardian full name'}
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="parentEmail">
                    <Form.Label className="fw-medium">{t('auto.emailAddress', 'Email Address')} *</Form.Label>
                    <Form.Control
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="parentMobile">
                    <Form.Label className="fw-medium">{t('auto.mobileNumber', 'Mobile Number')} *</Form.Label>
                    <Form.Control
                      type="tel"
                      required
                      placeholder="+923001234567"
                      value={parentMobile}
                      onChange={(e) => setParentMobile(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="parentRelation">
                    <Form.Label className="fw-medium">{t('auto.relationType', 'Relation Type')} *</Form.Label>
                    <Form.Select
                      value={parentRelation}
                      onChange={(e) => setParentRelation(e.target.value)}
                    >
                      {relationTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {router.locale === 'ur' && type.value === 'FATHER' ? 'والد' :
                           router.locale === 'ur' && type.value === 'MOTHER' ? 'والدہ' :
                           router.locale === 'ur' && type.value === 'GUARDIAN' ? 'سرپرست' :
                           type.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="parentCnic">
                    <Form.Label className="fw-medium">CNIC / ID Number</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g. 42101-1234567-1"
                      value={parentCnic}
                      onChange={(e) => setParentCnic(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="parentProfession">
                    <Form.Label className="fw-medium">Profession</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g. Teacher, Engineer, Businessman"
                      value={parentProfession}
                      onChange={(e) => setParentProfession(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={12} className="my-2">
                  <Form.Check
                    type="switch"
                    id="parentIsWhatsApp"
                    label={router.locale === 'ur' ? 'یہ موبائل نمبر واٹس ایپ پر دستیاب ہے۔' : 'This mobile number is available on WhatsApp'}
                    checked={parentIsWhatsApp}
                    onChange={(e) => setParentIsWhatsApp(e.target.checked)}
                  />
                </Col>
                <Col md={12}>
                  <Form.Group controlId="parentAddress">
                    <Form.Label className="fw-medium">{t('auto.address', 'Address')}</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Enter residence address"
                      value={parentAddress}
                      onChange={(e) => setParentAddress(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="parentCountry">
                    <Form.Label className="fw-medium">{t('auto.country', 'Country')}</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g. Pakistan, United Kingdom"
                      value={parentCountry}
                      onChange={(e) => setParentCountry(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* STUDENTS DYNAMIC SECTION */}
          {students.map((student, sIdx) => (
            <Card key={sIdx} className="shadow-sm border-0 mb-4 rounded-4 overflow-hidden">
              <Card.Header className="bg-secondary text-white py-3 px-4 d-flex justify-content-between align-items-center">
                <span className="fw-bold fs-5">
                  <i className="bi bi-mortarboard-fill me-2"></i>
                  {router.locale === 'ur' ? `بچے کی تفصیلات #${sIdx + 1}` : `Student / Child Details #${sIdx + 1}`}
                </span>
                {students.length > 1 && (
                  <Button variant="danger" size="sm" onClick={() => handleRemoveStudent(sIdx)}>
                    <i className="bi bi-trash-fill"></i>
                  </Button>
                )}
              </Card.Header>
              <Card.Body className="p-4 bg-white">
                <h5 className="border-bottom pb-2 mb-3 text-primary fw-semibold">
                  {router.locale === 'ur' ? 'بنیادی معلومات' : 'Basic Information'}
                </h5>
                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">{router.locale === 'ur' ? 'بچے کا پورا نام' : 'Child Full Name'} *</Form.Label>
                      <Form.Control
                        type="text"
                        required
                        value={student.name}
                        onChange={(e) => handleStudentChange(sIdx, 'name', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">{router.locale === 'ur' ? 'بچے کا ای میل (منفرد)' : 'Child Email (Unique Login)'} *</Form.Label>
                      <Form.Control
                        type="email"
                        required
                        placeholder="child.name@example.com"
                        value={student.email}
                        onChange={(e) => handleStudentChange(sIdx, 'email', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">{t('auto.dateOfBirth', 'Date of Birth')}</Form.Label>
                      <Form.Control
                        type="date"
                        value={student.dateOfBirth}
                        onChange={(e) => handleStudentChange(sIdx, 'dateOfBirth', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">B-Form / ID Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={student.bFormNumber}
                        onChange={(e) => handleStudentChange(sIdx, 'bFormNumber', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">Date of Birth in Words</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. First January Two Thousand Ten"
                        value={student.dateOfBirthInWords}
                        onChange={(e) => handleStudentChange(sIdx, 'dateOfBirthInWords', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">Student Mobile (If any)</Form.Label>
                      <Form.Control
                        type="tel"
                        value={student.mobile}
                        onChange={(e) => handleStudentChange(sIdx, 'mobile', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="border-bottom pb-2 mb-3 text-primary fw-semibold">
                  {router.locale === 'ur' ? 'تعلیمی تفصیلات' : 'Academic Profile'}
                </h5>
                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">Formal Education Level</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. 5th Grade, Matric, O-Levels"
                        value={student.formalEducation}
                        onChange={(e) => handleStudentChange(sIdx, 'formalEducation', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">Religious Education Level</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. Nazra completed, 2 Juz Hifz"
                        value={student.religiousEducation}
                        onChange={(e) => handleStudentChange(sIdx, 'religiousEducation', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">Previous Institution</Form.Label>
                      <Form.Control
                        type="text"
                        value={student.previousInstitution}
                        onChange={(e) => handleStudentChange(sIdx, 'previousInstitution', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-medium">Admission Class / Department</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. Grade 6 / Quran Section"
                        value={student.admissionClass}
                        onChange={(e) => handleStudentChange(sIdx, 'admissionClass', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Label className="fw-medium">Is Father Alive?</Form.Label>
                    <div>
                      <Form.Check
                        inline
                        type="radio"
                        label="Yes"
                        name={`fatherAlive-${sIdx}`}
                        checked={student.fatherAlive === true}
                        onChange={() => handleStudentChange(sIdx, 'fatherAlive', true)}
                      />
                      <Form.Check
                        inline
                        type="radio"
                        label="No"
                        name={`fatherAlive-${sIdx}`}
                        checked={student.fatherAlive === false}
                        onChange={() => handleStudentChange(sIdx, 'fatherAlive', false)}
                      />
                    </div>
                  </Col>
                  <Col md={6}>
                    <Form.Label className="fw-medium">Is Mother Alive?</Form.Label>
                    <div>
                      <Form.Check
                        inline
                        type="radio"
                        label="Yes"
                        name={`motherAlive-${sIdx}`}
                        checked={student.motherAlive === true}
                        onChange={() => handleStudentChange(sIdx, 'motherAlive', true)}
                      />
                      <Form.Check
                        inline
                        type="radio"
                        label="No"
                        name={`motherAlive-${sIdx}`}
                        checked={student.motherAlive === false}
                        onChange={() => handleStudentChange(sIdx, 'motherAlive', false)}
                      />
                    </div>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="fw-medium">Additional Notes / Health Constraints</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={student.notes}
                        onChange={(e) => handleStudentChange(sIdx, 'notes', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="border-bottom pb-2 mb-3 text-primary fw-semibold">
                  {router.locale === 'ur' ? 'مضامین اور شیڈول کا انتخاب' : 'Select Subjects & Schedules'} *
                </h5>
                
                {academyInfo?.courses.length === 0 ? (
                  <Alert variant="warning">No courses available for registration at this academy.</Alert>
                ) : (
                  <div className="mb-3">
                    <Form.Label className="fw-medium mb-3">
                      {router.locale === 'ur' ? 'وہ مضامین منتخب کریں جن میں بچہ داخلہ لینا چاہتا ہے:' : 'Select courses/subjects to enroll in:'}
                    </Form.Label>
                    
                    <Row className="g-3">
                      {academyInfo?.courses.map((course) => {
                        const isChecked = student.subjects.some((sub: any) => sub.courseId === course.id);
                        return (
                          <Col md={6} key={course.id}>
                            <Card className={`h-100 border-2 rounded-3 clickable-card ${isChecked ? 'border-primary bg-light' : 'border-light'}`}
                                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                  onClick={() => handleToggleCourse(sIdx, course.id)}>
                              <Card.Body className="d-flex align-items-start gap-3 p-3">
                                <Form.Check
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // Handle dynamically by card click
                                  className="mt-1"
                                />
                                <div>
                                  <div className="fw-bold">{course.name}</div>
                                  <small className="text-muted">{course.description}</small>
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                )}

                {/* Dynamic preferences for selected subjects */}
                {student.subjects.map((sub: any, subIdx: number) => {
                  const courseObj = academyInfo?.courses.find(c => c.id === sub.courseId);
                  return (
                    <Card key={sub.courseId} className="border border-primary-subtle bg-light-subtle rounded-3 p-3 my-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-bold text-primary">
                          <i className="bi bi-clock-history me-1"></i>
                          Schedule Preference: {courseObj?.name}
                        </span>
                      </div>
                      <Row className="g-3">
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Preferred Start Time</Form.Label>
                            <Form.Control
                              type="time"
                              value={sub.startTime}
                              onChange={(e) => handleSubjectFieldChange(sIdx, subIdx, 'startTime', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Class Duration (minutes)</Form.Label>
                            <Form.Select
                              value={sub.duration}
                              onChange={(e) => handleSubjectFieldChange(sIdx, subIdx, 'duration', parseInt(e.target.value))}
                            >
                              <option value={30}>30 mins</option>
                              <option value={45}>45 mins</option>
                              <option value={60}>60 mins</option>
                              <option value={90}>90 mins</option>
                              <option value={120}>120 mins</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold">Timezone</Form.Label>
                            <Form.Select
                              value={sub.timezone}
                              onChange={(e) => handleSubjectFieldChange(sIdx, subIdx, 'timezone', e.target.value)}
                            >
                              {timezones.map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={12}>
                          <Form.Label className="small fw-semibold mb-2">Preferred Class Days</Form.Label>
                          <div className="d-flex flex-wrap gap-2">
                            {classDaysList.map(day => {
                              const isDaySelected = sub.classDays.includes(day.value);
                              return (
                                <Button
                                  key={day.value}
                                  size="sm"
                                  variant={isDaySelected ? 'primary' : 'outline-secondary'}
                                  onClick={() => handleSubjectDayToggle(sIdx, subIdx, day.value)}
                                  className="rounded-pill px-3"
                                >
                                  {day.label}
                                </Button>
                              );
                            })}
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}

              </Card.Body>
            </Card>
          ))}

          {/* Add Child button */}
          <div className="d-flex justify-content-start mb-5">
            <Button variant="outline-primary" size="lg" className="rounded-pill px-4" onClick={handleAddStudent}>
              <i className="bi bi-plus-circle-fill me-2"></i>
              {router.locale === 'ur' ? 'مزید بچہ شامل کریں' : 'Add Another Child'}
            </Button>
          </div>

          {/* Form Submit buttons */}
          <Card className="shadow-sm border-0 rounded-4 p-4 bg-white mb-5 text-center">
            <p className="text-muted mb-4 small">
              By submitting this form, you confirm that all details entered are correct to the best of your knowledge.
            </p>
            <div>
              <Button type="submit" variant="success" size="lg" className="px-5 py-3 rounded-pill fw-bold" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill me-2"></i>
                    {router.locale === 'ur' ? 'داخلہ درخواست جمع کروائیں' : 'Submit Registration Request'}
                  </>
                )}
              </Button>
            </div>
          </Card>

        </Form>
      </Container>
    </>
  );
}
