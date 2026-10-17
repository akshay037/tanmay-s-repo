export const TELEGRAM_ADMIN_HANDLE = 'Costumer24';
export const TELEGRAM_CHAT_URL = `https://t.me/${TELEGRAM_ADMIN_HANDLE}`;

export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function buildTelegramUrl(message = '') {
  const isMobile = isMobileDevice();

  if (isMobile) {
    // Direct native app deep-link: opens Telegram App immediately without the "Send Message" web page
    return message
      ? `tg://resolve?domain=${TELEGRAM_ADMIN_HANDLE}&text=${encodeURIComponent(message)}`
      : `tg://resolve?domain=${TELEGRAM_ADMIN_HANDLE}`;
  }

  // Desktop: opens t.me web gateway
  return message
    ? `https://t.me/${TELEGRAM_ADMIN_HANDLE}?text=${encodeURIComponent(message)}`
    : `https://t.me/${TELEGRAM_ADMIN_HANDLE}`;
}

export function openTelegram(message = '', e = null) {
  if (e && e.preventDefault) {
    e.preventDefault();
  }

  const isMobile = isMobileDevice();
  const appUrl = `tg://resolve?domain=${TELEGRAM_ADMIN_HANDLE}${message ? `&text=${encodeURIComponent(message)}` : ''}`;
  const webUrl = `https://t.me/${TELEGRAM_ADMIN_HANDLE}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

  if (isMobile) {
    let hasLeftPage = false;
    const markOpened = () => { hasLeftPage = true; };

    window.addEventListener('blur', markOpened, { once: true });
    window.addEventListener('pagehide', markOpened, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hasLeftPage = true;
    }, { once: true });

    // 1. Try launching the installed Telegram app directly
    window.location.href = appUrl;

    // 2. Fallback: If app is NOT installed, redirect to web after 1.5 seconds
    setTimeout(() => {
      if (!hasLeftPage && !document.hidden) {
        window.location.href = webUrl;
      }
    }, 1500);
  } else {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  }
}

function getPlayerDetails({ user, meData, currentBalance } = {}) {
  const currentUser = meData?.user || user || meData || {};
  const userId = currentUser.id || 'N/A';
  const username = currentUser.username || 'N/A';
  const fullName = currentUser.name || username;
  const balance = currentBalance !== undefined
    ? currentBalance
    : (meData?.pointAccount?.balance ?? currentUser.balance ?? 0);
  const adminName = meData?.owningAdmin?.username
    || meData?.owningAdmin?.name
    || currentUser.owningAdmin?.username
    || TELEGRAM_ADMIN_HANDLE;

  return { userId, username, fullName, balance, adminName };
}

export function buildTelegramDepositUrl(options = {}) {
  const { userId, username, fullName, balance, adminName } = getPlayerDetails(options);
  const requestedAmount = parseInt(options.requestedAmount, 10);
  const hasAmount = Number.isInteger(requestedAmount) && requestedAmount > 0;

  const message = [
    '📥 DEPOSIT REQUEST (ADD POINTS)',
    '━━━━━━━━━━━━━━━━━━━━━',
    `🆔 User code: ${userId}`,
    `🛡️ Assigned Admin: @${adminName}`,
    `👤 Username ID: @${username}`,
    `🏷️ Name: ${fullName}`,
    `💰 Current Balance: $${Number(balance).toLocaleString()}`,
    hasAmount ? `💵 Requested Amount: $${requestedAmount.toLocaleString()}` : null,
    '━━━━━━━━━━━━━━━━━━━━━',
    hasAmount
      ? `💬 Request: Hello Admin, I would like to deposit $${requestedAmount.toLocaleString()} to add points to my account. Please provide payment details.`
      : '💬 Request: Hello Admin, I would like to deposit funds to add points to my account. Please provide payment details.',
    `⏱️ Time: ${new Date().toLocaleString()}`
  ].filter(Boolean).join('\n');

  return buildTelegramUrl(message);
}

export function buildTelegramWithdrawUrl(options = {}) {
  const { userId, username, fullName, balance, adminName } = getPlayerDetails(options);

  const message = [
    '📤 WITHDRAWAL REQUEST',
    '━━━━━━━━━━━━━━━━━━━━━',
    `🆔 User ID: ${userId}`,
    `👤 Username: @${username}`,
    `🏷️ Name: ${fullName}`,
    `💰 Current Balance: $${Number(balance).toLocaleString()}`,
    `🛡️ Assigned Admin: @${adminName}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '💬 Request: Hello Admin, I would like to withdraw points from my account.',
    `⏱️ Time: ${new Date().toLocaleString()}`
  ].join('\n');

  return buildTelegramUrl(message);
}

export function buildTelegramSupportUrl(options = {}) {
  const { userId, username, fullName, balance, adminName } = getPlayerDetails(options);

  const message = [
    '💬 CHAT WITH CUSTOMER CARE',
    '━━━━━━━━━━━━━━━━━━━━━',
    `🆔 User ID: ${userId}`,
    `👤 Username: @${username}`,
    `🏷️ Name: ${fullName}`,
    `💰 Current Balance: $${Number(balance).toLocaleString()}`,
    `🛡️ Assigned Admin: @${adminName}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '💬 Hello Customer Care, I would like to talk with you regarding my account.',
    `⏱️ Time: ${new Date().toLocaleString()}`
  ].join('\n');

  return buildTelegramUrl(message);
}
