import { useState, useEffect, useRef } from 'react';
import { auth, firestore, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CometChat } from '@cometchat/chat-sdk-javascript';
import './ProfileEdit.css';

interface ProfileEditProps {
  onClose: () => void;
}

export default function ProfileEdit({ onClose }: ProfileEditProps) {
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setDisplayName(data.displayName || '');
        setPhotoURL(data.photoURL || '');
        setPhotoPreview(data.photoURL || '');
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      let newPhotoURL = photoURL;

      // Upload new photo if selected
      if (photoFile) {
        const storageRef = ref(storage, `profile_photos/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        newPhotoURL = await getDownloadURL(storageRef);
      }

      // Update Firestore
      await updateDoc(doc(firestore, 'users', user.uid), {
        displayName: displayName.trim(),
        photoURL: newPhotoURL,
        updatedAt: new Date().toISOString()
      });

      // Update CometChat user
      const cometChatUser = new CometChat.User(user.uid);
      cometChatUser.setName(displayName.trim());
      if (newPhotoURL) {
        cometChatUser.setAvatar(newPhotoURL);
      }

      await CometChat.updateUser(cometChatUser, await CometChat.getLoggedinUser().then(u => u?.getAuthToken() || ''));

      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-edit-overlay">
      <div className="profile-edit-container">
        <div className="profile-edit-header">
          <h2>Edit Profile</h2>
          <button className="profile-edit-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="profile-edit-form" onSubmit={handleSubmit}>
          <div className="profile-edit-photo-section">
            <div className="profile-edit-photo-preview">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" />
              ) : (
                <div className="profile-edit-photo-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              disabled={loading}
            />
            <button
              type="button"
              className="profile-edit-change-photo"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Change Photo
            </button>
          </div>

          <div className="profile-edit-input-group">
            <label>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              placeholder="Enter your name"
            />
          </div>

          {error && <div className="profile-edit-error">{error}</div>}
          {success && <div className="profile-edit-success">{success}</div>}

          <div className="profile-edit-actions">
            <button
              type="button"
              className="profile-edit-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="profile-edit-save"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
