'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { insuranceApi } from '@/lib/api';
import { InsurancePolicy, InsuranceClaim, InsuranceProvider } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { PolicyCard } from '@/components/insurance/PolicyCard';
import { ClaimsList } from '@/components/insurance/ClaimsList';
import { formatCurrency } from '@/lib/utils';

interface InsuranceSummaryView {
  totalPolicies: number;
  totalMonthlyPremium: number;
  totalCoverage: number;
  activeClaims: number;
  policiesByType: Array<{ type: string; count: number; totalPremium: number; totalCoverage: number }>;
  upcomingRenewals: Array<{ policy: { id: string; policyType: string; provider: string; premium: number }; daysUntilRenewal: number }>;
}

// Normalize a premium to an approximate monthly amount based on its frequency.
function toMonthly(amount: number, frequency: string): number {
  switch ((frequency || 'monthly').toLowerCase()) {
    case 'weekly': return amount * 4.333;
    case 'quarterly': return amount / 3;
    case 'semi-annual':
    case 'semiannual': return amount / 6;
    case 'annual':
    case 'annually':
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

export default function InsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [insuranceSummary, setInsuranceSummary] = useState<InsuranceSummaryView | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'claims' | 'providers'>('overview');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimType, setClaimType] = useState('');
  const [claimIncidentDate, setClaimIncidentDate] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const resetClaimForm = () => {
    setSelectedPolicy(null);
    setClaimType('');
    setClaimIncidentDate('');
    setClaimAmount('');
    setClaimDescription('');
    setClaimError(null);
  };

  const handleSubmitClaim = async () => {
    if (!selectedPolicy) return;
    if (!claimType || !claimIncidentDate || !claimAmount || !claimDescription) {
      setClaimError('Please fill in all fields before submitting.');
      return;
    }
    try {
      setClaimSubmitting(true);
      setClaimError(null);
      await insuranceApi.fileClaim({
        policyId: selectedPolicy.id,
        claimType,
        description: claimDescription,
        amount: parseFloat(claimAmount),
        dateOfIncident: claimIncidentDate,
      });
      setShowClaimModal(false);
      resetClaimForm();
      setActiveTab('claims');
      await fetchData();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Failed to submit claim. Please try again.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [policiesResult, claimsResult, providersResult, summaryResult] = await Promise.allSettled([
        insuranceApi.getPolicies(),
        insuranceApi.getClaims(),
        insuranceApi.getProviders(),
        insuranceApi.getInsuranceSummary()
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawPolicies: any[] = policiesResult.status === 'fulfilled' ? policiesResult.value : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawClaims: any[] = claimsResult.status === 'fulfilled' ? claimsResult.value : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawProviders: any[] = providersResult.status === 'fulfilled' ? providersResult.value : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawSummary: any = summaryResult.status === 'fulfilled' ? summaryResult.value : null;

      const mappedPolicies: InsurancePolicy[] = rawPolicies.map(p => ({
        id: String(p.id),
        userId: p.user_id,
        policyNumber: p.policy_number,
        policyType: p.insurance_type ?? p.policy_type,
        status: p.status,
        provider: p.provider_name ?? p.provider ?? 'Unknown',
        premium: p.premium_amount ?? p.premium ?? 0,
        premiumFrequency: p.premium_frequency ?? 'monthly',
        deductible: p.deductible ?? 0,
        coverageAmount: p.coverage_amount ?? 0,
        startDate: p.start_date ?? '',
        endDate: p.end_date ?? '',
        renewalDate: p.renewal_date ?? p.end_date ?? '',
        beneficiaries: p.beneficiaries ?? [],
        coverage: p.coverage_details ?? {},
        documents: p.documents ?? [],
        autoRenew: p.auto_renew ?? false,
      }));
      setPolicies(mappedPolicies);

      const mappedClaims: InsuranceClaim[] = rawClaims.map(c => ({
        id: String(c.id),
        policyId: String(c.policy_id),
        claimNumber: c.claim_number,
        status: c.status,
        claimType: c.claim_type ?? 'general',
        description: c.description ?? '',
        dateOfIncident: c.incident_date ?? c.filed_date ?? '',
        filedDate: c.filed_date ?? '',
        claimAmount: c.amount_claimed ?? 0,
        approvedAmount: c.amount_approved ?? undefined,
        paidAmount: c.amount_paid ?? undefined,
        deductibleApplied: c.deductible_applied ?? undefined,
        documents: [],
        timeline: [],
      }));
      setClaims(mappedClaims);

      const mappedProviders: InsuranceProvider[] = rawProviders.map(pr => ({
        id: String(pr.id),
        name: pr.name,
        types: pr.insurance_types ?? pr.types ?? [],
        rating: pr.rating ?? 0,
        reviewCount: pr.review_count ?? 0,
        features: pr.features ?? [],
        contact: {
          phone: pr.customer_service_phone ?? '',
          email: pr.customer_service_email ?? '',
          website: pr.website ?? '',
        },
        networkSize: pr.network_size ? String(pr.network_size) : undefined,
      }));
      setProviders(mappedProviders);

      if (rawSummary) {
        // Aggregate per-type premium/coverage from the policy list since the
        // summary endpoint only returns counts per type.
        const byType: Record<string, { type: string; count: number; totalPremium: number; totalCoverage: number }> = {};
        for (const p of mappedPolicies) {
          const key = p.policyType;
          if (!byType[key]) byType[key] = { type: key, count: 0, totalPremium: 0, totalCoverage: 0 };
          byType[key].count += 1;
          byType[key].totalPremium += toMonthly(p.premium, p.premiumFrequency);
          byType[key].totalCoverage += p.coverageAmount;
        }
        const activeClaims = mappedClaims.filter(c =>
          ['submitted', 'under_review', 'approved'].includes(c.status)
        ).length;

        setInsuranceSummary({
          totalPolicies: rawSummary.total_policies ?? mappedPolicies.length,
          totalMonthlyPremium: rawSummary.total_monthly_premiums ?? 0,
          totalCoverage: rawSummary.total_coverage_amount ?? 0,
          activeClaims,
          policiesByType: Object.values(byType),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          upcomingRenewals: (rawSummary.upcoming_renewals ?? []).map((r: any) => ({
            policy: {
              id: String(r.policy?.id ?? r.policy_id ?? ''),
              policyType: r.policy?.insurance_type ?? r.insurance_type ?? r.policy_type ?? '',
              provider: r.policy?.provider_name ?? r.provider_name ?? '',
              premium: r.policy?.premium_amount ?? r.premium_amount ?? 0,
            },
            daysUntilRenewal: r.days_until_renewal ?? r.daysUntilRenewal ?? 0,
          })),
        });
      } else {
        setInsuranceSummary(null);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyClick = (policy: InsurancePolicy) => {
    setSelectedPolicy(policy);
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

  const activePolicies = policies.filter(p => p.status === 'active');
  const _activeClaims = claims.filter(c => ['submitted', 'under_review', 'approved'].includes(c.status));

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-1)] mb-2">Insurance Hub</h1>
        <p className="text-[var(--text-2)]">Manage your insurance policies, file claims, and track coverage</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['overview', 'policies', 'claims', 'providers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-[var(--primary-blue)] text-white'
                : 'bg-[rgba(var(--glass-rgb),0.3)] text-[var(--text-2)] hover:bg-[rgba(var(--glass-rgb),0.5)]'
            }`}
            data-testid={`insurance-tab-${tab}`}
          >
            {tab}
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
        {activeTab === 'overview' && !insuranceSummary && (
          <Card className="p-8 text-center">
            <p className="text-[var(--text-2)]">No insurance data available. Explore providers to get started.</p>
          </Card>
        )}
        {activeTab === 'overview' && insuranceSummary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <p className="text-sm text-[var(--text-2)] mb-2">Active Policies</p>
                <p className="text-3xl font-bold text-[var(--text-1)]">
                  {insuranceSummary.totalPolicies}
                </p>
              </Card>
              
              <Card className="p-6">
                <p className="text-sm text-[var(--text-2)] mb-2">Monthly Premium</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">
                  {formatCurrency(insuranceSummary.totalMonthlyPremium)}
                </p>
              </Card>
              
              <Card className="p-6">
                <p className="text-sm text-[var(--text-2)] mb-2">Total Coverage</p>
                <p className="text-2xl font-bold text-[var(--primary-emerald)]">
                  {formatCurrency(insuranceSummary.totalCoverage)}
                </p>
              </Card>
              
              <Card className="p-6">
                <p className="text-sm text-[var(--text-2)] mb-2">Active Claims</p>
                <p className="text-3xl font-bold text-[var(--primary-orange)]">
                  {insuranceSummary.activeClaims}
                </p>
              </Card>
            </div>

            {/* Policies by Type */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Coverage Overview</h3>
              <div className="space-y-3">
                {insuranceSummary.policiesByType.map((type: unknown) => (
                  <div key={type.type}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="capitalize text-[var(--text-1)]">
                        {type.type} ({type.count})
                      </span>
                      <span className="text-sm text-[var(--text-2)]">
                        {formatCurrency(type.totalPremium)}/mo
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[var(--glass-bg)] rounded-full h-2">
                        <div
                          className="h-full rounded-full gradient-primary"
                          style={{ width: `${(type.totalCoverage / insuranceSummary.totalCoverage) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--text-3)] min-w-[80px] text-right">
                        {formatCurrency(type.totalCoverage)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Upcoming Renewals */}
            {insuranceSummary.upcomingRenewals.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text-1)] mb-4">Upcoming Renewals</h3>
                <div className="space-y-3">
                  {insuranceSummary.upcomingRenewals.map((renewal: unknown) => (
                    <div 
                      key={renewal.policy.id}
                      className="flex items-center justify-between p-3 bg-[rgba(var(--glass-rgb),0.2)] rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-[var(--text-1)] capitalize">
                          {renewal.policy.policyType} Insurance
                        </p>
                        <p className="text-sm text-[var(--text-2)]">
                          {renewal.policy.provider}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[var(--primary-orange)]">
                          {renewal.daysUntilRenewal} days
                        </p>
                        <p className="text-xs text-[var(--text-3)]">
                          {formatCurrency(renewal.policy.premium)}/mo
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'policies' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-[var(--text-1)]">My Policies</h2>
              <Button
                onClick={() => setShowQuoteModal(true)}
                variant="primary"
                size="sm"
                data-testid="get-quote-btn"
              >
                + Get Quote
              </Button>
            </div>

            {selectedPolicy && (
              <Card className="mb-6 p-4 bg-[var(--primary-blue)]10 border-[var(--primary-blue)]30">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--primary-blue)]">
                    Selected: {selectedPolicy.policyType} - {selectedPolicy.policyNumber}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowClaimModal(true)}
                    data-testid="file-claim-btn"
                  >
                    File Claim
                  </Button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activePolicies.map((policy) => (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  onClick={() => handlePolicyClick(policy)}
                />
              ))}
            </div>

            {policies.filter(p => p.status !== 'active').length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-[var(--text-1)] mb-4">Inactive Policies</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {policies.filter(p => p.status !== 'active').map((policy) => (
                    <PolicyCard
                      key={policy.id}
                      policy={policy}
                      onClick={() => handlePolicyClick(policy)}
                      showDetails={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'claims' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-[var(--text-1)]">Insurance Claims</h2>
              <Button
                onClick={() => setShowClaimModal(true)}
                variant="primary"
                size="sm"
                disabled={policies.length === 0}
                data-testid="new-claim-btn"
              >
                + New Claim
              </Button>
            </div>

            {claims.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-[var(--text-2)] mb-4">No claims filed yet</p>
                <Button
                  onClick={() => setActiveTab('policies')}
                  variant="secondary"
                >
                  View Policies
                </Button>
              </Card>
            ) : (
              <ClaimsList
                claims={claims}
              />
            )}
          </div>
        )}

        {activeTab === 'providers' && (
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-1)] mb-6">Insurance Providers</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.map((provider) => (
                <Card key={provider.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-1)]">{provider.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[var(--primary-yellow)]">★</span>
                        <span className="text-sm text-[var(--text-2)]">
                          {provider.rating} ({provider.reviewCount} reviews)
                        </span>
                      </div>
                    </div>
                    {provider.logo && (
                      <Image src={provider.logo} alt={provider.name} width={48} height={48} className="object-contain" />
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-[var(--text-3)]">Coverage Types</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.types.slice(0, 3).map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 bg-[rgba(var(--glass-rgb),0.3)] rounded text-xs capitalize"
                        >
                          {type}
                        </span>
                      ))}
                      {provider.types.length > 3 && (
                        <span className="px-2 py-1 text-xs text-[var(--text-3)]">
                          +{provider.types.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {provider.claimSatisfaction && (
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-[var(--text-3)]">Claim Satisfaction</p>
                        <p className="font-medium text-[var(--text-1)]">{provider.claimSatisfaction}%</p>
                      </div>
                      <div>
                        <p className="text-[var(--text-3)]">Avg Processing</p>
                        <p className="font-medium text-[var(--text-1)]">{provider.avgProcessingTime}</p>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    fullWidth
                    size="sm"
                  >
                    Get Quote
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Get Quote Modal */}
      <Modal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        title="Get Insurance Quote"
      >
        <div className="space-y-4">
          <p className="text-[var(--text-2)]">
            Select the type of insurance you need:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth>
              🏥 Health
            </Button>
            <Button variant="secondary" fullWidth>
              🚗 Auto
            </Button>
            <Button variant="secondary" fullWidth>
              🏠 Home
            </Button>
            <Button variant="secondary" fullWidth>
              💗 Life
            </Button>
            <Button variant="secondary" fullWidth>
              🦽 Disability
            </Button>
            <Button variant="secondary" fullWidth>
              ✈️ Travel
            </Button>
          </div>
        </div>
      </Modal>

      {/* File Claim Modal */}
      <Modal
        isOpen={showClaimModal}
        onClose={() => {
          setShowClaimModal(false);
          resetClaimForm();
        }}
        title="File Insurance Claim"
      >
        <div className="space-y-4">
          {selectedPolicy ? (
            <>
              <Card className="p-4 bg-[rgba(var(--glass-rgb),0.2)]">
                <p className="text-sm text-[var(--text-2)]">Filing claim for:</p>
                <p className="font-medium text-[var(--text-1)] capitalize">
                  {selectedPolicy.policyType} Insurance - {selectedPolicy.policyNumber}
                </p>
              </Card>

              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-1">Claim type</label>
                <input
                  type="text"
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value)}
                  placeholder="e.g. Collision, Water damage, Medical"
                  className="w-full p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)] text-[var(--text-1)]"
                  data-testid="claim-type-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-1">Date of incident</label>
                <input
                  type="date"
                  value={claimIncidentDate}
                  onChange={(e) => setClaimIncidentDate(e.target.value)}
                  className="w-full p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)] text-[var(--text-1)]"
                  data-testid="claim-date-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-1">Claim amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)] text-[var(--text-1)]"
                  data-testid="claim-amount-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-1)] mb-1">Description</label>
                <textarea
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                  placeholder="Describe what happened"
                  rows={3}
                  className="w-full p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)] text-[var(--text-1)]"
                  data-testid="claim-description-input"
                />
              </div>

              {claimError && (
                <p className="text-sm text-[var(--primary-red)]">{claimError}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setSelectedPolicy(null)}
                  disabled={claimSubmitting}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSubmitClaim}
                  disabled={claimSubmitting}
                  data-testid="submit-claim-btn"
                >
                  {claimSubmitting ? 'Submitting…' : 'Submit Claim'}
                </Button>
              </div>
            </>
          ) : policies.length > 0 ? (
            <>
              <label className="block text-sm text-[var(--text-2)]">
                Select a policy to file a claim for:
              </label>
              <select
                className="w-full p-3 rounded-lg bg-[rgba(var(--glass-rgb),0.2)] border border-[var(--border-1)] text-[var(--text-1)]"
                value=""
                onChange={(e) => {
                  const policy = policies.find((p) => p.id === e.target.value);
                  if (policy) setSelectedPolicy(policy);
                }}
                data-testid="claim-policy-select"
              >
                <option value="" disabled>
                  Choose a policy…
                </option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id} className="capitalize">
                    {policy.policyType} Insurance - {policy.policyNumber}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="text-[var(--text-2)]">
              You don&apos;t have any active policies yet. Get a quote to add one before filing a claim.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
