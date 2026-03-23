import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, History, DollarSign, Percent, Calendar, ArrowRight, Wallet, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Loan, InterestFrequency, Payment } from './types';

const COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 
  'bg-amber-500', 'bg-rose-500', 'bg-indigo-500',
  'bg-cyan-500', 'bg-fuchsia-500'
];

const FREQUENCIES: { value: InterestFrequency; label: string; days: number }[] = [
  { value: 'daily', label: 'Daily', days: 1 },
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'yearly', label: 'Yearly', days: 365 },
];

export default function App() {
  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('loans');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [isAddingLoan, setIsAddingLoan] = useState(false);

  // Form State
  const [newLoan, setNewLoan] = useState({
    name: '',
    principal: '',
    interestRate: '',
    frequency: 'monthly' as InterestFrequency,
    startDate: new Date().toISOString().split('T')[0],
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    localStorage.setItem('loans', JSON.stringify(loans));
  }, [loans]);

  // Interest calculation logic
  const updateInterest = (loan: Loan): Loan => {
    const now = new Date();
    const lastApplied = new Date(loan.lastInterestAppliedDate);
    const freq = FREQUENCIES.find(f => f.value === loan.frequency)!;
    
    const diffTime = Math.abs(now.getTime() - lastApplied.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const periodsPassed = Math.floor(diffDays / freq.days);
    
    if (periodsPassed > 0) {
      let newBalance = loan.currentBalance;
      const rate = loan.interestRate / 100;
      
      // Compound interest for the periods passed
      for (let i = 0; i < periodsPassed; i++) {
        newBalance = newBalance * (1 + rate);
      }
      
      const newLastAppliedDate = new Date(lastApplied);
      newLastAppliedDate.setDate(newLastAppliedDate.getDate() + (periodsPassed * freq.days));
      
      return {
        ...loan,
        currentBalance: Number(newBalance.toFixed(2)),
        lastInterestAppliedDate: newLastAppliedDate.toISOString(),
      };
    }
    
    return loan;
  };

  // Auto-update interest when loans are loaded or viewed
  useEffect(() => {
    const interval = setInterval(() => {
      setLoans(prev => prev.map(updateInterest));
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoan.name || !newLoan.principal || !newLoan.interestRate) return;

    const startDate = new Date(newLoan.startDate).toISOString();
    const loan: Loan = {
      id: crypto.randomUUID(),
      name: newLoan.name,
      principal: Number(newLoan.principal),
      interestRate: Number(newLoan.interestRate),
      frequency: newLoan.frequency,
      startDate: startDate,
      lastInterestAppliedDate: startDate,
      currentBalance: Number(newLoan.principal),
      payments: [],
      color: COLORS[loans.length % COLORS.length],
    };

    setLoans([...loans, loan]);
    setNewLoan({ 
      name: '', 
      principal: '', 
      interestRate: '', 
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0]
    });
    setIsAddingLoan(false);
    setSelectedLoanId(loan.id);
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId || !paymentForm.amount) return;

    const amount = Number(paymentForm.amount);
    const paymentDate = new Date(paymentForm.date).toISOString();

    setLoans(prev => prev.map(loan => {
      if (loan.id === selectedLoanId) {
        // We don't automatically update interest here if the payment is in the past
        // but for simplicity, we'll keep the current "catch up" logic.
        // If the payment is today, updateInterest(loan) will run.
        const updatedLoan = updateInterest(loan);
        const payment: Payment = {
          id: crypto.randomUUID(),
          amount,
          date: paymentDate,
        };
        return {
          ...updatedLoan,
          currentBalance: Number((updatedLoan.currentBalance - amount).toFixed(2)),
          payments: [payment, ...updatedLoan.payments].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
        };
      }
      return loan;
    }));
    setPaymentForm({
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const deleteLoan = (id: string) => {
    if (confirm('Are you sure you want to delete this loan?')) {
      setLoans(loans.filter(l => l.id !== id));
      if (selectedLoanId === id) setSelectedLoanId(null);
    }
  };

  const selectedLoan = useMemo(() => 
    loans.find(l => l.id === selectedLoanId), 
    [loans, selectedLoanId]
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-600" />
              Payment Tracker
            </h1>
            <button 
              onClick={() => setIsAddingLoan(true)}
              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {loans.length === 0 && !isAddingLoan && (
              <p className="text-sm text-zinc-500 text-center py-8">No loans tracked yet.</p>
            )}
            {loans.map(loan => (
              <button
                key={loan.id}
                onClick={() => {
                  setSelectedLoanId(loan.id);
                  setIsAddingLoan(false);
                }}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selectedLoanId === loan.id 
                    ? 'border-blue-600 bg-white text-zinc-900 shadow-md ring-1 ring-blue-600' 
                    : 'border-zinc-100 bg-zinc-50 hover:bg-zinc-100 text-zinc-900'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold truncate pr-2">{loan.name}</span>
                  <div className={`w-2 h-2 rounded-full ${loan.color.replace('bg-', 'bg-')}`} />
                </div>
                <div className="text-sm opacity-70">
                  ${loan.currentBalance.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-zinc-50 p-6 md:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isAddingLoan ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                <h2 className="text-2xl font-bold mb-6">Create New Loan</h2>
                <form onSubmit={handleAddLoan} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Loan Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Car Loan, Student Loan"
                      className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      value={newLoan.name}
                      onChange={e => setNewLoan({ ...newLoan, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Principal Amount ($)</label>
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                        value={newLoan.principal}
                        onChange={e => setNewLoan({ ...newLoan, principal: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        required
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                        value={newLoan.startDate}
                        onChange={e => setNewLoan({ ...newLoan, startDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="5.0"
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                        value={newLoan.interestRate}
                        onChange={e => setNewLoan({ ...newLoan, interestRate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Interest Frequency</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FREQUENCIES.map(f => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setNewLoan({ ...newLoan, frequency: f.value })}
                          className={`p-2 text-sm rounded-lg border transition-all ${
                            newLoan.frequency === f.value
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-blue-300'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      Create Loan
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingLoan(false)}
                      className="px-6 py-3 rounded-xl font-semibold border border-zinc-200 hover:bg-zinc-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : selectedLoan ? (
            <motion.div
              key={selectedLoan.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {/* Header Card */}
              <div className="p-8 rounded-3xl bg-white text-zinc-900 shadow-sm border border-zinc-100 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className={`w-3 h-3 rounded-full ${selectedLoan.color}`} />
                        <h2 className="text-3xl font-bold">{selectedLoan.name}</h2>
                      </div>
                      <p className="text-zinc-500 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Started {new Date(selectedLoan.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => deleteLoan(selectedLoan.id)}
                      className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-colors rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Current Balance</p>
                      <p className="text-xl font-bold text-blue-600">${selectedLoan.currentBalance.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Interest Rate</p>
                      <p className="text-xl font-bold text-zinc-900 flex items-center gap-1">
                        {selectedLoan.interestRate}%
                        <span className="text-xs font-normal opacity-50">/ {selectedLoan.frequency}</span>
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Original Principal</p>
                      <p className="text-xl font-bold text-blue-600">${selectedLoan.principal.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Balance Remaining Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Balance Remaining</p>
                      <p className="text-sm font-bold text-zinc-900">
                        {Math.max(0, Math.round((selectedLoan.currentBalance / selectedLoan.principal) * 100))}%
                      </p>
                    </div>
                    <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, (selectedLoan.currentBalance / selectedLoan.principal) * 100))}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-blue-600"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                      <span>$0</span>
                      <span>${selectedLoan.principal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Payment Form */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    Make a Payment
                  </h3>
                  <form onSubmit={handlePayment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-2">Amount ($)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">$</span>
                          <input
                            type="number"
                            required
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-lg font-bold"
                            value={paymentForm.amount}
                            onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-500 mb-2">Payment Date</label>
                        <input
                          type="date"
                          required
                          className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-lg"
                          value={paymentForm.date}
                          onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      Process Payment
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                </div>

                {/* Payment History */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <History className="w-5 h-5 text-zinc-400" />
                    Payment History
                  </h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedLoan.payments.length === 0 ? (
                      <p className="text-zinc-400 text-center py-8 italic">No payments made yet.</p>
                    ) : (
                      selectedLoan.payments.map(payment => (
                        <div key={payment.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div>
                            <p className="font-bold text-blue-600">-${payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-zinc-400">{new Date(payment.date).toLocaleDateString()} at {new Date(payment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center">
                <Wallet className="w-12 h-12 text-zinc-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">Welcome to Payment Tracker</h2>
                <p className="text-zinc-500 max-w-sm mx-auto mt-2">Select a loan from the sidebar or create a new one to start tracking your balances and interest.</p>
              </div>
              <button
                onClick={() => setIsAddingLoan(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Add a Loan
              </button>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
