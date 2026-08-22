-- =============================================================================
-- MIGRACIÓN: AGREGAR CANTIDAD NUMÉRICA Y UNIDAD DE MEDIDA EN INGREDIENTES
-- PROYECTO: CUPCAKES DE ZANAHORIA "EL INGE"
-- =============================================================================

DO $$ 
BEGIN
    -- 1. Agregar columna 'unidad_medida' en ingredientes si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ingredientes' AND column_name = 'unidad_medida'
    ) THEN
        ALTER TABLE public.ingredientes 
        ADD COLUMN unidad_medida VARCHAR(50) NOT NULL DEFAULT 'kg';
    END IF;

    -- 2. Asegurar que 'cantidad_numerica' o 'cantidad' almacene el valor numérico
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ingredientes' AND column_name = 'cantidad_numerica'
    ) THEN
        ALTER TABLE public.ingredientes 
        ADD COLUMN cantidad_numerica DECIMAL(10,2) DEFAULT 1.0;
    END IF;
END $$;

-- 3. ACTUALIZAR O INSERTAR INGREDIENTES CON CANTIDADES Y UNIDADES HOMOGÉNEAS
INSERT INTO public.ingredientes (id, nombre, descripcion, proveedor, precio, cantidad, cantidad_numerica, unidad_medida) VALUES
('22222222-2222-2222-2222-222222222201', 'Zanahoria Fresca', 'Zanahoria fresca rallada', 'Mercado Local San Juan', 18, '1 kg', 1, 'kg'),
('22222222-2222-2222-2222-222222222202', 'Harina de Trigo', 'Harina de trigo todo uso', 'Abarrotes Central', 22, '1 kg', 1, 'kg'),
('22222222-2222-2222-2222-222222222203', 'Queso Crema', 'Queso crema Philadelphia o similar', 'Lácteos del Sur', 45, '190 gr', 190, 'gr'),
('22222222-2222-2222-2222-222222222204', 'Nuez Picada', 'Nuez pecana seleccionada', 'Distribuidora La Semilla', 65, '250 gr', 250, 'gr'),
('22222222-2222-2222-2222-222222222205', 'Canela y Especias', 'Mezcla secreta de canela y nuez moscada', 'Especias Chiapas', 30, '100 gr', 100, 'gr'),
('22222222-2222-2222-2222-222222222206', 'Aceite Vegetal', 'Aceite para repostería', 'Abarrotes Central', 38, '1 litro', 1, 'litros'),
('22222222-2222-2222-2222-222222222207', 'Huevos Frescos', 'Huevo blanco de granja', 'Avícola Tuxtla', 40, '12 pzas', 12, 'pzas')
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    proveedor = EXCLUDED.proveedor,
    precio = EXCLUDED.precio,
    cantidad = EXCLUDED.cantidad,
    cantidad_numerica = EXCLUDED.cantidad_numerica,
    unidad_medida = EXCLUDED.unidad_medida;
