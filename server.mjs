import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message);

    // 他のクライアントにブロードキャストする際に isSelf を false に設定
    const broadcastMessage = JSON.stringify({
      type: parsedMessage.type,
      payload: parsedMessage.payload,
      isSelf: false,
    });

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(broadcastMessage);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Cloud Run は 0.0.0.0:$PORT でリッスンする必要がある
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is listening on port ${PORT}`);
});