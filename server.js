// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');

// --- Configuración ---
const MONGO_URI = 'mongodb+srv://cesarpinillos75:HuapayaCorazon123@prueba.9rvsuqg.mongodb.net/smart-home'; // Base de datos especificada
const PORT = 8080;

// --- Esquema y modelo Mongoose ---
const luzSchema = new mongoose.Schema({
  tipo: String,       // "ALARM" o "INITIAL_STATUS"
  cuadra: String,
  estado: String,     // "ENCENDIDA" o "APAGADA"
  timestamp: { type: Date, default: Date.now }
});

const Luz = mongoose.model('Luz', luzSchema);

// --- Inicializar Express ---
const app = express();
app.use(cors());
app.use(express.json());

// --- Servir archivos estáticos ---
app.use(express.static(__dirname));

// --- Crear servidor HTTP y WebSocket ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/lights' });

// --- Conectar a MongoDB ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error MongoDB:', err));

// --- Manejo de conexiones WebSocket ---
wss.on('connection', (ws, req) => {
  console.log(`Cliente WebSocket conectado. Total conexiones: ${wss.clients.size}`);

  // Enviar estado actual al cliente recién conectado
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Conectado al servidor Smart Home',
    totalClients: wss.clients.size
  }));

  ws.on('message', async (message) => {
    console.log('Mensaje recibido:', message.toString());

    try {
      const data = JSON.parse(message.toString());

      // Validar estructura básica
      if (!data.type || !data.cuadra || !data.estado) {
        console.warn('Mensaje con formato inválido');
        return;
      }

      // TEMPORAL: Comentar MongoDB hasta solucionar conexión
      /*
      // Guardar en MongoDB
      const luz = new Luz({
        tipo: data.type,
        cuadra: data.cuadra,
        estado: data.estado
      });

      await luz.save();
      */
      console.log('Estado recibido (MongoDB deshabilitado temporalmente):', { tipo: data.type, cuadra: data.cuadra, estado: data.estado });

      // Enviar confirmación al cliente que envió
      ws.send(JSON.stringify({ status: 'ok', received: data }));

      // Broadcast: enviar datos a TODOS los otros clientes conectados
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'update',
            data: {
              tipo: data.type,
              cuadra: data.cuadra,
              estado: data.estado,
              timestamp: new Date()
            }
          }));
        }
      });

      console.log(`Datos enviados a ${wss.clients.size - 1} clientes conectados`);

    } catch (error) {
      console.error('Error procesando mensaje:', error);
      ws.send(JSON.stringify({ status: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    console.log(`Cliente WebSocket desconectado. Total conexiones: ${wss.clients.size}`);
  });
});

// --- API REST para obtener estados ---
app.get('/api/luces', async (req, res) => {
  // TEMPORAL: MongoDB deshabilitado
  res.json({ 
    message: "MongoDB temporalmente deshabilitado", 
    datos: [] 
  });
  /*
  try {
    // Obtener últimos 100 registros ordenados por fecha descendente
    const luces = await Luz.find().sort({ timestamp: -1 }).limit(100);
    res.json(luces);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
  */
});

// --- API REST para obtener últimos estados por cuadra ---
app.get('/api/luces/estado-actual', async (req, res) => {
  // TEMPORAL: Devolver datos vacíos
  res.json([]);
  /*
  try {
    const pipeline = [
      { $sort: { timestamp: -1 } },
      { 
        $group: {
          _id: '$cuadra',
          ultimoEstado: { $first: '$estado' },
          ultimaActualizacion: { $first: '$timestamp' },
          tipo: { $first: '$tipo' }
        }
      }
    ];

    const estadosActuales = await Luz.aggregate(pipeline);
    
    const resultado = estadosActuales.map(item => ({
      cuadra: item._id,
      estado: item.ultimoEstado,
      timestamp: item.ultimaActualizacion,
      tipo: item.tipo
    }));

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estados actuales' });
  }
  */
});

// --- API REST para guardar estados ---
app.post('/api/luces', async (req, res) => {
  try {
    const { tipo, cuadra, estado } = req.body;

    // Validar que los campos existan
    if (!tipo || !cuadra || !estado) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: tipo, cuadra, estado' 
      });
    }

    // Crear y guardar en MongoDB
    const luz = new Luz({
      tipo: tipo,
      cuadra: cuadra,
      estado: estado
    });

    const luzGuardada = await luz.save();
    
    res.status(201).json({
      success: true,
      message: 'Estado guardado correctamente',
      data: luzGuardada
    });

  } catch (error) {
    console.error('Error al guardar:', error);
    res.status(500).json({ 
      error: 'Error al guardar en la base de datos',
      details: error.message 
    });
  }
});

// --- Iniciar servidor ---
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`WebSocket disponible en ws://localhost:${PORT}/ws/lights`);
});