'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { loansApi } from '@/lib/api';
import { Loan, LoanApplication, LoanOffer, LoanPaymentSchedule } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { LoanCard } from '@/components/loans/LoanCard';
import { PaymentSchedule } from '@/components/loans/PaymentSchedule';
import { formatCurrency } from '@/lib/utils';

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [offers, setOffers] = useState<LoanOffer[]>([]);
  const [loanSummary, setLoanSummary] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<LoanPaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'active' | 'applications' | 'schedule'>('overview');
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansResult, applicationsResult, offersResult, summaryResult] = await Promise.allSettled([
        loansApi.getLoans(),
        loansApi.getApplications(),
        loansApi.getOffers(),
        loansApi.getLoanSummary()
      ]);

      const loansData = loansResult.status === 'fulfilled' ? loansResult.value : [];
      if (loansResult.status === 'fulfilled') setLoans(loansData);
      if (applicationsResult.status === 'fulfilled') setApplications(applicationsResult.value);
      if (offersResult.status === 'fulfilled') setOffers(offersResult.value);
      if (summaryResult.status === 'fulfilled') setLoanSummary(summaryResult.value);

      // If there are active loans, fetch schedule for the first one
      if (loansData.length > 0 && loansData[0].status === 'active') {
        const schedule = await loansApi.getPaymentSchedule(loansData[0].id);
        setPaymentSchedule(schedule);
        setSelectedLoan(loansData[0]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleLoanClick = async (loan: Loan) => {
    setSelectedLoan(loan);
    
    try {
      const schedule = await loansApi.getPaymentSchedule(loan.id);
      setPaymentSchedule(schedule);
      setActiveTab('schedule');
    } catch {
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-blue)]"></div>
      </div>
    );
  }

  const activeLoans = loans.filter(loan => loan.status === 'active');
  const paidOffLoans = loans.filter(loan => loan.status === 'paid_off');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-1)] mb-2">Loan Management</h1>
        <p className="text-[var(--text-2)]">Track your loans, make payments, and explore refinancing options</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['overview', 'active', 'applications', 'schedule'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-[var(--primary-blue)] text-white'
                : 'bg-[rgba(var(--glass-rgb),0.3)] text-[var(--text-2)] hover:bg-[rgba(var(--glass-rgb),0.5)]'
            }`}
            data-testid={`loans-tab-${tab}`}
          >
            {tab === 'schedule' ? 'Payment Schedule' : tab}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && !loanSummary && (
          <Card className="p-8 text-center">
            <p className="text-[var(--text-2)]">No loan data available. Apply for a loan to get started.</p>
          </Card>
        )}
        {activeTab === 'overview' && loanSummary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <p className="text-sm text-[var(--text-2)] mb-2">Total Balance</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {formatCurrency(loanSummary.totalBalance)}
                </p>
              </Card>
              
              <Card className="p-6">
                <p className="text-sm text-[var(--text-2)] mb-2">Monthly Payment</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {formatCurrency(loanSummary.totalMonthlyPayment)}
                </p>
              </Card>
              
              <Card className="p-6">
                <p className="text-sm text-[var(--text-2)] mb-2">Next Payment Due</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {loanSummary.nextPaymentDue ? new Date(loanSummary.nextPaymentDue).toLocaleDateString() : 'N/A'}
                </p>
              </Card>
              
              <Card className="p-6">
                <p className="text-sm text-[var(--text-2)] mb-2">Total Interest Paid</p>
                <p className="text-2xl font-bold text-[var(--primary-orange)]">
                  {formatCurrency(loanSummary.totalInterestPaid)}
                </p>
              </Card>
            </div>

            {/* Loans by Type */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Loans by Type</h3>
              <div className="space-y-3">
                {loanSummary.loansByType.map((type: unknown) => (
                  <div key={type.type} className="flex items-center justify-between p-3 bg-[rgba(var(--glass-rgb),0.2)] rounded-lg">
                    <span className="capitalize text-[var(--text-1)]">
                      {type.type.replace(/_/g, ' ')} ({type.count})
                    </span>
                    <span className="font-semibold text-[var(--text-1)]">
                      {formatCurrency(type.totalBalance)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'active' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-[var(--text-1)]">Active Loans</h2>
              <Button
                onClick={() => setShowApplicationModal(true)}
                variant="primary"
                size="sm"
                data-testid="apply-loan-btn"
              >
                + Apply for Loan
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeLoans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onClick={() => handleLoanClick(loan)}
                />
              ))}
            </div>

            {paidOffLoans.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-[var(--text-1)] mb-4">Paid Off Loans</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {paidOffLoans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onClick={() => handleLoanClick(loan)}
                      showDetails={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-1)] mb-6">Loan Applications</h2>
            
            {applications.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-[var(--text-2)] mb-4">No active loan applications</p>
                <Button
                  onClick={() => setShowApplicationModal(true)}
                  variant="primary"
                  data-testid="start-application-btn"
                >
                  Start New Application
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <Card key={app.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-[var(--text-1)] capitalize">
                          {app.loanType.replace(/_/g, ' ')} Loan Application
                        </h4>
                        <p className="text-sm text-[var(--text-2)]">
                          {formatCurrency(app.requestedAmount)} for {app.proposedTerm} months
                        </p>
                      </div>
                      <div 
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          app.status === 'approved' ? 'bg-[var(--primary-emerald)]20 text-[var(--primary-emerald)]' :
                          app.status === 'rejected' ? 'bg-[var(--primary-red)]20 text-[var(--primary-red)]' :
                          'bg-[var(--primary-blue)]20 text-[var(--primary-blue)]'
                        }`}
                      >
                        {app.status.replace(/_/g, ' ')}
                      </div>
                    </div>
                    
                    <p className="text-sm text-[var(--text-2)] mb-4">{app.purpose}</p>
                    
                    {app.submittedAt && (
                      <p className="text-xs text-[var(--text-3)]">
                        Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {offers.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-[var(--text-1)] mb-4">Available Offers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offers.map((offer) => (
                    <Card key={offer.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-[var(--text-1)]">{offer.lender}</h4>
                          <p className="text-sm text-[var(--text-2)]">
                            {formatCurrency(offer.amount)} • {offer.term} months
                          </p>
                        </div>
                        {offer.isPreApproved && (
                          <span className="px-2 py-1 bg-[var(--primary-emerald)]20 text-[var(--primary-emerald)] text-xs rounded">
                            Pre-approved
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-[var(--text-3)]">Interest Rate</p>
                          <p className="font-medium text-[var(--text-1)]">{offer.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-3)]">APR</p>
                          <p className="font-medium text-[var(--text-1)]">{offer.apr}%</p>
                        </div>
                        <div>
                          <p className="text-[var(--text-3)]">Monthly Payment</p>
                          <p className="font-medium text-[var(--text-1)]">
                            {formatCurrency(offer.monthlyPayment)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--text-3)]">Total Interest</p>
                          <p className="font-medium text-[var(--text-1)]">
                            {formatCurrency(offer.totalInterest)}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        variant="primary"
                        fullWidth
                        size="sm"
                      >
                        Accept Offer
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && selectedLoan && (
          <div>
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-[var(--text-1)] mb-2">
                {selectedLoan.loanType.replace(/_/g, ' ')} Loan - {selectedLoan.lender}
              </h3>
              <p className="text-sm text-[var(--text-2)]">
                Balance: {formatCurrency(selectedLoan.balance)} • Rate: {selectedLoan.interestRate}%
              </p>
            </Card>
            
            <PaymentSchedule
              schedule={paymentSchedule}
            />
          </div>
        )}
      </motion.div>

      {/* Apply for Loan Modal */}
      <Modal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        title="Apply for a Loan"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-2)]">
            Choose the type of loan you&apos;d like to apply for:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth>
              🏠 Mortgage
            </Button>
            <Button variant="secondary" fullWidth>
              🚗 Auto Loan
            </Button>
            <Button variant="secondary" fullWidth>
              💰 Personal Loan
            </Button>
            <Button variant="secondary" fullWidth>
              🎓 Student Loan
            </Button>
            <Button variant="secondary" fullWidth>
              💼 Business Loan
            </Button>
            <Button variant="secondary" fullWidth>
              🔗 Crypto-Backed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
