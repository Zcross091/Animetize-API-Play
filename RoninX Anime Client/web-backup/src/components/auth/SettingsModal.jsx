import React from 'react';
import { X, Settings } from 'lucide-react';

export function SettingsModal({
  settingsModalOpen,
  setSettingsModalOpen,
  newPassword,
  setNewPassword,
  isUpdatingPassword,
  passwordUpdateMessage,
  setPasswordUpdateMessage,
  handlePasswordUpdate,
}) {
  if (!settingsModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl p-6 border border-white/10 relative">
        <button 
          onClick={() => {
            setSettingsModalOpen(false);
            setPasswordUpdateMessage('');
            setNewPassword('');
          }}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
          <Settings size={24} className="text-accent" /> Settings
        </h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Change Password</h3>
            <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-3">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
              />
              <button 
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-3 bg-accent hover:bg-accent/80 text-white rounded-xl font-bold transition-colors border-none cursor-pointer disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
              {passwordUpdateMessage && (
                <div className={`text-sm text-center ${passwordUpdateMessage.includes('success') ? 'text-green-400' : 'text-accent'}`}>
                  {passwordUpdateMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
