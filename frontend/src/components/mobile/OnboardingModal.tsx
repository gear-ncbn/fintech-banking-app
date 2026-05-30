import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Shield, 
  TrendingUp, 
  CreditCard, 
  Users, 
  ChevronRight,
  Smartphone,
  Bell,
  Target
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useDemoMode } from '@/contexts/DemoModeContext';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  image?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: 'Welcome to Your Financial Hub',
    description: 'Manage all your finances in one secure, intuitive platform.',
    features: [
      'Real-time account balances',
      'Smart spending insights',
      'Secure transactions',
    ],
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Bank-Level Security',
    description: 'Your financial data is protected with industry-leading security.',
    features: [
      '256-bit encryption',
      'Biometric authentication',
      'Two-factor authentication',
    ],
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    title: 'Smart Money Management',
    description: 'AI-powered insights help you make better financial decisions.',
    features: [
      'Spending analytics',
      'Budget recommendations',
      'Savings goals tracking',
    ],
  },
  {
    icon: <CreditCard className="w-8 h-8" />,
    title: 'All Cards, One Place',
    description: 'Manage credit cards, debit cards, and virtual cards seamlessly.',
    features: [
      'Card controls & limits',
      'Instant freeze/unfreeze',
      'Virtual card generation',
    ],
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: 'Easy Money Transfers',
    description: 'Send money to friends and family with just a few taps.',
    features: [
      'Instant P2P payments',
      'Split bills easily',
      'Request money',
    ],
  },
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const { startDemo } = useDemoMode();

  useEffect(() => {
    const seen = localStorage.getItem('onboarding_completed');
    if (seen) {
      setHasSeenOnboarding(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
  };

  const handleStartTour = () => {
    handleComplete();
    startDemo('quick-tour');
  };

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <Modal
      isOpen={isOpen && !hasSeenOnboarding}
      onClose={handleSkip}
      size="lg"
    >
      <div className="relative">
        {/* Content */}
        <div className="p-8">
          {/* Progress bar */}
          <div className="h-1 bg-[rgba(var(--glass-rgb),0.2)] rounded-full mb-8 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-indigo)] text-white">
                  {step.icon}
                </div>
              </div>

              {/* Title and description */}
              <h2 className="text-2xl font-bold text-center text-[var(--text-1)] mb-3">
                {step.title}
              </h2>
              <p className="text-center text-[var(--text-2)] mb-6">
                {step.description}
              </p>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {step.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--primary-emerald)] flex items-center justify-center flex-shrink-0">
                      <ChevronRight className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-[var(--text-1)]">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* Mobile features highlight on last step */}
              {currentStep === ONBOARDING_STEPS.length - 1 && (
                <div className="bg-[rgba(var(--glass-rgb),0.1)] rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Smartphone className="w-5 h-5 text-[var(--primary-blue)]" />
                    <h4 className="font-semibold text-[var(--text-1)]">Mobile First Design</h4>
                  </div>
                  <p className="text-sm text-[var(--text-2)] mb-3">
                    Optimized for your mobile device with:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[var(--primary-amber)]" />
                      <span>Push notifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-[var(--primary-emerald)]" />
                      <span>Touch gestures</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={currentStep === 0 ? 'invisible' : ''}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-300
                    ${index === currentStep 
                      ? 'w-6 bg-[var(--primary-blue)]' 
                      : 'bg-[rgba(var(--glass-rgb),0.3)]'
                    }
                  `}
                />
              ))}
            </div>

            {currentStep === ONBOARDING_STEPS.length - 1 ? (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleComplete}
                >
                  Get Started
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartTour}
                  className="flex items-center gap-1"
                >
                  Take Tour
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Always-visible skip affordance so the modal is easy to dismiss
              without clicking through every step (the last step already has
              its own completion buttons). */}
          {currentStep < ONBOARDING_STEPS.length - 1 && (
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip for now
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OnboardingModal;
