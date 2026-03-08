export type InterestFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Payment {
  id: string;
  amount: number;
  date: string;
}

export interface Loan {
  id: string;
  name: string;
  principal: number;
  interestRate: number; // as a percentage, e.g., 5 for 5%
  frequency: InterestFrequency;
  startDate: string;
  lastInterestAppliedDate: string;
  currentBalance: number;
  payments: Payment[];
  color: string;
}
