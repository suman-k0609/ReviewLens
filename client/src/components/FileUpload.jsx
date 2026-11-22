import { useState, useRef } from 'react';

function FileUpload({ onUpload, loading }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleLoadSample = async () => {
    try {
      const res = await fetch('/reviews.csv');
      const text = await res.text();
      const sampleFile = new File([text], 'reviews.csv', { type: 'text/csv' });
      setFile(sampleFile);
      onUpload(sampleFile);
    } catch {
      inputRef.current?.click();
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <div
          className={`upload-dropzone${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <div className="upload-icon-wrapper">
            <span className="upload-icon">📂</span>
          </div>

          <h2 className="upload-heading">Upload Customer Reviews CSV</h2>
          <p className="upload-subtext">
            Drag and drop your CSV dataset here, or <span className="browse-link">browse from your computer</span>
          </p>

          <div className="upload-badges-row">
            <span className="badge-spec">✓ Handles Hinglish & Sarcasm</span>
            <span className="badge-spec">✓ Auto Deduplication</span>
            <span className="badge-spec">✓ Prompt Injection Shield</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="file-input-hidden"
            onChange={handleFileChange}
          />

          {file && (
            <div className="selected-file-badge" onClick={(e) => e.stopPropagation()}>
              <span className="file-icon">📄</span>
              <div className="file-info-text">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatSize(file.size)}</span>
              </div>
              <span className="file-ready-tag">Ready</span>
            </div>
          )}

          <div className="upload-actions-wrapper" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-primary btn-lg"
              disabled={loading || !file}
              onClick={() => file && onUpload(file)}
            >
              {loading ? (
                <>
                  <span className="btn-spinner-icon"></span> Analyzing Reviews...
                </>
              ) : (
                '🚀 Launch Review Analysis'
              )}
            </button>
          </div>
        </div>

        {/* Quick Sample Dataset Bar */}
        <div className="sample-dataset-footer">
          <div className="sample-text">
            <span>💡 Don't have a file ready?</span>
            <small>Test with the official benchmark dataset (30 messy reviews with prompt injection & Hinglish)</small>
          </div>
          <div className="sample-buttons">
            <button className="btn btn-outline btn-sm" onClick={handleLoadSample} disabled={loading}>
              ⚡ One-Click Instant Demo
            </button>
            <a href="/reviews.csv" download="reviews.csv" className="btn btn-ghost btn-sm">
              📥 Download Sample CSV
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
