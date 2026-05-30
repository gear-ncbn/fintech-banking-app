'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  QrCode, 
  Camera,
  Upload,
  Loader2
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { p2pApi } from '@/lib/api';
import { useAlert } from '@/contexts/AlertContext';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (data: unknown) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const { showError, showSuccess, showInfo, hideAlert } = useAlert();
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrData, setQrData] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen && !showManualInput) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, showManualInput]);

  const startCamera = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      
    } catch {
      showError(
        'Camera Access Denied',
        'Please allow camera access to scan QR codes. You can also upload an image or enter the code manually.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const parseQRCodePayload = (data: string): Record<string, unknown> => {
    try {
      const url = new URL(data);
      if (url.protocol === 'bankflow:' && url.hostname === 'p2p') {
        return {
          recipient_id: url.searchParams.get('recipient') ?? undefined,
          amount: url.searchParams.get('amount') ?? undefined,
          description: url.searchParams.get('description') ?? undefined,
        };
      }
    } catch {
      // Manual entries may be opaque codes rather than payment links.
    }

    return { code: data };
  };

  const handleScan = async (data: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Process the QR code through the backend
      const result = await p2pApi.scanQRCode(parseQRCodePayload(data));
      
      showSuccess('QR Code Scanned', 'Successfully processed the QR code');
      
      if (onScanSuccess) {
        onScanSuccess(result);
      }
      
      handleClose();
    } catch {
      showError(
        'Invalid QR Code',
        'The QR code could not be processed. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      // In a real implementation, you would use a QR code reader library
      // For now, we'll show a message
      showInfo(
        'Processing Image',
        'Scanning QR code from image... (Demo - actual implementation would use QR reader library)'
      );
      
      
      // Simulate processing
      setTimeout(() => {
        showError(
          'Feature In Development',
          'QR code image scanning will be available soon. Please use camera scanning or manual input.'
        );
        setIsProcessing(false);
      }, 1500);
    } catch {
      showError('Upload Failed', 'Failed to process the uploaded image');
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (!qrData.trim()) {
      showError('Invalid Input', 'Please enter a valid QR code');
      return;
    }
    handleScan(qrData);
  };

  const handleClose = () => {
    stopCamera();
    setQrData('');
    setShowManualInput(false);
    // Dismiss any alert (e.g. "Camera Access Denied") raised by this modal so
    // it doesn't stay orphaned on screen after the scanner is closed.
    hideAlert();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Scan QR Code"
      size="md"
      analyticsId="qr-scanner-modal"
    >
      <div className="space-y-4">
        {/* Scanner View */}
        {!showManualInput ? (
          <>
            <div className="relative aspect-square w-full max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
              {isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* QR Scanner Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 relative">
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                      
                      {/* Scanning line animation */}
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-[var(--primary-blue)]"
                        animate={{
                          top: ['0%', '100%', '0%'],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full inline-block">
                      Position QR code within the frame
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white">
                  <Camera size={48} className="mb-4 opacity-50" />
                  <p>Starting camera...</p>
                </div>
              )}
            </div>

            {/* Alternative Options */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <Upload size={16} className="mr-2" />
                Upload Image
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setShowManualInput(true)}
                disabled={isProcessing}
              >
                <QrCode size={16} className="mr-2" />
                Enter Code
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </>
        ) : (
          <>
            {/* Manual Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-center p-8 bg-[rgba(var(--glass-rgb),0.2)] rounded-lg">
                <QrCode size={64} className="text-[var(--text-2)]" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
                  Enter QR Code
                </label>
                <input
                  type="text"
                  value={qrData}
                  onChange={(e) => setQrData(e.target.value)}
                  placeholder="Paste or type QR code data"
                  className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-1)] rounded-lg text-[var(--text-1)] placeholder-[var(--text-2)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setShowManualInput(false)}
                >
                  Back to Scanner
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={handleManualSubmit}
                  disabled={isProcessing || !qrData.trim()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default QRScannerModal;
