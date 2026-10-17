import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import {
  LayoutDashboard,
  Shield,
  Users,
  Send,
  GitPullRequest,
  History,
  BarChart3,
  FileCheck,
  UserCheck,
  KeyRound,
  Gamepad2,
  Sparkles,
  RotateCcw,
  Rocket,
  Layers,
  Dices,
  Flame,
  Headphones,
  Wallet,
  ArrowUpFromLine,
  LogOut,
  X
} from 'lucide-react';
import { buildTelegramDepositUrl, buildTelegramWithdrawUrl, buildTelegramSupportUrl } from '../utils/telegram';
import logoImg from '../assets/logo.png';

export default function Sidebar({ currentTab, setCurrentTab, isOpen, onClose }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  if (!user) return null;

  const role = user.role;

  let menuItems = [];

  if (role === 'SUPER_ADMIN') {
    menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'admins', label: 'Admin Management', icon: Shield },
      { id: 'all-users', label: 'All Users', icon: Users },
      { id: 'point-allocation', label: 'Point Allocation', icon: Send },
      { id: 'point-requests', label: 'Point Requests', icon: GitPullRequest },
      { id: 'transactions', label: 'Transactions', icon: History },
      { id: 'reports', label: 'System Reports', icon: BarChart3 },
      { id: 'audit-logs', label: 'Audit Logs', icon: FileCheck },
      { id: 'profile', label: 'Profile', icon: UserCheck }
    ];
  } else if (role === 'ADMIN') {
    menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'my-users', label: 'My Users', icon: Users },
      { id: 'distribute-points', label: 'Distribute Points', icon: Send },
      { id: 'withdraw-requests', label: 'Withdrawal Requests', icon: ArrowUpFromLine },
      { id: 'point-requests', label: 'Point Requests', icon: GitPullRequest },
      { id: 'transactions', label: 'Transactions', icon: History },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'profile', label: 'Profile', icon: UserCheck }
    ];
  } else if (role === 'USER') {
    menuItems = [
      { id: 'casino', label: 'Casino Lobby', icon: Gamepad2 },
      { id: 'lotto', label: 'Lotto 99', icon: Flame },
      { id: 'slots', label: '777 Slots', icon: Sparkles },
      { id: 'roulette', label: 'Vegas Roulette', icon: RotateCcw },
      { id: 'crash', label: 'Crash Rocket', icon: Rocket },
      { id: 'blackjack', label: 'Blackjack 21', icon: Layers },
      { id: 'dice', label: 'Crypto Dice', icon: Dices },
      { id: 'balance-history', label: 'Balance & History', icon: Wallet }
    ];
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r-2 border-red-100 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } pt-16 flex flex-col shadow-md`}
      >
        {/* Sidebar Brand & User Block */}
        <div className="px-4 py-3 border-b-2 border-red-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain rounded-xl shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-black text-red-800 tracking-tight block truncate">Draikola</span>
                <span className="text-[9px] uppercase tracking-wider text-red-600 font-bold block">Red Edition</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors shrink-0"
              title="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-red-50/80 border border-red-200/80 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">{user.name || user.username}</p>
              <p className="text-[11px] font-semibold text-red-700 truncate">@{user.username}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/25'
                    : 'text-slate-600 hover:text-red-700 hover:bg-red-50/80'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-600'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {role === 'USER' && (
          <div className="p-3.5 mx-3 mb-2 rounded-2xl bg-gradient-to-br from-red-50 via-white to-red-50 border-2 border-red-200 text-center space-y-2 shadow-sm shrink-0">
            <div className="flex items-center justify-center space-x-1.5">
              <Headphones className="w-3.5 h-3.5 text-red-600" />
              <p className="text-xs font-black text-red-800">Chat with us customer care</p>
            </div>
            <a
              href={buildTelegramSupportUrl({ user })}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black shadow-md shadow-red-500/20 border border-red-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Talk to Customer Care on Telegram"
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.965z" />
              </svg>
              <span>Talk</span>
            </a>
          </div>
        )}

        {/* Logout Button at the Last of Sidebar */}
        <div className="p-3 border-t-2 border-red-100 space-y-2 shrink-0">
          <button
            onClick={() => {
              if (onClose) onClose();
              dispatch(logout());
            }}
            className="w-full flex items-center justify-center space-x-2.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold text-red-600 hover:text-white bg-red-50 hover:bg-gradient-to-r hover:from-red-600 hover:to-rose-600 border-2 border-red-200 hover:border-transparent transition-all shadow-sm active:scale-95 group cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>Logout</span>
          </button>

          <div className="text-[11px] text-slate-400 font-semibold text-center">
            Draikola &copy; 2017. Red Edition.
          </div>
        </div>
      </aside>
    </>
  );
}
