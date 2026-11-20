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
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="logo">🔍 ReviewLens</h1>
          <p className="tagline">AI-Powered Product Review Insights</p>
          {data && (
            <button className="btn btn-secondary" onClick={handleReset}>
              ↩ Upload New File
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="error-dismiss">✕</button>
        </div>
      )}

      <main className="main-content">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <p>Analyzing reviews with AI…</p>
          </div>
        )}

        {!data ? (
          <FileUpload onUpload={handleUpload} loading={loading} />
        ) : (
          <Dashboard data={data} />
        )}
      </main>
    </div>
  );
}

export default App;
