// Server-Sent Events broker
const clients = new Set();

function addClient(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write('retry: 3000\n\n');
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

function broadcast(event, payload) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    try { c.write(data); } catch (_) { clients.delete(c); }
  }
}

module.exports = { addClient, broadcast };
