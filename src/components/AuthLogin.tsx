import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, firestore } from '../firebase';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import './AuthLogin.css';

type AuthMode = 'login' | 'signup' | 'forgot';

interface AuthLoginProps {
  onLoginSuccess: (username: string, email: string) => void;
}

export default function AuthLogin({ onLoginSuccess }: AuthLoginProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const validateUsername = (username: string): string | null => {
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be at most 20 characters';
    if (!/^[a-z0-9_]+$/.test(username)) return 'Username must be lowercase letters, numbers, and underscores only';
    return null;
  };

  const checkUsernameExists = async (username: string): Promise<boolean> => {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email) {
          setError('Please enter your email');
          return;
        }
        await sendPasswordResetEmail(auth, email);
        setResetEmailSent(true);
        setError('');
      } else if (mode === 'signup') {
        if (!email || !username || !password) {
          setError('Please fill in all fields');
          return;
        }

        const usernameError = validateUsername(username);
        if (usernameError) {
          setError(usernameError);
          return;
        }

        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
          setError('Username already taken');
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(firestore, 'users', userCredential.user.uid), {
          username: username,
          email: email,
          createdAt: new Date().toISOString(),
          profileComplete: false
        });

        onLoginSuccess(username, email);
      } else {
        if (!email || !password) {
          setError('Please fill in all fields');
          return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          onLoginSuccess(userData.username, userData.email);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cometchat-login__container">
      <div className="cometchat-login__content">
        <div className="cometchat-login__header">
          <div className="cometchat-login__logo">
            <img src="/logo.png" alt="Amatyma" />
          </div>
          <div className="cometchat-login__title">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </div>
        </div>

        <form className="cometchat-login__form" onSubmit={handleSubmit}>
          {mode !== 'forgot' && (
            <div className="cometchat-login__input-group">
              <label className="cometchat-login__input-label">Email</label>
              <input
                type="email"
                className="cometchat-login__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {mode === 'forgot' && (
            <div className="cometchat-login__input-group">
              <label className="cometchat-login__input-label">Email</label>
              <input
                type="email"
                className="cometchat-login__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="cometchat-login__input-group">
              <label className="cometchat-login__input-label">Username</label>
              <input
                type="text"
                className="cometchat-login__input"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                disabled={loading}
                placeholder="lowercase, 3-20 characters"
              />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="cometchat-login__input-group">
              <label className="cometchat-login__input-label">Password</label>
              <input
                type="password"
                className="cometchat-login__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--cometchat-error-color, #ff3b30)', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {resetEmailSent && (
            <div style={{ color: 'var(--cometchat-success-color, #34c759)', fontSize: '14px' }}>
              Password reset email sent! Check your inbox.
            </div>
          )}

          <button
            type="submit"
            className="cometchat-login__submit-button"
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'forgot' ? 'Send Reset Link' : mode === 'signup' ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className="cometchat-login__signup-section">
          {mode === 'login' && (
            <>
              <span>Don't have an account?</span>
              <span className="cometchat-login__signup-link" onClick={() => setMode('signup')}>
                Sign Up
              </span>
            </>
          )}
          {mode === 'signup' && (
            <>
              <span>Already have an account?</span>
              <span className="cometchat-login__signup-link" onClick={() => setMode('login')}>
                Login
              </span>
            </>
          )}
          {mode !== 'forgot' && (
            <>
              <span>•</span>
              <span className="cometchat-login__signup-link" onClick={() => setMode('forgot')}>
                Forgot Password?
              </span>
            </>
          )}
          {mode === 'forgot' && (
            <span className="cometchat-login__signup-link" onClick={() => setMode('login')}>
              Back to Login
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
