import React, { useState } from 'react';
import Viewer from './components/Viewer';

export default function App() {
  const [ctFile, setCtFile] = useState(null);
  const [maskFiles, setMaskFiles] = useState([]);
  const [view, setView] = useState('axial');

  return (
    <div className="container">
      <h1 className="mb-4">BodyMaps CT Viewer</h1>

      <div className="mb-3">
        <label className="form-label fw-semibold">
          Upload CT Scan (.nii or .nii.gz):
        </label>
        <input
          className="form-control"
          type="file"
          accept=".nii,.nii.gz"
          onChange={(e) => setCtFile(e.target.files[0])}
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">
          Upload Segmentation Mask(s):
        </label>
        <input
          className="form-control"
          type="file"
          accept=".nii,.nii.gz"
          multiple
          onChange={(e) => setMaskFiles([...e.target.files])}
        />
      </div>

      <div className="mb-4">
        <label className="form-label me-2 fw-semibold">View Plane:</label>
        <select
          className="form-select w-auto d-inline-block"
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          <option value="axial">Axial</option>
          <option value="sagittal">Sagittal</option>
          <option value="coronal">Coronal</option>
        </select>
      </div>

      {ctFile && (
        <Viewer ctFile={ctFile} maskFiles={maskFiles} view={view} />
      )}
    </div>
);
}
