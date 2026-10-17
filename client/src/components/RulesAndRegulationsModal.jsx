import React from 'react';
import Modal from './Modal';
import { ScrollText, ShieldAlert } from 'lucide-react';

export const RULES_SESSION_KEY = 'rulesAcceptedForToken';

export default function RulesAndRegulationsModal({ isOpen, onAccept }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      hideCloseButton
      title="Rules and Regulations"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 font-sans text-slate-800">
        <div className="flex items-start space-x-3 p-3 bg-red-50 border-2 border-red-200 rounded-2xl text-red-900 text-xs font-semibold">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          <p>
            Please read and accept these rules before you play. You will need to accept them again each time you log in.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm font-black text-red-800">
          <ScrollText className="w-4 h-4" />
          <span>Player Terms</span>
        </div>

        <ul className="space-y-2.5 text-xs text-slate-700 font-medium leading-relaxed list-disc pl-5">
          <li>Points are for entertainment play only and have no cash value unless your admin says otherwise.</li>
          <li>You must be 18 or older to use this platform.</li>
          <li>All bets are final once a round starts. Wins and losses are recorded on the ledger immediately.</li>
          <li>Fair play is required. Cheating, exploiting bugs, or using multiple accounts can lead to a freeze.</li>
          <li>Request deposits and withdrawals only through the official Telegram links provided in the app.</li>
          <li>Your admin controls point allocations. Balance disputes should be raised with them first.</li>
          <li>The house may pause games, reverse clearly erroneous rounds, or update these rules at any time.</li>
          <li>Play responsibly. If you need a break, log out and step away.</li>
        </ul>

        <button
          type="button"
          onClick={onAccept}
          className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-red-500/25 hover:scale-[1.01] active:scale-[0.99]"
        >
          I Agree & Continue
        </button>
      </div>
    </Modal>
  );
}
