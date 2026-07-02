'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useThemeStore } from '@/lib/store/themeStore'
import { User } from '@/types'

const ROLE_NAV: Record<string, { href: string; label: string }[]> = {
owner: [
  { href: '/owner',            label: 'Dashboard'  },
  { href: '/owner/orders',     label: 'Pedidos'    },
  { href: '/owner/inventory',  label: 'Inventario' },
  { href: '/owner/recipes',    label: 'Recetas'    },
  { href: '/owner/costs',      label: 'Costos'     },
  { href: '/owner/menu',       label: 'Menú'       },
  { href: '/owner/zones',      label: 'Zonas'      },
  { href: '/owner/reports',    label: 'Reportes'   },
  { href: '/owner/cash',       label: 'Caja'       },
  { href: '/owner/users',      label: 'Usuarios'   },
],
  seller: [
    { href: '/seller',         label: 'Nueva orden' },
    { href: '/seller/orders',  label: 'Mis pedidos' },
    { href: '/seller/cash',    label: 'Caja'        },
  ],
  kitchen: [
    { href: '/kitchen',            label: 'Cola'       },
    { href: '/kitchen/inventory',  label: 'Inventario' },
  ],
  delivery: [
    { href: '/delivery', label: 'Entregas' },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  owner:    'Administrador',
  seller:   'Vendedor',
  kitchen:  'Cocina',
  delivery: 'Repartidor',
}

interface Props {
  user: User
}

export default function Sidebar({ user }: Props) {
  const pathname = usePathname()
  const { theme, setTheme } = useThemeStore()
  const links = ROLE_NAV[user.role] ?? []

  return (
    <aside style={{
      width: 236,
      flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 14px',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>

      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 8px 20px',
      }}>
        <span style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--primary)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          MR
        </span>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
            Mr. Roman
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Gestión interna
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {links.map((link) => {
          const isActive = pathname === link.href ||
            (link.href !== '/owner' &&
             link.href !== '/seller' &&
             link.href !== '/kitchen' &&
             link.href !== '/delivery' &&
             pathname.startsWith(link.href))

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 11px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--info)' : 'var(--text-2)',
                background: isActive ? 'var(--info-bg)' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isActive ? 'var(--info)' : 'var(--border)',
                flexShrink: 0,
              }} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: theme toggle + user */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Theme toggle */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 9,
          padding: 4,
        }}>
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                flex: 1,
                border: 'none',
                cursor: 'pointer',
                padding: '7px',
                borderRadius: 6,
                background: theme === t ? 'var(--surface)' : 'transparent',
                color: theme === t ? 'var(--text-1)' : 'var(--text-3)',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: theme === t ? 600 : 500,
                transition: 'all 0.15s',
              }}
            >
              {t === 'light' ? 'Claro' : 'Oscuro'}
            </button>
          ))}
        </div>

        {/* User info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 6px',
        }}>
          <span style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            fontSize: 11,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <div style={{ lineHeight: 1.15, minWidth: 0 }}>
            <div style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--text-1)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {ROLE_LABELS[user.role]}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}