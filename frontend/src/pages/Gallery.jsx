import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Image as ImageIcon, Plus, Trash2, Camera, Folder, X, Calendar } from 'lucide-react';

export default function Gallery() {
  const { groupId } = useParams();
  const { api, activeGroupDetails, user } = useApp();

  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [loading, setLoading] = useState(true);

  // Upload fields
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [eventId, setEventId] = useState('');
  const [albumName, setAlbumName] = useState('General');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Lightbox detail
  const [activePhoto, setActivePhoto] = useState(null);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/gallery/${groupId}`, {
        params: { album: selectedAlbum }
      });
      setPhotos(res.data.photos);
      setAlbums(res.data.albums);
    } catch (err) {
      console.error('Failed to load gallery photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get(`/events/${groupId}`);
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to load group events list:', err);
    }
  };

  useEffect(() => {
    fetchGallery();
    fetchEvents();
  }, [groupId, selectedAlbum]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Create local preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!imageFile) return;

    const formData = new FormData();
    formData.append('image', imageFile);
    if (eventId) formData.append('eventId', eventId);
    formData.append('albumName', albumName || 'General');

    try {
      setUploadLoading(true);
      setUploadError('');
      await api.post(`/gallery/${groupId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setIsUploadOpen(false);
      setImageFile(null);
      setImagePreview(null);
      setEventId('');
      setAlbumName('General');
      fetchGallery();
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo from the gallery?')) return;
    try {
      await api.delete(`/gallery/${groupId}/${photoId}`);
      setActivePhoto(null);
      fetchGallery();
    } catch (err) {
      console.error(err);
      alert('Failed to delete photo.');
    }
  };

  if (loading && photos.length === 0) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const isAdmin = activeGroupDetails?.myRole === 'admin';

  return (
    <div className="workspace-view">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Shared Photo Gallery
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Preserve memories from events, organize albums, and upload details for the circle.
          </p>
        </div>
        
        <button onClick={() => setIsUploadOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Camera size={16} />
          <span>Upload Image</span>
        </button>
      </div>

      {/* Album List Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setSelectedAlbum('')}
          style={{
            padding: '0.4rem 1rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            backgroundColor: selectedAlbum === '' ? 'var(--text-primary)' : 'var(--bg-charcoal)',
            color: selectedAlbum === '' ? 'var(--bg-obsidian)' : 'var(--text-secondary)',
            transition: 'var(--transition-smooth)'
          }}
        >
          All Photos
        </button>
        {albums.map(album => (
          <button
            key={album}
            onClick={() => setSelectedAlbum(album)}
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              textTransform: 'capitalize',
              backgroundColor: selectedAlbum === album ? 'var(--text-primary)' : 'var(--bg-charcoal)',
              color: selectedAlbum === album ? 'var(--bg-obsidian)' : 'var(--text-secondary)',
              transition: 'var(--transition-smooth)'
            }}
          >
            {album}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '4rem 1.5rem', backgroundColor: 'var(--bg-charcoal)' }}>
          <ImageIcon size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Photos Uploaded</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            There are no photos in this album. Click Upload to share memories with the group!
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}>
          {photos.map(photo => {
            const displayUrl = photo.url.startsWith('http') ? photo.url : `http://localhost:5000${photo.url}`;
            return (
              <div 
                key={photo.id}
                onClick={() => setActivePhoto(photo)}
                className="panel panel-interactive"
                style={{
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '240px',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', backgroundColor: '#000' }}>
                  <img 
                    src={displayUrl} 
                    alt="Gallery" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                    className="gallery-img"
                  />
                  <style>{`
                    .gallery-img:hover { transform: scale(1.05); }
                  `}</style>
                </div>
                
                <div style={{ fontSize: '0.75rem', padding: '0 0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <span style={{ textTransform: 'capitalize' }}>{photo.album_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                      {new Date(photo.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Uploaded by {photo.uploader_name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadOpen && (
        <div className="modal-overlay" onClick={() => setIsUploadOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upload Photo Memory</h3>

            {uploadError && (
              <div style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadPhoto}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: 'var(--bg-charcoal)' }}>
                  {imagePreview ? (
                    <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                  ) : (
                    <>
                      <ImageIcon size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Click to pick image file</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} required />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Album / Category Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. General, Dinner, Trip"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Link Event (Optional)</label>
                  <select
                    className="form-control"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                  >
                    <option value="">-- No Event Link --</option>
                    {events.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsUploadOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploadLoading || !imageFile}>
                  {uploadLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX DETAILED MODAL OVERLAY */}
      {activePhoto && (
        <div className="modal-overlay" onClick={() => setActivePhoto(null)} style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{
              maxWidth: '85vw',
              width: 'auto',
              backgroundColor: 'transparent',
              border: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Control Close bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', padding: '1rem 0', gap: '1rem' }}>
              {(activePhoto.uploaded_by_id === user.id || isAdmin) && (
                <button 
                  onClick={() => handleDeletePhoto(activePhoto.id)}
                  className="btn btn-danger"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
              
              <button 
                onClick={() => setActivePhoto(null)}
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', cursor: 'pointer' }}
              >
                <X size={18} style={{ margin: '0 auto' }} />
              </button>
            </div>

            {/* High Res Image */}
            <div style={{ maxHeight: '70vh', maxWidth: '80vw', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
              <img 
                src={activePhoto.url.startsWith('http') ? activePhoto.url : `http://localhost:5000${activePhoto.url}`} 
                alt="Lightbox View" 
                style={{ maxHeight: '70vh', maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Photo details footer overlay */}
            <div style={{
              marginTop: '1.25rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.5rem',
              width: '100%',
              maxWidth: '500px',
              fontSize: '0.8125rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9375rem', textTransform: 'capitalize' }}>Album: {activePhoto.album_name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{new Date(activePhoto.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                <span>Uploaded by: <strong>{activePhoto.uploader_name}</strong></span>
                {activePhoto.event_title && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-blue)', marginTop: '0.15rem' }}>
                    <Calendar size={12} />
                    <span>Linked Event: {activePhoto.event_title}</span>
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
