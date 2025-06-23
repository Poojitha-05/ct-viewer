import React, { useEffect, useRef, useState } from 'react';
import * as nifti from 'nifti-reader-js';

export default function Viewer({ ctFile, maskFiles, view }) {
  const canvasRef = useRef(null);
  const [sliceIdx, setSliceIdx] = useState(0);
  const [dims, setDims] = useState({ nx: 0, ny: 0, nz: 0 });

  // for returning the header and image data
  const readNifti = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        let buffer = reader.result;
        if (nifti.isCompressed(buffer)) {
          buffer = nifti.decompress(buffer);
        }
        const header = nifti.readHeader(buffer);
        const image = nifti.readImage(header, buffer);
        resolve({ header, image });
      };
      reader.readAsArrayBuffer(file);
    });

  // update dimensions and set slice index to middle when ct or view changes
  useEffect(() => {
    if (!ctFile) return;
    (async () => {
      const { header } = await readNifti(ctFile);
      const [nx, ny, nz] = header.dims.slice(1, 4);
      setDims({ nx, ny, nz });
      const mid = Math.floor(
        view === 'axial' ? nz / 2 : view === 'coronal' ? ny / 2 : nx / 2
      );
      setSliceIdx(mid);
    })();
  }, [ctFile, view]);

  // redraw canvas whenever inputs change, so it is all responsive
  useEffect(() => {
    if (!ctFile || dims.nx === 0) return;
    (async () => {
      const { nx, ny, nz } = dims;
      const { header: cHdr, image: cBuf } = await readNifti(ctFile);

      // convert image buffer into the right type of array
      let ctRaw;
      switch (cHdr.datatypeCode) {
        case nifti.NIFTI1.TYPE_INT16:
          ctRaw = new Int16Array(cBuf);
          break;
        case nifti.NIFTI1.TYPE_UINT8:
          ctRaw = new Uint8Array(cBuf);
          break;
        case nifti.NIFTI1.TYPE_FLOAT32:
          ctRaw = new Float32Array(cBuf);
          break;
        default:
          ctRaw = new Uint8Array(cBuf);
      }

      // apply windowing with units 0–255
      const wmin = -1000;
      const wmax = 3000;
      const ctDisp = new Uint8ClampedArray(ctRaw.length);
      for (let i = 0; i < ctRaw.length; i++) {
        const w = ((ctRaw[i] - wmin) / (wmax - wmin)) * 255;
        ctDisp[i] = Math.max(0, Math.min(255, Math.round(w)));
      }

      // load and process mask files
      const masks = await Promise.all(
        maskFiles.map(async (f) => {
          const { image: mBuf } = await readNifti(f);
          return new Uint8Array(mBuf);
        })
      );

      // figure out canvas dimensions 
      let W, H, idx;
      if (view === 'axial') {
        W = nx;
        H = ny;
      } else if (view === 'coronal') {
        W = nx;
        H = nz;
      } else {
        W = ny;
        H = nz;
      }

      // set canvas' size
      const canvas = canvasRef.current;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // draw the grayscale ct image slice
      const img = ctx.createImageData(W, H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (view === 'axial') idx = x + y * nx + sliceIdx * nx * ny;
          else if (view === 'coronal') idx = x + sliceIdx * nx + y * nx * ny;
          else idx = sliceIdx + x * nx + y * nx * ny;
          const g = ctDisp[idx];
          const p = 4 * (x + y * W);
          img.data[p] = g;
          img.data[p + 1] = g;
          img.data[p + 2] = g;
          img.data[p + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      // overlay each mask with a RED semi-transparent tint
      masks.forEach((maskRaw, mi) => {
        const color = [0, 0, 0];
        color[mi % 3] = 255;
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.4)`;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (view === 'axial') idx = x + y * nx + sliceIdx * nx * ny;
            else if (view === 'coronal') idx = x + sliceIdx * nx + y * nx * ny;
            else idx = sliceIdx + x * nx + y * nx * ny;
            if (maskRaw[idx] > 0) {
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      });
    })();
  }, [ctFile, maskFiles, view, sliceIdx, dims]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="viewer-canvas"
      />
      <label>
        {view.charAt(0).toUpperCase() + view.slice(1)} slice:
        <input
          type="range"
          min={0}
          max={
            view === 'axial' ? dims.nz - 1 : view === 'coronal' ? dims.ny - 1 : dims.nx - 1
          }
          value={sliceIdx}
          onChange={(e) => setSliceIdx(Number(e.target.value))}
          style={{ marginLeft: 8 }}
        />
        <span style={{ marginLeft: 8 }}>{sliceIdx}</span>
      </label>
    </div>
  );
}
