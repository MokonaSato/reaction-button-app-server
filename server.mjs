import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8000 });

wss.on('connection', function connection(ws) {
  ws.on('message', function message(message) {
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
});

console.log('WebSocket server is running on ws://127.0.0.1:8000');
