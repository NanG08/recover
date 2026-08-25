document.addEventListener('DOMContentLoaded', () => {
  const ws = new WebSocket(`ws://${window.location.host}/ws/audit`);
  const auditBody = document.getElementById('audit-body');
  const metricRecovered = document.getElementById('metric-recovered');
  const metricRate = document.getElementById('metric-rate');
  const metricAvgTime = document.getElementById('metric-avg-time');
  const metricSLA = document.getElementById('metric-sla');

  let totalRecovered = 0;
  let totalAttempts = 0;
  let totalTime = 0;

  ws.onopen = () => console.log('WebSocket connected');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Append row to audit table
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2 text-sm">${new Date().toLocaleTimeString()}</td>
      <td class="px-4 py-2 text-sm">${data.transaction_id}</td>
      <td class="px-4 py-2 text-sm">₹${(data.amount/100).toFixed(2)}</td>
      <td class="px-4 py-2 text-sm">${data.channel}</td>
      <td class="px-4 py-2 text-sm">${data.language}</td>
      <td class="px-4 py-2 text-sm">${data.intent}</td>
      <td class="px-4 py-2 text-sm">${(data.confidence_score*100).toFixed(1)}%</td>
      <td class="px-4 py-2 text-sm">${data.razorpay_api_status}</td>
      <td class="px-4 py-2 text-sm">${data.system_state}</td>
    `;
    auditBody.prepend(row);

    // Update metrics (very naive aggregation)
    totalAttempts += 1;
    if (data.system_state === 'PAYMENT_RESOLVED') {
      totalRecovered += data.amount;
    }
    // For demo, assume each event processing time ~200ms stored elsewhere; using placeholder
    const processingTime = 0.2; // seconds
    totalTime += processingTime;

    metricRecovered.textContent = (totalRecovered/100).toFixed(2);
    metricRate.textContent = ((totalRecovered / (totalAttempts * 100)) * 100).toFixed(1);
    metricAvgTime.textContent = (totalTime / totalAttempts).toFixed(2);
    // SLA check: if processing time < 0.3s show OK else WARN
    metricSLA.textContent = processingTime < 0.3 ? 'OK' : 'WARN';
    metricSLA.className = processingTime < 0.3 ? 'text-xl font-mono text-green-600' : 'text-xl font-mono text-red-600';
  };
  ws.onclose = () => console.log('WebSocket closed');
  ws.onerror = (err) => console.error('WebSocket error', err);
});
