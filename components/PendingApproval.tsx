import React from 'react';
import { Shield, Clock, LogOut, UserX, RefreshCw } from 'lucide-react';

interface PendingApprovalProps {
  onLogout: () => void;
  isDeleted?: boolean;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ onLogout, isDeleted = false }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
         <div className={`absolute top-[20%] right-[20%] w-[400px] h-[400px] rounded-full blur-[100px] ${isDeleted ? 'bg-red-900/10' : 'bg-blue-900/10'}`}></div>
      </div>

      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10 text-center">
        
        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
           {isDeleted ? (
             <UserX className="text-red-500 w-10 h-10" />
           ) : (
             <Shield className="text-blue-500 w-10 h-10" />
           )}
           
           {!isDeleted && (
             <div className="absolute bottom-0 right-0 bg-slate-900 p-1 rounded-full border border-slate-700">
               <Clock className="text-yellow-500 w-5 h-5" />
             </div>
           )}
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          {isDeleted ? 'Account Not Found' : 'Account Pending'}
        </h1>
        
        <p className="text-slate-400 mb-8 leading-relaxed">
          {isDeleted ? (
            <span>
              Your user account appears to have been deleted from the database. 
              <br/>
              Please sign out and create a new account.
            </span>
          ) : (
            <span>
              Your account has been created successfully, but access to this secure map system is restricted.
              <br /><br />
              <span className="text-blue-400 font-semibold bg-blue-900/20 px-2 py-1 rounded">An administrator must approve your account</span> before you can proceed.
            </span>
          )}
        </p>

        <div className="space-y-4">
          {!isDeleted && (
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors border border-slate-700 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} /> Check Status Again
            </button>
          )}
          
          <button 
            onClick={onLogout}
            className={`w-full font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${isDeleted ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <LogOut size={18} /> {isDeleted ? 'Sign Out & Restart' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
};