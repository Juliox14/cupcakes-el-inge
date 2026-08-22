import { forwardRef } from 'react'

export const RoulettePointer = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position:        'absolute',
        top:             '50%',
        right:           '-12px',
        transform:       'translateY(-50%)',
        transformOrigin: '76% 50%',
        pointerEvents:   'none',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        zIndex:          10,
      }}
    >
      <img
        src="/zanahoria-puntero.png"
        alt="Puntero Zanahoria"
        style={{
          width:       58,
          height:      58,
          objectFit:   'contain',
          filter:      'drop-shadow(0 2px 5px rgba(0,0,0,0.35))',
        }}
      />
    </div>
  )
})

RoulettePointer.displayName = 'RoulettePointer'
