-- =============================================================================
-- MIGRACIÓN: AGREGAR RENDIMIENTO DE RECETA Y TIPO DE UNIDAD A PRODUCTOS
-- PROYECTO: CUPCAKES DE ZANAHORIA "EL INGE"
-- =============================================================================

DO $$ 
BEGIN
    -- 1. Agregar columna 'rendimiento_tanda' (ej: 24 para cupcakes, 1 para pastel)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'productos' AND column_name = 'rendimiento_tanda'
    ) THEN
        ALTER TABLE public.productos 
        ADD COLUMN rendimiento_tanda INT NOT NULL DEFAULT 24 CHECK (rendimiento_tanda > 0);
    END IF;

    -- 2. Agregar columna 'tipo_unidad' (ej: 'cupcakes', 'pasteles', 'piezas', 'rebanadas')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'productos' AND column_name = 'tipo_unidad'
    ) THEN
        ALTER TABLE public.productos 
        ADD COLUMN tipo_unidad VARCHAR(50) NOT NULL DEFAULT 'cupcakes';
    END IF;
END $$;

-- 3. INSERTAR O ACTUALIZAR PRODUCTO EJEMPLO: PASTEL DE ZANAHORIA ARTESANAL (Rendimiento = 1 pastel)
INSERT INTO public.productos (id, nombre, descripcion, precio, rendimiento_tanda, tipo_unidad, activo) VALUES
('11111111-1111-1111-1111-111111111102', 'Pastel de Zanahoria Tradicional', 'Pastel artesanal mediano de zanahoria con doble capa de betún de queso crema y nueces', 280, 1, 'pasteles', TRUE)
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio = EXCLUDED.precio,
    rendimiento_tanda = EXCLUDED.rendimiento_tanda,
    tipo_unidad = EXCLUDED.tipo_unidad;

-- Vincular insumos de receta para 1 Pastel
INSERT INTO public.producto_ingredientes (producto_id, ingrediente_id, cantidad_necesaria, unidad_medida) VALUES
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201', 500, 'gr'), -- 500 gr zanahoria
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202', 400, 'gr'), -- 400 gr harina
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222203', 380, 'gr'), -- 2 paquetes queso crema (380 gr)
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222204', 150, 'gr'), -- 150 gr nuez
('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222205', 20, 'gr')   -- 20 gr especias
ON CONFLICT DO NOTHING;
