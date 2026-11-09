// M0 fixture only: one fixed daily slot, no business scheduler or persistence.
export function locate(epochMs, duration = Infinity) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(epochMs).map(p => [p.type, p.value]));
  const seconds = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second) + ((epochMs % 1000 + 1000) % 1000) / 1000;
  const offset = seconds - 9 * 3600;
  return { active: seconds >= 9 * 3600 && seconds < 10 * 3600 && offset < duration, offset };
}
