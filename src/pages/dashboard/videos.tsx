import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Container, Row, Col, Card, Form, Button, Modal, Spinner, Badge, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Head from 'next/head';

// Import Admin Menu and Styles
import AdminMenu from '../../components/dashboards/AdminMenu';
import menuStyles from '../../components/dashboards/AdminMenu.module.css';



interface VideoTutorial {
  id: string;
  titleEn: string;
  titleUr: string;
  keywordsEn: string;
  keywordsUr: string;
  youtubeUrl: string;
  roles: string[];
  createdAt: string;
}

export default function VideosPage() {
  const { t } = useTranslation('common');
  const { data: session, status } = useSession();
  const router = useRouter();
  const currentLocale = router.locale || 'en';

  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // WebPlayer Script State
  const [webPlayerScript, setWebPlayerScript] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/developer');
        if (res.ok) {
          const data = await res.json();
          if (data.webPlayerScript) {
            setWebPlayerScript(data.webPlayerScript);
          }
        }
      } catch (err) {
        console.error('Error fetching global settings:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (webPlayerScript) {
      const match = webPlayerScript.match(/src=['"]([^'"]+)['"]/);
      if (match) {
        const script = document.createElement('script');
        script.src = match[1];
        script.defer = true;
        document.body.appendChild(script);
        return () => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
        };
      } else {
        const div = document.createElement('div');
        div.innerHTML = webPlayerScript;
        const scriptEls = div.querySelectorAll('script');
        const addedScripts: HTMLScriptElement[] = [];
        scriptEls.forEach(s => {
            const newScript = document.createElement('script');
            Array.from(s.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.text = s.innerHTML;
            document.body.appendChild(newScript);
            addedScripts.push(newScript);
        });
        return () => {
            addedScripts.forEach(s => {
                if (document.body.contains(s)) document.body.removeChild(s);
            });
        };
      }
    }
  }, [webPlayerScript]);



  // Form / Modal States for Admin/Developer
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoTutorial | null>(null);
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formTitleUr, setFormTitleUr] = useState('');
  const [formKeywordsEn, setFormKeywordsEn] = useState('');
  const [formKeywordsUr, setFormKeywordsUr] = useState('');
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('');
  const [formRoles, setFormRoles] = useState<string[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const availableRoles = ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];



  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchVideos();
    }
  }, [status, selectedRoleFilter]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError('');
      // If Admin or Developer wants to see filtered videos, append filterRole
      let url = '/api/tutorials';
      if (selectedRoleFilter !== 'ALL') {
        url += `?filterRole=${selectedRoleFilter}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      } else {
        setError(t('auto.errorFetchingData', 'Error fetching data'));
      }
    } catch (err) {
      setError(t('auto.errorFetchingData', 'Error fetching data'));
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract YouTube ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : '';
  };

  // Helper to resolve player source
  const getPlayerSrc = (url: string) => {
    const ytId = getYoutubeId(url);
    return ytId ? `youtube/${ytId}` : url;
  };

  // Check if current user is Developer
  const canManage = useMemo(() => {
    return session?.user?.role === 'DEVELOPER';
  }, [session]);

  // Filter videos on frontend based on search query
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const query = searchQuery.toLowerCase().trim();

    return videos.filter((video) => {
      const matchTitleEn = video.titleEn.toLowerCase().includes(query);
      const matchTitleUr = video.titleUr.includes(query);
      const matchKeywordsEn = video.keywordsEn ? video.keywordsEn.toLowerCase().includes(query) : false;
      const matchKeywordsUr = video.keywordsUr ? video.keywordsUr.includes(query) : false;
      return matchTitleEn || matchTitleUr || matchKeywordsEn || matchKeywordsUr;
    });
  }, [videos, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingVideo(null);
    setFormTitleEn('');
    setFormTitleUr('');
    setFormKeywordsEn('');
    setFormKeywordsUr('');
    setFormYoutubeUrl('');
    setFormRoles([]);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (video: VideoTutorial) => {
    setEditingVideo(video);
    setFormTitleEn(video.titleEn);
    setFormTitleUr(video.titleUr);
    setFormKeywordsEn(video.keywordsEn || '');
    setFormKeywordsUr(video.keywordsUr || '');
    setFormYoutubeUrl(video.youtubeUrl);
    setFormRoles(video.roles);
    setShowFormModal(true);
  };

  const handleRoleCheckboxChange = (role: string) => {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSelectAllRoles = () => {
    if (formRoles.length === availableRoles.length) {
      setFormRoles([]);
    } else {
      setFormRoles([...availableRoles]);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleEn || !formTitleUr || !formYoutubeUrl || formRoles.length === 0) {
      setError(t('auto.titleAmountAndDueDate', 'Missing required fields'));
      return;
    }

    const ytId = getYoutubeId(formYoutubeUrl);
    if (!ytId) {
      setError(t('auto.invalidFileTypePleaseUpload', 'Invalid YouTube URL'));
      return;
    }

    setFormSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const method = editingVideo ? 'PUT' : 'POST';
      const body = {
        id: editingVideo?.id,
        titleEn: formTitleEn,
        titleUr: formTitleUr,
        keywordsEn: formKeywordsEn,
        keywordsUr: formKeywordsUr,
        youtubeUrl: formYoutubeUrl,
        roles: formRoles,
      };

      const res = await fetch('/api/tutorials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(editingVideo ? t('auto.videoUpdated', 'Video tutorial updated successfully!') : t('auto.videoAdded', 'Video tutorial added successfully!'));
        setShowFormModal(false);
        fetchVideos();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save video tutorial');
      }
    } catch (err) {
      setError('Error saving video tutorial');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm(t('auto.confirmDeleteVideo', 'Are you sure you want to delete this video tutorial?'))) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await fetch(`/api/tutorials?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess(t('auto.videoDeleted', 'Video tutorial deleted successfully!'));
        fetchVideos();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete video tutorial');
      }
    } catch (err) {
      setError('Error deleting video tutorial');
    }
  };



  const handleSelect = (key?: string | null) => {
    if (!key || key === 'tutorials') return;
    if (key === 'home') {
      router.push('/dashboard');
      return;
    }
    const routeMap: Record<string, string> = {
      teachers: '/dashboard/teachers',
      parents: '/dashboard/parents',
      students: '/dashboard/students',
      progress: '/dashboard/progress',
      tests: '/dashboard/tests',
      'parent-remarks': '/dashboard/parent-remarks',
      remarks: '/dashboard/parent-remarks',
      fees: '/dashboard/fees',
      'fee-verification': '/dashboard/fee-verification',
      salaries: '/dashboard/salaries',
      subjects: '/dashboard/subjects',
      assignments: '/dashboard/assignments',
      'attendance-reports': '/dashboard/attendance-reports',
      'report-cards': '/dashboard/report-cards',
    };
    router.push(routeMap[key] || `/dashboard?tab=${key}`);
  };

  if (status === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const pageContent = (
    <Container className="py-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1 font-weight-bold d-flex align-items-center gap-2">
            <i className="bi bi-question-circle-fill text-danger"></i>
            {t('menu.help', 'Help')}
          </h1>
          <p className="text-muted mb-0">{t('auto.everythingYouNeedToManageYourE', 'Educational video guides for using the application')}</p>
        </div>
        {canManage && (
          <Button
            variant="danger"
            className="d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-pill px-4 py-2"
            onClick={handleOpenAddModal}
            style={{ transition: 'all 0.2s ease-in-out' }}
          >
            <i className="bi bi-plus-circle-fill"></i>
            <span>{t('auto.addVideo', 'Add Video')}</span>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Row className="mb-4 g-3">
        <Col md={canManage ? 8 : 12}>
          <InputGroup className="shadow-sm rounded-pill overflow-hidden border">
            <InputGroup.Text className="bg-white border-0 ps-3 pe-2">
              <i className="bi bi-search text-muted"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={t('auto.searchVideos', 'Search videos by title or keyword...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 py-2 shadow-none"
              dir={currentLocale === 'ur' ? 'rtl' : 'ltr'}
            />
            {searchQuery && (
              <Button
                variant="white"
                className="border-0 pe-3 text-muted"
                onClick={() => setSearchQuery('')}
              >
                <i className="bi bi-x-circle-fill"></i>
              </Button>
            )}
          </InputGroup>
        </Col>
        {canManage && (
          <Col md={4}>
            <Form.Select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="shadow-sm rounded-pill border py-2 ps-3"
            >
              <option value="ALL">{t('auto.allRoles', 'All Roles (Filter)')}</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {t(`auto.roles.${role}`, role)}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}
      </Row>

      {error && <div className="alert alert-danger shadow-sm rounded-3 mb-4">{error}</div>}
      {success && <div className="alert alert-success shadow-sm rounded-3 mb-4">{success}</div>}

      {/* Video Cards Grid */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="danger" />
          <p className="text-muted mt-2">{t('auto.loading', 'Loading...')}</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-5 border rounded-3 bg-white shadow-sm">
          <i className="bi bi-camera-video display-4 text-muted"></i>
          <h5 className="mt-3 text-muted">{t('auto.noRecords', 'No videos found')}</h5>
          <p className="text-muted mb-0">{t('auto.noProgressRecordsFound', 'Try modifying your search or filters.')}</p>
        </div>
      ) : (
        <Row className="g-4">
          {filteredVideos.map((video) => {
            const ytId = getYoutubeId(video.youtubeUrl);
            const thumbnail = ytId
              ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
              : '/assets/default-logo.png';

            const title = currentLocale === 'ur' ? video.titleUr : video.titleEn;

            return (
              <Col key={video.id} xs={12} sm={6} lg={4}>
              <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} className="d-block h-100 video-card-link">
                <Card
                  className="h-100 border-0 shadow-sm overflow-hidden video-card"
                  style={{
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    className="position-relative overflow-hidden"
                    style={{ aspectRatio: '16/9', backgroundColor: '#000' }}
                  >
                    <Card.Img
                      variant="top"
                      src={thumbnail}
                      alt={title}
                      className="w-100 h-100 object-fit-cover"
                      style={{ transition: 'transform 0.3s ease' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/default-logo.png';
                      }}
                    />
                    <div
                      className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center card-play-overlay"
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <div
                        className="d-flex align-items-center justify-content-center bg-danger text-white rounded-circle shadow-lg play-btn-circle"
                        style={{
                          width: '50px',
                          height: '50px',
                          transition: 'transform 0.2s ease, background-color 0.2s ease'
                        }}
                      >
                        <i className="bi bi-play-fill fs-4 ms-1"></i>
                      </div>
                    </div>
                  </div>

                  <Card.Body className="d-flex flex-column p-3">
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {video.roles.map((role) => (
                        <Badge
                          key={role}
                          bg="secondary"
                          className="text-capitalize"
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: role === 'ADMIN' ? 'rgba(13, 110, 253, 0.1)' :
                              role === 'TEACHER' ? 'rgba(25, 135, 84, 0.1)' :
                                role === 'STUDENT' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(108, 117, 125, 0.1)',
                            color: role === 'ADMIN' ? '#0d6efd' :
                              role === 'TEACHER' ? '#198754' :
                                role === 'STUDENT' ? '#ffc107' : '#6c757d',
                            border: role === 'ADMIN' ? '1px solid rgba(13, 110, 253, 0.2)' :
                              role === 'TEACHER' ? '1px solid rgba(25, 135, 84, 0.2)' :
                                role === 'STUDENT' ? '1px solid rgba(255, 193, 7, 0.2)' : '1px solid rgba(108, 117, 125, 0.2)'
                          }}
                        >
                          {t(`auto.roles.${role}`, role)}
                        </Badge>
                      ))}
                    </div>

                    <Card.Title
                      className="h6 mb-2 text-truncate-2 fw-bold text-dark flex-grow-1"
                      style={{
                        fontSize: '1rem',
                        lineHeight: '1.4',
                        height: '2.8em',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {title}
                    </Card.Title>

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                      <small className="text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {new Date(video.createdAt).toLocaleDateString()}
                      </small>

                      {canManage && (
                        <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="border-0 px-2 py-1 rounded-circle"
                            onClick={() => handleOpenEditModal(video)}
                            title={t('auto.edit', 'Edit')}
                          >
                            <i className="bi bi-pencil-square text-primary"></i>
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="border-0 px-2 py-1 rounded-circle"
                            onClick={() => handleDeleteVideo(video.id)}
                            title={t('auto.delete', 'Delete')}
                          >
                            <i className="bi bi-trash3-fill text-danger"></i>
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </a>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );

  return (
    <>
      <Head>
        <title>{t('menu.help', 'Help') + ' | AIMS'}</title>
      </Head>

      {session?.user?.role === 'ADMIN' ? (
        <div className={menuStyles.menuShell}>
          <div className={menuStyles.menuLayout}>
            <AdminMenu activeKey="tutorials" onSelect={handleSelect} />
            <div className={menuStyles.mainContent}>
              {pageContent}
            </div>
          </div>
        </div>
      ) : (
        pageContent
      )}

    </>
  );
}

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});