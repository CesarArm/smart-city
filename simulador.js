// simulador.js - Simula sensores IoT enviando datos
const WebSocket = require('ws');

const CUADRAS = ['Cuadra-A', 'Cuadra-B', 'Cuadra-C', 'Cuadra-D', 'Cuadra-E'];
const TIPOS = ['ALARM', 'INITIAL_STATUS'];
const ESTADOS = ['ENCENDIDA', 'APAGADA'];

let ws = null;
let intervalo = null;

function conectarSimulador() {
    ws = new WebSocket('ws://localhost:8080/ws/lights');
    
    ws.on('open', () => {
        console.log('🔌 Simulador conectado al servidor');
        iniciarSimulacion();
    });
    
    ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.status === 'ok') {
            console.log('✅ Datos enviados correctamente');
        }
    });
    
    ws.on('close', () => {
        console.log('❌ Simulador desconectado');
        if (intervalo) {
            clearInterval(intervalo);
        }
    });
    
    ws.on('error', (error) => {
        console.error('Error de conexión:', error.message);
    });
}

function enviarDatoAleatorio() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const cuadra = CUADRAS[Math.floor(Math.random() * CUADRAS.length)];
        const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
        
        // 80% probabilidad de estar encendida, 20% apagada (más realista)
        const estado = Math.random() < 0.8 ? 'ENCENDIDA' : 'APAGADA';
        
        const datos = {
            type: tipo,
            cuadra: cuadra,
            estado: estado
        };
        
        ws.send(JSON.stringify(datos));
        console.log(`📡 Enviado: ${cuadra} -> ${estado} (${tipo})`);
    }
}

function simularFalla() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const cuadra = CUADRAS[Math.floor(Math.random() * CUADRAS.length)];
        
        const datos = {
            type: 'ALARM',
            cuadra: cuadra,
            estado: 'APAGADA'
        };
        
        ws.send(JSON.stringify(datos));
        console.log(`⚠️  SIMULANDO FALLA: ${cuadra} -> APAGADA`);
    }
}

function iniciarSimulacion() {
    console.log('🚀 Iniciando simulación de datos...');
    
    // Enviar datos cada 3-8 segundos
    intervalo = setInterval(() => {
        enviarDatoAleatorio();
    }, Math.random() * 5000 + 3000);
    
    // Simular fallas ocasionales (cada 30-60 segundos)
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% probabilidad
            simularFalla();
        }
    }, Math.random() * 30000 + 30000);
    
    // Enviar estados iniciales para todas las cuadras
    setTimeout(() => {
        CUADRAS.forEach((cuadra, index) => {
            setTimeout(() => {
                const datos = {
                    type: 'INITIAL_STATUS',
                    cuadra: cuadra,
                    estado: Math.random() < 0.8 ? 'ENCENDIDA' : 'APAGADA'
                };
                
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(datos));
                    console.log(`🏠 Estado inicial: ${cuadra} -> ${datos.estado}`);
                }
            }, index * 1000);
        });
    }, 2000);
}

function detenerSimulacion() {
    if (intervalo) {
        clearInterval(intervalo);
        console.log('⏹️  Simulación detenida');
    }
    
    if (ws) {
        ws.close();
    }
}

// Manejar Ctrl+C para cerrar limpiamente
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo simulador...');
    detenerSimulacion();
    process.exit(0);
});

// Iniciar simulador
console.log('🏠 Simulador Smart Home v1.0');
console.log('📡 Conectando al servidor...');
conectarSimulador();
