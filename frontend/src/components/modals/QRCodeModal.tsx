'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  QrCode,
  Download,
  Share2,
  Copy,
  Check,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { p2pApi, type P2PQRCodeResponse } from '@/lib/api/p2p';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'generate' | 'scan';
  onScanSuccess?: (data: unknown) => void;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  mode,
}: QRCodeModalProps) {
  const [qrData, setQrData] = useState<P2PQRCodeResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'generate' && isOpen && !qrData) {
      // Generate a basic QR code when modal opens
      generateQRCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isOpen, qrData]);

  const generateQRCode = async () => {
    
    setIsGenerating(true);
    setError('');

    try {
      const response = await p2pApi.generateQRCode(
        amount ? parseFloat(amount) : undefined,
        description || undefined
      );
      
      setQrData(response);
    } catch {
      setError('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (qrData?.payment_link) {
      navigator.clipboard.writeText(qrData.payment_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (qrData?.qr_code) {
      const link = document.createElement('a');
      link.href = qrData.qr_code;
      link.download = `payment-qr-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setQrData(null);
    setError('');
    onClose();
  };

  if (mode === 'scan') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Scan QR Code"
        size="md"
      >
        <div className="space-y-4">
          <div className="aspect-square bg-[rgba(var(--glass-rgb),0.1)] rounded-lg flex items-center justify-center relative overflow-hidden">
            {/* Scanner animation */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(var(--primary-blue),0.3)] to-transparent"
              animate={{
                y: ['0%', '100%', '0%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            
            <QrCode className="w-24 h-24 text-[var(--text-2)] opacity-50" />
          </div>
          
          <p className="text-center text-[var(--text-2)]">
            Position the QR code within the frame to scan
          </p>
          
          <div className="text-center text-sm text-[var(--text-2)]">
            <p>Camera permission required</p>
            <p className="mt-2">QR scanner will be implemented with device camera access</p>
          </div>
          
          <Button
            variant="secondary"
            fullWidth
            onClick={handleClose}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Receive Payment"
      size="md"
    >
      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Amount (Optional)
          </label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            icon={<DollarSign size={18} />}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-1)] mb-2">
            Description (Optional)
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this payment for?"
            icon={<MessageSquare size={18} />}
          />
        </div>

        {/* Generate Button */}
        <Button
          variant="primary"
          fullWidth
          onClick={generateQRCode}
          disabled={isGenerating}
          loading={isGenerating}
          icon={<QrCode size={18} />}
        >
          {qrData ? 'Regenerate QR Code' : 'Generate QR Code'}
        </Button>

        {/* QR Code Display */}
        {qrData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="p-4 bg-white rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrData.qr_code}
                alt="Payment QR Code"
                className="w-full h-auto"
              />
            </div>

            {/* QR Details */}
            <div className="p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.05)] border border-[var(--border-1)] space-y-2">
              {amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-2)]">Amount</span>
                  <span className="text-[var(--text-1)] font-medium">
                    ${parseFloat(amount).toFixed(2)}
                  </span>
                </div>
              )}
              {description && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-2)]">Description</span>
                  <span className="text-[var(--text-1)]">{description}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-2)]">Expires</span>
                <span className="text-[var(--text-1)]">
                  {new Date(qrData.expires_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                icon={copied ? <Check size={16} /> : <Copy size={16} />}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                icon={<Download size={16} />}
              >
                Save
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // Share functionality
                  if (navigator.share && qrData?.payment_link) {
                    navigator.share({
                      title: 'Payment Request',
                      text: description || 'Pay me via Operative Tortoise',
                      url: qrData.payment_link
                    });
                  }
                }}
                icon={<Share2 size={16} />}
              >
                Share
              </Button>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-[rgba(var(--primary-red),0.1)] text-[var(--primary-red)] text-sm">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}