-- =============================================================================
-- ESQUEMA DE BASE DE DATOS POSTGRESQL / SUPABASE (100% EN ESPAÑOL)
-- PROYECTO: CUPCAKES DE ZANAHORIA "EL INGE" (Tuxtla Gutiérrez, Chiapas)
-- =============================================================================

-- Habilitar extensión pgcrypto para UUIDs y Hashes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA: USUARIOS / PERFILES (Clientes y Administrador)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(15) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
    tiros_disponibles INT NOT NULL DEFAULT 0 CHECK (tiros_disponibles >= 0),
    total_cupcakes_comprados INT NOT NULL DEFAULT 0 CHECK (total_cupcakes_comprados >= 0),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: PRODUCTOS (Cupcakes, Pasteles y Variantes)
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio INT DEFAULT 20,
    rendimiento_tanda INT NOT NULL DEFAULT 24 CHECK (rendimiento_tanda > 0), -- ej: 24 para cupcakes, 1 para pastel
    tipo_unidad VARCHAR(50) NOT NULL DEFAULT 'cupcakes', -- ej: 'cupcakes', 'pasteles', 'piezas', 'rebanadas'
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA: INGREDIENTES (Insumos y Materia Prima)
CREATE TABLE IF NOT EXISTS public.ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    proveedor VARCHAR(150),
    precio BIGINT DEFAULT 0,
    cantidad VARCHAR(100),
    cantidad_numerica DECIMAL(10,2) DEFAULT 1.0,
    unidad_medida VARCHAR(50) NOT NULL DEFAULT 'kg', -- 'kg', 'gr', 'litros', 'ml', 'pzas'
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA: PRODUCTO_INGREDIENTES (Recetas)
CREATE TABLE IF NOT EXISTS public.producto_ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES public.productos(id) ON DELETE CASCADE,
    ingrediente_id UUID REFERENCES public.ingredientes(id) ON DELETE CASCADE,
    cantidad_necesaria BIGINT DEFAULT 0,
    unidad_medida VARCHAR(50) DEFAULT 'gr',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA: COMPRAS Y VENTAS
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL, -- NULL si es venta directa no registrada
    nombre_cliente VARCHAR(100) DEFAULT 'Venta Directa',
    producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    cantidad_cupcakes INT,
    monto_total DECIMAL(10,2) NOT NULL CHECK (monto_total >= 0),
    tiros_otorgados INT NOT NULL DEFAULT 0 CHECK (tiros_otorgados >= 0), -- 1 tiro por cada 2 cupcakes
    registrado_por UUID REFERENCES public.usuarios(id),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA: PREMIOS Y PROMOCIONES (CATÁLOGO DE LA RULETA)
CREATE TABLE IF NOT EXISTS public.premios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
    categoria_nivel VARCHAR(30) NOT NULL CHECK (categoria_nivel IN ('sin_premio', 'promocion', 'alto_valor')),
    peso_probabilidad INT NOT NULL DEFAULT 20 CHECK (peso_probabilidad >= 0),
    color_distintivo VARCHAR(10) NOT NULL DEFAULT '#F56B2A',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABLA: CUPONES DE DESCUENTO Y REGALO
CREATE TABLE IF NOT EXISTS public.cupones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) UNIQUE NOT NULL, -- Ej: INGE-7A2B-9F1C
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    premio_id UUID NOT NULL REFERENCES public.premios(id),
    token_qr VARCHAR(100) UNIQUE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'canjeado', 'expirado')),
    fecha_expiracion TIMESTAMPTZ NOT NULL,
    fecha_canje TIMESTAMPTZ,
    canjeado_por UUID REFERENCES public.usuarios(id),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA: CONFIGURACIÓN DEL SISTEMA (KILL SWITCH, STOCK Y PRECIOS)
CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
    clave VARCHAR(50) PRIMARY KEY,
    valor JSONB NOT NULL,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA: HISTORIAL DE JUEGOS / TIRADAS
CREATE TABLE IF NOT EXISTS public.historial_juegos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    tipo_juego VARCHAR(30) NOT NULL DEFAULT 'ruleta' CHECK (tipo_juego IN ('ruleta', 'raspadito', 'tragamonedas')),
    es_ganador BOOLEAN NOT NULL DEFAULT FALSE,
    premio_id UUID REFERENCES public.premios(id),
    cupon_id UUID REFERENCES public.cupones(id),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INSERCIÓN DE DATOS INICIALES (SEMILLA)
-- =============================================================================

-- Parámetros del Negocio El Inge
INSERT INTO public.configuracion_sistema (clave, valor) VALUES
('juegos_habilitados', 'true'::jsonb),
('limite_produccion_diaria', '24'::jsonb),
('stock_actual', '24'::jsonb),
('costo_produccion_cupcake', '6.67'::jsonb),
('precio_venta_cupcake', '20.00'::jsonb)
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

