'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Role } from '@/types'

const ROLE_LABELS: Record<Role, string> = {
  owner:    'Administrador',
  seller:   'Vendedor',
  kitchen:  'Cocina',
  delivery: 'Repartidor',
}

const ROLE_COLORS: Record<Role, { color: string; bg: string }> = {
  owner:    { color: 'var(--primary)',  bg: 'var(--primary-bg)'  },
  seller:   { color: 'var(--info)',     bg: 'var(--info-bg)'     },
  kitchen:  { color: 'var(--warning)',  bg: 'var(--warning-bg)'  },
  delivery: { color: 'var(--success)',  bg: 'var(--success-bg)'  },
}

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'seller' as Role,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingRole, setEditingRole] = useState<string | null>(null)

  async function fetchUsers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('role')
      .order('name')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      setError('Todos los campos son obligatorios')
      return
    }

    setSaving(true)
    setError('')

    const supabase = createClient()

    // Crear usuario en auth con metadata de rol
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          role: form.role,
        },
      },
    })

    if (authError) {
      setError('Error al crear usuario: ' + authError.message)
      setSaving(false)
      return
    }

    // El trigger handle_new_user crea el perfil automáticamente
    // Pero actualizamos por si acaso
    if (data.user) {
      await supabase
        .from('users')
        .update({ name: form.name, role: form.role })
        .eq('id', data.user.id)
    }

    setForm({ name: '', email: '', password: '', role: 'seller' })
    setShowForm(false)
    setSuccess('Usuario creado correctamente')
    setTimeout(() => setSuccess(''), 3000)
    fetchUsers()
    setSaving(false)
  }

  async function handleUpdateRole(userId: string, newRole: Role) {
    const supabase = createClient()
    await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
    setEditingRole(null)
    fetchUsers()
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-1)',
    fontFamily: 'inherit',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 640 }}>

      {success && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success)',
          borderRadius: 10,
          padding: '10px 16px',
          fontSize: 13,
          color: 'var(--success)',
          fontWeight: 600,
          marginBottom: 16,
        }}>
          ✓ {success}
        </div>
      )}

      <button
        onClick={() => { setShowForm(!showForm); setError('') }}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          border: '2px dashed var(--border)',
          borderRadius: 10,
          color: 'var(--primary)',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        + Crear nuevo usuario
      </button>

      {showForm && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            Nuevo usuario
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                Nombre completo
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Juan Pérez"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                Contraseña temporal
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="mínimo 6 caracteres"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                Rol
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => setForm({ ...form, role })}
                    style={{
                      padding: '8px',
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: form.role === role
                        ? ROLE_COLORS[role].color
                        : 'var(--border)',
                      background: form.role === role
                        ? ROLE_COLORS[role].bg
                        : 'transparent',
                      color: form.role === role
                        ? ROLE_COLORS[role].color
                        : 'var(--text-3)',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{
                flex: 1,
                padding: '10px',
                background: 'var(--primary)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-3)',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando usuarios...</div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {users.map((user, index) => {
            const rc = ROLE_COLORS[user.role]
            const isEditing = editingRole === user.id

            return (
              <div
                key={user.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: index < users.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: isEditing ? 10 : 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: rc.bg,
                      border: `1px solid ${rc.color}`,
                      color: rc.color,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: rc.color,
                      background: rc.bg,
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}>
                      {ROLE_LABELS[user.role]}
                    </span>
                    <button
                      onClick={() => setEditingRole(isEditing ? null : user.id)}
                      style={{
                        fontSize: 11,
                        color: 'var(--text-3)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {isEditing ? 'Cancelar' : 'Editar rol'}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleUpdateRole(user.id, role)}
                        style={{
                          padding: '7px',
                          borderRadius: 7,
                          border: '1px solid',
                          borderColor: user.role === role
                            ? ROLE_COLORS[role].color
                            : 'var(--border)',
                          background: user.role === role
                            ? ROLE_COLORS[role].bg
                            : 'transparent',
                          color: user.role === role
                            ? ROLE_COLORS[role].color
                            : 'var(--text-3)',
                          fontFamily: 'inherit',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}