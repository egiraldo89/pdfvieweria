# Copilot Instructions for iapdfvisor

Este es un proyecto de Next.js con las siguientes características configuradas:
- TypeScript
- Tailwind CSS
- ESLint
- App Router
- Alias de importación (`@/*`)

## Configuración del Proyecto

### Dependencias Principales
- **next**: Framework React con SSR
- **react**: Librería UI
- **react-dom**: Renderizado en DOM
- **tailwindcss**: Framework CSS utility-first
- **typescript**: Soporte de tipos

### Estructura del Proyecto
```
├── app/                    # Directorio de la aplicación (App Router)
│   ├── layout.tsx         # Layout raíz
│   └── page.tsx           # Página principal
├── public/                # Archivos estáticos
├── .github/               # Configuraciones de GitHub
├── next.config.ts         # Configuración de Next.js
├── tailwind.config.ts     # Configuración de Tailwind
├── tsconfig.json          # Configuración de TypeScript
└── package.json           # Dependencias del proyecto
```

## Instrucciones de Desarrollo

### Comandos Disponibles
- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye el proyecto para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta ESLint para verificar código

## Convenciones del Proyecto

- Usar componentes funcionales con TypeScript
- Seguir las convenciones de naming: PascalCase para componentes, camelCase para funciones
- Mantener componentes pequeños y reutilizables
- Documentar componentes complejos con comentarios
