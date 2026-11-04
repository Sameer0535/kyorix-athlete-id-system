"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Check, Upload, AlertCircle } from "lucide-react";

interface PhotoCropperProps {
  onPhotoCropped: (file: File, previewUrl: string) => void;
  currentPreview?: string | null;
}

export default function PhotoCropper({ onPhotoCropped, currentPreview }: PhotoCropperProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Target ID card portrait dimensions (3:4 ratio)
  const CROP_WIDTH = 300;
  const CROP_HEIGHT = 400;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds the 5MB limit.");
      return;
    }

    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setImageSrc(src);
      setIsCropping(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });

      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill background
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scaled dimensions
    const scale = Math.max(CROP_WIDTH / img.width, CROP_HEIGHT / img.height) * zoom;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const centerX = canvas.width / 2 + offset.x;
    const centerY = canvas.height / 2 + offset.y;

    const x = centerX - drawWidth / 2;
    const y = centerY - drawHeight / 2;

    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    // Draw circular or oval face guide overlay
    ctx.strokeStyle = "rgba(59, 130, 246, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    // Face positioning guide oval
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height / 2 - 15, 80, 110, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
  }, [zoom, offset]);

  useEffect(() => {
    if (isCropping) {
      drawCanvas();
    }
  }, [isCropping, drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApplyCrop = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !selectedFile) return;

    // Create an offscreen render canvas for the output
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = 600;
    outputCanvas.height = 800;
    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) return;

    const scale = Math.max(outputCanvas.width / img.width, outputCanvas.height / img.height) * zoom;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const scaleFactor = outputCanvas.width / canvas.width;
    const centerX = outputCanvas.width / 2 + offset.x * scaleFactor;
    const centerY = outputCanvas.height / 2 + offset.y * scaleFactor;

    const x = centerX - drawWidth / 2;
    const y = centerY - drawHeight / 2;

    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    outCtx.drawImage(img, x, y, drawWidth, drawHeight);

    outputCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], `cropped_${selectedFile.name.replace(/\.[^/.]+$/, "")}.jpg`, {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(blob);
        onPhotoCropped(croppedFile, previewUrl);
        setIsCropping(false);
      },
      "image/jpeg",
      0.95
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {isCropping ? (
        <div className="bg-slate-950 border border-blue-500/40 rounded-2xl p-4 flex flex-col items-center space-y-4 shadow-2xl">
          <div className="text-center">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Position & Crop Athlete Portrait
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Drag to position athlete face within the guideline oval. Use zoom slider for precise framing.
            </p>
          </div>

          <div
            className="relative border-2 border-dashed border-blue-500/60 rounded-xl overflow-hidden cursor-move shadow-inner"
            style={{ width: CROP_WIDTH, height: CROP_HEIGHT }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              width={CROP_WIDTH}
              height={CROP_HEIGHT}
              className="w-full h-full select-none"
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <ZoomOut className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <ZoomIn className="w-4 h-4 text-slate-400" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition shadow-lg shadow-blue-950/40"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm Crop
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-5 items-center">
          <div className="w-32 h-40 bg-slate-950 border-2 border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-md relative group">
            {currentPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentPreview} alt="Athlete Portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-3 text-slate-500 text-[11px] leading-tight">
                No photo selected
              </div>
            )}
          </div>

          <div className="flex-1 w-full space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Upload Official Portrait Photograph <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Supports JPEG, PNG, WebP (Max 5MB)</span>
              <span>&bull;</span>
              <span>Includes interactive crop & alignment</span>
            </div>

            {currentPreview && (
              <button
                type="button"
                onClick={() => {
                  if (imageSrc) setIsCropping(true);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 mt-1"
              >
                <Upload className="w-3 h-3" /> Re-crop / Reposition photo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

