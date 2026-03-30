<?php
// Permitir peticiones (CORS básico por si acaso)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Si es una preflight request de OPTIONS, salir
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener los datos JSON enviados por fetch (POST)
$data = file_get_contents('php://input');

// Validar que se ha enviado algo
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'No data provided']);
    exit;
}

// Validar que es JSON válido
$json = json_decode($data);
if ($json === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Intentar escribir el archivo data.json (asegurate de que la carpeta tenga permisos de escritura si da error en tu hosting)
$result = file_put_contents('data.json', $data);

if ($result !== false) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write data.json. Check folder permissions in your server.']);
}
?>
