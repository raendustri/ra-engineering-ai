export function monthStartUTC(now = new Date()) {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
}

export function sumCosts(pageBuckets) {
  return pageBuckets.reduce((total, bucket) => total + (bucket.results || []).reduce((subtotal, row) => {
    if (row?.amount?.currency !== 'usd') return subtotal;
    const v = Number(row.amount.value);
    return subtotal + (Number.isFinite(v) ? v : 0);
  }, 0), 0);
}

export function sumUsage(pageBuckets) {
  return pageBuckets.reduce((acc, bucket) => {
    for (const row of bucket.results || []) {
      acc.input += Number(row.input_tokens) || 0;
      acc.output += Number(row.output_tokens) || 0;
      acc.cached += Number(row.input_cached_tokens) || 0;
      acc.requests += Number(row.num_model_requests) || 0;
    }
    return acc;
  }, {input:0, output:0, cached:0, requests:0});
}

export function dailyUsage(pageBuckets) {
  const daily = new Map();
  for (const b of pageBuckets) {
    const date = new Date(b.start_time * 1000).toISOString().slice(0,10);
    const old = daily.get(date) || {date, input:0, output:0};
    for (const r of b.results || []) {
      old.input += Number(r.input_tokens) || 0;
      old.output += Number(r.output_tokens) || 0;
    }
    daily.set(date,old);
  }
  return [...daily.values()].sort((a,b) => a.date.localeCompare(b.date));
}