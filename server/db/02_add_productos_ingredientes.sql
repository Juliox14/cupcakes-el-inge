-- =============================================================================
-- MIGRACIÓN: AÑADIR TABLAS DE PRODUCTOS, INGREDIENTES Y PRODUCTOS_INGREDIENTES
-- PROYECTO: CUPCAKES DE ZANAHORIA "EL INGE"
-- =============================================================================

-- 1. TABLA: PRODUCTOS (Cupcakes de Zanahoria y Variantes)
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio INT DEFAULT 20, -- o DECIMAL(10,2)
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: INGREDIENTES (Materia Prima e Insumos)
CREATE TABLE IF NOT EXISTS public.ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    proveedor VARCHAR(150),
    precio BIGINT DEFAULT 0, -- Costo del insumo
    cantidad VARCHAR(100), -- Presentación / contenido del paquete (ej: "1 kg", "500 ml", "1 pza")
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA: PRODUCTO_INGREDIENTES (Receta / Relación Muchos a Muchos)
CREATE TABLE IF NOT EXISTS public.producto_ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES public.productos(id) ON DELETE CASCADE,
    ingrediente_id UUID REFERENCES public.ingredientes(id) ON DELETE CASCADE,
    cantidad_necesaria BIGINT DEFAULT 0, -- Cantidad de insumo por unidad o lote
    unidad_medida VARCHAR(50) DEFAULT 'gr', -- 'gr', 'ml', 'pza', 'cda', etc.
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AGREGAR COLUMNAS FORÁNEAS A TABLAS EXISTENTES
DO $$ 
BEGIN
    -- Relación en 'premios' -> producto_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'premios' AND column_name = 'producto_id'
    ) THEN
        ALTER TABLE public.premios 
        ADD COLUMN producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL;
    END IF;

    -- Relación en 'compras' -> producto_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'compras' AND column_name = 'producto_id'
    ) THEN
        ALTER TABLE public.compras 
        ADD COLUMN producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL;
    END IF;
    
    -- Alias/columna 'cantidad' en 'compras' (si aún no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'compras' AND column_name = 'cantidad'
    ) THEN
        ALTER TABLE public.compras 
        ADD COLUMN cantidad INT;
        
        -- Sincronizar cantidad inicial desde cantidad_cupcakes
        UPDATE public.compras SET cantidad = cantidad_cupcakes WHERE cantidad IS NULL;
    END IF;
END $$;

-- 5. INSERTAR PRODUCTO PRINCIPAL POR DEFECTO: CUPCAKE DE ZANAHORIA TRADICIONAL
INSERT INTO public.productos (id, nombre, descripcion, precio, activo) VALUES
('11111111-1111-1111-1111-111111111111', 'Cupcake de Zanahoria Artesanal', 'Receta original de zanahoria con especias finas, nuez y betún de queso crema', 20, TRUE)
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    precio = EXCLUDED.precio;

-- Vincular compras y premios existentes al producto tradicional
UPDATE public.compras SET producto_id = '11111111-1111-1111-1111-111111111111' WHERE producto_id IS NULL;
UPDATE public.premios SET producto_id = '11111111-1111-1111-1111-111111111111' WHERE categoria_nivel != 'sin_premio' AND producto_id IS NULL;

-- 6. INSERTAR INGREDIENTES BASE DE EJEMPLO
INSERT INTO public.ingredientes (id, nombre, descripcion, proveedor, precio, cantidad) VALUES
('22222222-2222-2222-2222-222222222201', 'Zanahoria Fresca', 'Zanahoria rallada de primera calidad', 'Mercado Local San Juan', 18, '1 kg'),
('22222222-2222-2222-2222-222222222202', 'Harina de Trigo', 'Harina de trigo todo uso', 'Abarrotes Central', 22, '1 kg'),
('22222222-2222-2222-2222-222222222203', 'Queso Crema', 'Queso crema para betún y cobertura', 'Lácteos del Sur', 45, '190 gr'),
('22222222-2222-2222-2222-222222222204', 'Nuez Picada', 'Nuez pecana seleccionada', 'Distribuidora La Semilla', 65, '250 gr'),
('22222222-2222-2222-2222-222222222205', 'Canela y Especias', 'Mezcla secreta de canela molida y nuez moscada', 'Especias Chiapas', 30, '100 gr')
ON CONFLICT (id) DO NOTHING;

-- 7. VINCULAR INGREDIENTES AL CUPCAKE ARTESANAL (RECETA)
INSERT INTO public.producto_ingredientes (producto_id, ingrediente_id, cantidad_necesaria, unidad_medida) VALUES
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 35, 'gr'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', 30, 'gr'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', 15, 'gr'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222204', 10, 'gr'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222205', 3, 'gr')
ON CONFLICT DO NOTHING;
