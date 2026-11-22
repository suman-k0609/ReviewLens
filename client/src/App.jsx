import { useState } from 'react';
import FileUpload from './components/FileUpload.jsx';
import Dashboard from './components/Dashboard.jsx';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/reviews/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Upload failed (${res.status})`);
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setError(null);
  };

  return (
    <div className="app-shell">
      {/* Top Navigation Bar */}
      <header className="app-header-modern">
        <div className="header-container">
          <div className="brand-group">
            <div className="brand-icon-gem">🔍</div>
            <div className="brand-titles">
              <div className="brand-heading-row">
                <span className="brand-name">ReviewLens</span>
                <span className="brand-pill-tag">AI Intelligence</span>
              </div>
              <p className="brand-tagline">Autonomous Customer Sentiment & Defect Analysis</p>
            </div>
          </div>

          <div className="header-actions-group">
            <a
              href="https://github.com/suman-k0609/ReviewLens"
              target="_blank"
              rel="noreferrer"
              className="btn-header-link"
              title="View on GitHub"
            >
              ⭐ GitHub Repo
            </a>

            {data && (
              <button className="btn btn-secondary btn-header-upload" onClick={handleReset}>
                ↩ Upload New File
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="error-toast-bar">
          <span className="error-icon">⚠️</span>
          <span className="error-msg">{error}</span>
          <button onClick={() => setError(null)} className="error-close-btn">✕</button>
        </div>
      )}

      <main className="app-main-layout">
        {loading && (
          <div className="loading-backdrop">
            <div className="loading-modal-card">
              <div className="spinner-glow"></div>
              <h3>Analyzing Customer Reviews with AI...</h3>
              <p>Cleaning messy data, translating Hinglish, verifying prompt injection defense, and compiling store insights.</p>
            </div>
          </div>
        )}

        {!data ? (
          <FileUpload onUpload={handleUpload} loading={loading} />
        ) : (
          <Dashboard data={data} />
        )}
      </main>

      <footer className="app-footer-modern">
        <p>ReviewLens AI • CEDCOSS Associate Software Developer Assessment • Built with React & Node.js</p>
      </footer>
    </div>
  );
}

export default App;
