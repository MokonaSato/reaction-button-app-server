import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map();
const messages = {}; // メッセージを保存するオブジェクトを追加

wss.on('connection', (ws, req) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log('Received message:', message); // ログ出力を追加
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      console.error('Error parsing message:', error);
      return;
    }

    if (parsedMessage.type === 'join') {
      const roomId = parsedMessage.room;
      console.log(`Received join request for room ${roomId}`);

      if (!roomId) {
        ws.send(JSON.stringify({ error: 'Invalid roomId' }));
        return;
      }

      if (!clients.has(roomId)) {
        clients.set(roomId, new Set());
      }
      clients.get(roomId).add(ws);
      ws.send(JSON.stringify({ message: `Joined room ${roomId}` }));
    } else {
      const room = Array.from(clients.entries()).find(([key, value]) => value.has(ws))?.[0];
      if (room) {
        const broadcastMessage = JSON.stringify({
          type: parsedMessage.type,
          payload: parsedMessage.payload,
          roomId: room,
          clientId: parsedMessage.clientId,
          id: parsedMessage.id,
          timestamp: parsedMessage.timestamp,
        });

        // メッセージを保存
        if (!messages[room]) {
          messages[room] = [];
        }
        messages[room].push(parsedMessage);

        clients.get(room).forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
          }
        });
      }
    }
  });

  ws.on('close', () => {
    clients.forEach((clientsSet, room) => {
      if (clientsSet.has(ws)) {
        clientsSet.delete(ws);
        if (clientsSet.size === 0) {
          clients.delete(room);
        }
      }
    });
    console.log('Client disconnected');
  });
});

// /joinエンドポイントで部屋に参加
app.post('/join', express.json(), (req, res) => {
  const { roomId } = req.body;
  console.log(`Received join request for room ${roomId}`);

  if (!roomId) {
    res.status(400).send('Invalid roomId');
    return;
  }

  if (!clients.has(roomId)) {
    clients.set(roomId, new Set());
  }

  // メッセージリストが存在しない場合は作成
  if (!messages[roomId]) {
    messages[roomId] = [];
  }

  res.status(200).send('Joined room');
});

// /chatエンドポイントでWebSocketMessage型のJSON形式でデータを送信
app.post('/chat', express.json(), (req, res) => {
  console.log('Received POST request to /chat'); // ログ出力を追加
  console.log('Request body:', req.body); // ログ出力を追加

  const { roomId, type, payload, clientId, id, timestamp } = req.body;

  console.log(`Received message for room ${roomId}:`, { type, payload, clientId, id, timestamp }); // ログ出力を追加

  if (type && payload && roomId && clientId && id && timestamp) {
    const broadcastMessage = JSON.stringify({
      type,
      payload,
      roomId,
      clientId,
      id,
      timestamp,
    });

    // メッセージを保存
    if (!messages[roomId]) {
      messages[roomId] = [];
    }
    messages[roomId].push({ type, payload, roomId, clientId, id, timestamp });

    let roomFound = false;
    clients.forEach((clientsSet, room) => {
      if (room === roomId) {
        roomFound = true;
        clientsSet.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
          }
        });
      }
    });

    if (roomFound) {
      res.status(200).send('Message broadcasted');
    } else {
      console.log('Room not found:', roomId); // ログ出力を追加
      res.status(404).send('Room not found');
    }
  } else {
    console.log('Invalid message format:', { roomId, type, payload, clientId, id, timestamp }); // ログ出力を追加
    res.status(400).send('Invalid message format');
  }
});

app.get('/chat', (req, res) => {
  const roomId = req.query.room;
  console.log(`Received GET request to /chat with roomId: ${roomId}`); // デバッグログ追加
  if (roomId && messages[roomId]) {
    console.log(`Found messages for roomId: ${roomId}`); // デバッグログ追加
    const latestMessage = messages[roomId].slice(-1)[0]; // 最新の1件を取得
    res.json(latestMessage ? [latestMessage] : []);
  } else {
    res.status(404).send('Room not found');
  }
});

// /helloエンドポイントで疎通確認用にHello World!の文字列を返す
app.get('/hello', (req, res) => {
  res.send('Hello World!');
});

// Cloud Run は 0.0.0.0:$PORT でリッスンする必要がある
const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is listening on port ${PORT}`);
});