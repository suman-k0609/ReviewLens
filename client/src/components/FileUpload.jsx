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

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="upload-container">
      <div
        className={`upload-zone${dragOver ? ' drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <div className="upload-icon">📁</div>
        <h2>Upload Reviews CSV</h2>
        <p>Drag & drop your CSV file here, or click to browse</p>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Accepts .csv files only</p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="file-input"
          onChange={handleFileChange}
        />

        {file && (
          <div className="selected-file" onClick={(e) => e.stopPropagation()}>
            📄 {file.name}
            <span className="file-size">({formatSize(file.size)})</span>
          </div>
        )}

        {file && (
          <div className="upload-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-primary"
              disabled={loading}
              onClick={() => onUpload(file)}
            >
              {loading ? 'Analyzing…' : '🚀 Analyze Reviews'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUpload;
