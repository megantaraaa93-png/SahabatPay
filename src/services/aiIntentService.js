
const INTENT_TO_COMMAND = {
  OPEN_DASHBOARD: 'dashboard',
  OPEN_TOPUP: 'isi saldo',
  OPEN_TRANSFER: 'transfer',
  OPEN_QRIS: 'qris',
  OPEN_HISTORY: 'riwayat',
  OPEN_PROFILE: 'profil',
  OPEN_RECIPIENTS: 'daftar penerima',
  OPEN_ACCESSIBILITY: 'aksesibilitas',
  CHECK_BALANCE: 'cek saldo',
  READ_LAST_TRANSACTION: 'transaksi terakhir',
  HELP_CURRENT_PAGE: 'bantuan',
  GO_BACK: 'dashboard',
};

export async function interpretVoiceIntent(text) {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error('AI assistant tidak dapat dihubungi.');
  }

  const data = await response.json();
  const command = INTENT_TO_COMMAND[data.intent];

  if (!command) return null;

  return {
    intent: data.intent,
    command,
  };
}
