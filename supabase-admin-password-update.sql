-- Ejecutar en Supabase SQL Editor para actualizar la clave del admin Cosme.
-- Nueva contrasena: Cosme2002

update internal_users
set
  password_hash = 'scrypt:16eebd5f478986db75653f1d71cf6cc5:79813cd8195a5195cfe614096265d098c1cad7f51c5d8e2273da992b5bde49fcf7b6b06e05b5181d138303d5d1ae3c5c83df46eb9e3a7445838a06e09f68ae0b',
  is_active = true
where lower(username) = 'cosme';
