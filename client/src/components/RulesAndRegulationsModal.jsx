import React, { useState } from 'react';
import Modal from './Modal';
import { ScrollText, ShieldAlert, ArrowRight, ArrowLeft, CheckCircle2, FileText } from 'lucide-react';
import logoImg from '../assets/logo.png';
import agreementImg from '../assets/agreement.png';

export const RULES_SESSION_KEY = 'rulesAcceptedForToken';

export default function RulesAndRegulationsModal({ isOpen, onAccept }) {
  const [step, setStep] = useState(0); // 0: Rules, 1: Agreement
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 45;

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && step === 0) {
      setStep(1); // Swipe left -> advance to Agreement
    }
    if (isRightSwipe && step === 1) {
      setStep(0); // Swipe right -> back to Rules
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      hideCloseButton
      title={step === 0 ? "Rules and Regulations" : "Player Agreement"}
      maxWidth="max-w-xl"
    >
      <div
        className="w-full overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-red-100">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Draikola Logo" className="w-7 h-7 object-contain rounded-lg shrink-0" />
            <span className="text-xs font-black text-red-900 uppercase tracking-wide">
              {step === 0 ? 'Step 1 of 2: Platform Rules' : 'Step 2 of 2: Player Agreement'}
            </span>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStep(0)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${step === 0 ? 'w-7 bg-red-600' : 'w-2.5 bg-red-200 hover:bg-red-300'}`}
              title="Step 1: Rules"
            />
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${step === 1 ? 'w-7 bg-red-600' : 'w-2.5 bg-red-200 hover:bg-red-300'}`}
              title="Step 2: Agreement"
            />
          </div>
        </div>

        {/* Sliding 2-Step Track */}
        <div
          className="flex w-[200%] transition-transform duration-300 ease-out"
          style={{ transform: step === 0 ? 'translateX(0%)' : 'translateX(-50%)' }}
        >
          {/* Step 1: Rules & Regulations */}
          <div className="w-1/2 pr-3 space-y-4 font-sans text-slate-800">
            <div className="flex items-start space-x-3 p-3 bg-red-50 border-2 border-red-200 rounded-2xl text-red-900 text-xs font-semibold">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <p>
                Please read these platform rules carefully. Swipe or click continue to review the official agreement.
              </p>
            </div>

            <div className="flex items-center justify-between text-sm font-black text-red-800">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4" />
                <span>Player Terms & Guidelines</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Swipe Left 👉
              </span>
            </div>

            <div className="max-h-[38vh] sm:max-h-[42vh] overflow-y-auto pr-1">
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
            </div>

            {/* Swipe to Agreement Prompt Button */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <span>Swipe to Agreement</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Step 2: Agreement */}
          <div className="w-1/2 pl-3 space-y-3 font-sans text-slate-800">
            <div className="flex items-center justify-between text-sm font-black text-red-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Official Player Agreement</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Rules</span>
              </button>
            </div>

            {/* Agreement Image Document View */}
            <div className="rounded-2xl border-2 border-red-200 overflow-hidden bg-slate-100 shadow-inner">
              <div className="max-h-[46vh] sm:max-h-[50vh] overflow-y-auto p-1.5 flex items-center justify-center">
                <img
                  src={agreementImg}
                  alt="Player Agreement"
                  className="w-full h-auto object-contain rounded-xl shadow-sm"
                  loading="eager"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 font-semibold text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>I confirm that I have read and accepted the Rules and Player Agreement.</span>
            </div>

            {/* Navigation and Agree Button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="w-1/3 py-3 px-2 bg-red-50 hover:bg-red-100 text-red-800 border-2 border-red-200 font-black text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-[0.99] text-center cursor-pointer"
              >
                Rules
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="w-2/3 py-3 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-red-500/25 hover:scale-[1.01] active:scale-[0.99] text-center cursor-pointer"
              >
                I Agree & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
