/**
 * Telegram chat with @Costumer24.
 *
 * `#@Costumer24` on Telegram Web K only shows a dead "Send Message" button.
 * Use Telegram Web A's tgaddr deep-link instead: it asks for login when needed,
 * then opens the chat (and prefills the request text).
 */
export const TELEGRAM_ADMIN_HANDLE = 'Costumer24';
export const TELEGRAM_CHAT_URL = `https://web.telegram.org/a/#?tgaddr=${encodeURIComponent(`tg://resolve?domain=${TELEGRAM_ADMIN_HANDLE}`)}`;

function buildTelegramUrl(message = '') {
  const resolveLink = message
    ? `tg://resolve?domain=${TELEGRAM_ADMIN_HANDLE}&text=${encodeURIComponent(message)}`
    : `tg://resolve?domain=${TELEGRAM_ADMIN_HANDLE}`;

  return `https://web.telegram.org/a/#?tgaddr=${encodeURIComponent(resolveLink)}`;
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