-- Usuario Administrador Inicial: Julian Castro (password: admin123)
INSERT INTO public.usuarios (id, nombre_completo, correo, telefono, password_hash, rol, tiros_disponibles, total_cupcakes_comprados) VALUES
('00000000-0000-0000-0000-000000000001', 'Julian Castro (Admin)', 'admin@cupcakeselinge.com', '9611234567', crypt('admin123', gen_salt('bf')), 'admin', 3, 6)
ON CONFLICT (telefono) DO NOTHING;

-- Catálogo Oficial de Premios de la Ruleta
INSERT INTO public.premios (id, titulo, descripcion, categoria_nivel, peso_probabilidad, color_distintivo, activo) VALUES
('00000000-0000-0000-0000-000000000001', '¡Sigue Intentando! 🥕', '¡Casi lo logras! Sigue disfrutando el mejor sabor artesanal de Tuxtla 🥕', 'sin_premio', 50, '#9E9E9E', TRUE),
('00000000-0000-0000-0000-000000000002', 'Promo: 2x$35 MXN 💸', 'Llévate 2 cupcakes por solo $35 MXN en tu próxima compra (Ahorras $5 MXN)', 'promocion', 20, '#F56B2A', TRUE),
('00000000-0000-0000-0000-000000000003', 'Descuento: $5 MXN 🏷️', '$5 MXN de descuento directo en tu próxima compra de cupcakes', 'promocion', 20, '#F56B2A', TRUE),
('00000000-0000-0000-0000-000000000004', '¡CUPCAKE GRATIS! 🎁', '¡Felicidades! 1 Cupcake de zanahoria gratis en tu próxima compra', 'alto_valor', 5, '#D32F2F', TRUE),
('00000000-0000-0000-0000-000000000005', '1 Cupcake Gratis en Docena 🎁', '1 Cupcake gratis en la compra de 1 docena (12 piezas)', 'alto_valor', 5, '#D32F2F', TRUE)
ON CONFLICT (id) DO UPDATE SET 
    titulo = EXCLUDED.titulo,
    descripcion = EXCLUDED.descripcion,
    categoria_nivel = EXCLUDED.categoria_nivel,
    peso_probabilidad = EXCLUDED.peso_probabilidad,
    color_distintivo = EXCLUDED.color_distintivo,
    activo = EXCLUDED.activo;

-- =============================================================================
-- FUNCIÓN RPC: REGISTRAR COMPRA Y DESCONTAR STOCK (EN ESPAÑOL)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.registrar_compra(
    p_usuario_id UUID,
    p_cantidad INT,
    p_admin_id UUID,
    p_nombre_cliente VARCHAR DEFAULT 'Cliente Mostrador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tiros INT := 0;
    v_total DECIMAL(10,2);
    v_stock_actual INT := 24;
    v_nuevo_stock INT := 24;
    v_es_anonimo BOOLEAN;
BEGIN
    v_es_anonimo := (p_usuario_id IS NULL);
    v_total := p_cantidad * 20.00;
    
    IF NOT v_es_anonimo THEN
        v_tiros := FLOOR(p_cantidad / 2);
    END IF;

    -- 1. Insertar registro de compra
    INSERT INTO public.compras (
        usuario_id,
        nombre_cliente,
        cantidad_cupcakes,
        monto_total,
        tiros_otorgados,
        registrado_por
    ) VALUES (
        p_usuario_id,
        p_nombre_cliente,
        p_cantidad,
        v_total,
        v_tiros,
        p_admin_id
    );

    -- 2. Si es usuario registrado, actualizar saldo de tiros y cupcakes acumulados
    IF NOT v_es_anonimo THEN
        UPDATE public.usuarios
        SET 
            tiros_disponibles = tiros_disponibles + v_tiros,
            total_cupcakes_comprados = total_cupcakes_comprados + p_cantidad,
            fecha_actualizacion = NOW()
        WHERE id = p_usuario_id;
    END IF;

    -- 3. Descontar del stock actual
    SELECT (valor::text)::int INTO v_stock_actual 
    FROM public.configuracion_sistema 
    WHERE clave = 'stock_actual';

    IF v_stock_actual IS NULL THEN
        v_stock_actual := 24;
    END IF;

    v_nuevo_stock := GREATEST(0, v_stock_actual - p_cantidad);

    UPDATE public.configuracion_sistema
    SET valor = to_jsonb(v_nuevo_stock), fecha_actualizacion = NOW()
    WHERE clave = 'stock_actual';

    RETURN jsonb_build_object(
        'exito', TRUE,
        'es_anonimo', v_es_anonimo,
        'tiros_otorgados', v_tiros,
        'monto_total', v_total,
        'stock_restante', v_nuevo_stock
    );
END;
$$;
