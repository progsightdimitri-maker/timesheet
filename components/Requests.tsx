
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RefundRequest, RefundStatus } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, CheckSquare, DollarSign, FileText, Filter } from 'lucide-react';
import * as dbService from '../services/db';

export const Requests: React.FC = () => {
  const { user, isAdmin } = useAuth();
  
  // User Form State
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // List State
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [filter, setFilter] = useState<RefundStatus | 'all'>('all');

  useEffect(() => {
    if (!user) return;

    let unsubscribe: () => void;

    if (isAdmin) {
      // Admin: View ALL
      unsubscribe = dbService.subscribeToAllRefunds(setRequests);
    } else {
      // User: View MINE
      unsubscribe = dbService.subscribeToMyRefunds(user.uid, setRequests);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !reason) return;

    setIsSubmitting(true);
    try {
      await dbService.addRefundRequest(user.uid, parseFloat(amount), reason, user.email || 'Unknown');
      setAmount('');
      setReason('');
    } catch (error) {
      console.error(error);
      alert("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (req: RefundRequest, status: RefundStatus) => {
    if (!isAdmin || !user) return;
    try {
      await dbService.updateRefundStatus(req.userId, req.id, status);
    } catch (error) {
      console.error(error);
      alert("Failed to update status.");
    }
  };

  const getStatusColor = (status: RefundStatus) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: RefundStatus) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckSquare className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  // --- ADMIN VIEW ---
  if (isAdmin) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
             <h2 className="text-2xl font-bold text-gray-900">Refund Requests (Admin)</h2>
             <p className="text-gray-500">Manage refund requests from all users.</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              className="border-gray-300 rounded-md text-sm p-2 bg-white shadow-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{req.userEmail}</div>
                    <div className="text-xs text-gray-400 font-mono">{req.userId.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={req.reason}>
                    {req.reason}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                    ${req.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(req.createdAt, 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1.5 ${getStatusColor(req.status)}`}>
                      {getStatusIcon(req.status)}
                      <span className="capitalize">{req.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {req.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(req, 'approved')}
                          className="text-green-600 hover:bg-green-50 px-3 py-1 rounded text-xs font-medium border border-green-200"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(req, 'rejected')}
                          className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-xs font-medium border border-red-200"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {req.status === 'approved' && (
                       <button 
                         onClick={() => handleStatusUpdate(req, 'completed')}
                         className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-xs font-medium border border-blue-200"
                       >
                         Complete
                       </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- USER VIEW ---
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left: Request Form */}
        <div className="md:col-span-1 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Request Refund</h2>
            <p className="text-gray-500 text-sm">Submit a new refund request.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <Input
              label="Amount ($)"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              icon={<DollarSign className="w-4 h-4" />}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea 
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you requesting this refund?"
                required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Submit Request
            </Button>
          </form>
        </div>

        {/* Right: My Requests List */}
        <div className="md:col-span-2 space-y-6">
           <div>
            <h2 className="text-2xl font-bold text-gray-900">My Requests</h2>
            <p className="text-gray-500 text-sm">History of your refund status.</p>
          </div>

          <div className="space-y-4">
            {requests.length === 0 && (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                 <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                 <p>No refund requests yet.</p>
              </div>
            )}
            {requests.map(req => (
              <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg mt-1 ${
                      req.status === 'approved' ? 'bg-green-100 text-green-600' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      req.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                      'bg-yellow-100 text-yellow-600'
                  }`}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">${req.amount.toFixed(2)}</div>
                    <p className="text-sm text-gray-600">{req.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">{format(req.createdAt, 'PP p')}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                   <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1 ${getStatusColor(req.status)}`}>
                      {getStatusIcon(req.status)}
                      <span className="capitalize">{req.status}</span>
                   </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
