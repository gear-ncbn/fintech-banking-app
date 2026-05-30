import { apiClient } from './client';

export interface Invoice {
  id: number;
  user_id: number;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address?: string;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  payment_terms: 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'due_on_receipt';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  notes?: string;
  created_at: string;
  sent_at?: string;
  paid_at?: string;
  line_items: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount_percentage?: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
}

export interface CreateInvoiceRequest {
  invoice_number?: string;
  client_name: string;
  client_email: string;
  client_address?: string;
  issue_date: string;
  due_date: string;
  payment_terms: 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'due_on_receipt';
  notes?: string;
  line_items: {
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    discount_percentage?: number;
  }[];
  tax_rate?: number;
  discount_percentage?: number;
  business_account_id?: number;
}

export interface BusinessExpense {
  id: number;
  business_account_id: number;
  amount: number;
  category: string;
  description: string;
  vendor: string;
  tax_deductible: boolean;
  receipt_url?: string;
  created_at: string;
}

export interface CreateBusinessExpenseRequest {
  business_account_id: number;
  amount: number;
  category: string;
  description: string;
  vendor: string;
  tax_deductible: boolean;
  receipt_url?: string;
}

export interface ExpenseReport {
  id: number;
  user_id: number;
  report_name: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  start_date: string;
  end_date: string;
  total_amount: number;
  expense_count: number;
  expenses_by_category: Record<string, number>;
  expenses_by_tax_category: Record<string, number>;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  expenses: {
    transaction_id: number;
    date: string;
    description: string;
    amount: number;
    category: string;
    tax_category: string;
    has_receipt: boolean;
  }[];
}

export interface GenerateExpenseReportRequest {
  report_name: string;
  start_date: string;
  end_date: string;
  account_ids: number[];
  category_ids?: number[];
  notes?: string;
}

export interface Receipt {
  id: number;
  user_id: number;
  transaction_id?: number;
  receipt_url: string;
  thumbnail_url: string;
  amount: number;
  merchant_name: string;
  date: string;
  category_id?: number;
  tax_category: string;
  extracted_data: {
    merchant?: string;
    amount?: number;
    date?: string;
    items?: string[];
    confidence?: number;
  };
  notes?: string;
  created_at: string;
}

export interface TaxEstimate {
  quarter: string;
  year: number;
  gross_income: number;
  total_expenses: number;
  deductible_expenses: number;
  estimated_taxable_income: number;
  estimated_quarterly_tax: number;
  tax_breakdown: {
    self_employment: number;
    federal: number;
    state: number;
    local: number;
  };
  deductions_by_category: Record<string, number>;
  recommendations: string[];
  payment_due_date: string;
}

export interface BusinessAccount {
  id: number;
  user_id: number;
  account_number: string;
  business_name: string;
  business_type: string;
  ein: string;
  account_type: string;
  balance: number;
  interest_rate: number;
  creditLimit?: number;
  created_at: string;
  authorized_users: Array<{
    id: number;
    username: string;
    role: string;
    permissions: string[];
  }>;
}

export interface CashFlowAnalysis {
  business_account_id: number;
  current_month: {
    inflows: number;
    outflows: number;
    net_flow: number;
  };
  past_months: Array<{
    month: string;
    inflows: number;
    outflows: number;
    net_flow: number;
  }>;
  projections: Array<{
    month: string;
    projected_inflows: number;
    projected_outflows: number;
    projected_net_flow: number;
    projected_balance: number;
  }>;
  recommendations: string[];
  cash_runway_months: number;
}

export const businessApi = {
  // Invoice endpoints
  async getInvoices(status?: string, clientName?: string): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (clientName) params.append('client_name', clientName);
    
    return apiClient.get<Invoice[]>(`/api/business/invoices?${params.toString()}`);
  },

  async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    return apiClient.post<Invoice>('/api/business/invoices', data);
  },

  async getInvoice(invoiceId: number): Promise<Invoice> {
    return apiClient.get<Invoice>(`/api/business/invoices/${invoiceId}`);
  },

  async sendInvoice(invoiceId: number): Promise<{ message: string }> {
    return apiClient.put(`/api/business/invoices/${invoiceId}/send`);
  },

  async markInvoicePaid(invoiceId: number, amountPaid?: number): Promise<{ message: string; status: string }> {
    const params = amountPaid !== undefined ? `?amount_paid=${amountPaid}` : '';
    return apiClient.put(`/api/business/invoices/${invoiceId}/mark-paid${params}`);
  },

  async duplicateInvoice(invoiceId: number): Promise<Invoice> {
    return apiClient.post<Invoice>(`/api/business/invoices/${invoiceId}/duplicate`);
  },

  // Expense endpoints
  async createExpense(data: CreateBusinessExpenseRequest): Promise<BusinessExpense> {
    return apiClient.post<BusinessExpense>('/api/business/expenses', data);
  },

  async generateExpenseReport(data: GenerateExpenseReportRequest): Promise<ExpenseReport> {
    return apiClient.post<ExpenseReport>('/api/business/expenses/report', data);
  },

  // Receipt endpoints
  async uploadReceipt(formData: FormData): Promise<Receipt> {
    return apiClient.post<Receipt>('/api/business/receipts', undefined, {
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    });
  },

  // Tax endpoints
  async getTaxEstimate(year?: number, quarter?: number): Promise<TaxEstimate> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (quarter) params.append('quarter', quarter.toString());
    
    return apiClient.get<TaxEstimate>(`/api/business/tax/estimate?${params.toString()}`);
  },

  // Business account endpoints
  async getBusinessAccounts(): Promise<BusinessAccount[]> {
    return apiClient.get<BusinessAccount[]>('/api/business/accounts');
  },

  async getCashFlowAnalysis(accountId: number): Promise<CashFlowAnalysis> {
    return apiClient.get<CashFlowAnalysis>(`/api/business/cash-flow/${accountId}`);
  },

  // Categorization
  async categorizeTransactions(transactionIds: number[], autoCategories = true, applyTaxCategories = true) {
    return apiClient.post('/api/business/transactions/categorize', {
      transaction_ids: transactionIds,
      auto_categorize: autoCategories,
      apply_tax_categories: applyTaxCategories,
    });
  },
};