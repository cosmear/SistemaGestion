-- EJECUTAR ESTO EN EL SQL EDITOR DE SU PANEL DE SUPABASE SÓLO UNA VEZ 🚀 --

-- 1. Añadimnos nuevas columnas de contacto a la tabla actual de clientes.
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;

-- 2. Creamos la tabla que resguarda el usuario y contraseña del Cliente para el Login
CREATE TABLE IF NOT EXISTS client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Creamos "El Buzón" (Los Casos de soporte o Tickets)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open', -- open = Pendiente/No resuelto | closed = Resuelto
    classification TEXT, -- Solo lo verán Nacho y Cosme para ordenar administrativamente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
