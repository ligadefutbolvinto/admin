import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import DelegateForm from './components/DelegateForm';
import DelegateList from './components/DelegateList';
import { 
  Lock, 
  Mail, 
  Key, 
  LogOut, 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Loader2,
  AlertCircle,
  Trophy
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Estadísticas globales del panel
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    cobertura: '0 de 0 equipos'
  });
  
  // Trigger para refrescar la lista de delegados
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Escuchar el estado de autenticación de Supabase
  useEffect(() => {
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      validateAdminSession(session);
    });

    // 2. Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      validateAdminSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Validar que el usuario autenticado sea estrictamente el administrador
  const validateAdminSession = async (currentSession) => {
    if (currentSession) {
      const email = currentSession.user?.email;
      if (email === 'admin@ligadefutbolvinto.com') {
        setSession(currentSession);
        fetchStats();
      } else {
        // Si no es el administrador, forzar el cierre de sesión inmediatamente
        console.warn('Usuario no autorizado en este panel. Cerrando sesión.');
        await supabase.auth.signOut();
        setSession(null);
        setAuthError('Acceso denegado: Este panel es exclusivo para el administrador.');
      }
    } else {
      setSession(null);
    }
    setCheckingAuth(false);
  };

  // Cargar estadísticas en tiempo real
  const fetchStats = async () => {
    try {
      // Obtener delegados
      const { data: delegadosData, error: delError } = await supabase
        .from('delegados')
        .select('user_id, estado_cuenta, equipo_id');

      if (delError) throw delError;

      // Obtener equipos
      const { data: equiposData, error: eqError } = await supabase
        .from('equipos')
        .select('id');

      if (eqError) throw eqError;

      const delegadosList = delegadosData || [];
      const totalEquipos = equiposData?.length || 0;

      const total = delegadosList.length;
      const activos = delegadosList.filter(d => d.estado_cuenta === 'activo').length;
      const inactivos = delegadosList.filter(d => d.estado_cuenta === 'inactivo').length;

      // Calcular cuántos equipos únicos tienen delegado asignado
      const equiposConDelegado = new Set(delegadosList.map(d => d.equipo_id)).size;

      setStats({
        total,
        activos,
        inactivos,
        cobertura: `${equiposConDelegado} de ${totalEquipos} equipos`
      });
    } catch (err) {
      console.error('Error al calcular estadísticas:', err);
    }
  };

  // Escuchar eventos para refrescar la lista y estadísticas
  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchStats();
  };

  // Manejar el inicio de sesión del Administrador (con lógica auto-sanable)
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);

    // Validación estricta en el cliente
    if (loginEmail.trim() !== 'admin@ligadefutbolvinto.com') {
      setAuthError('Acceso denegado: Usuario administrador incorrecto.');
      return;
    }

    if (!loginPassword) {
      setAuthError('Por favor ingresa la contraseña.');
      return;
    }

    try {
      setAuthLoading(true);

      // 1. Intentar iniciar sesión en Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      });

      if (error) {
        // 2. Lógica auto-sanable (Self-Healing): Si las credenciales son correctas pero el usuario no existe en Auth, lo creamos.
        if (
          loginEmail.trim() === 'admin@ligadefutbolvinto.com' && 
          loginPassword === 'admin2026' && 
          (error.message.includes('Invalid login credentials') || error.status === 400)
        ) {
          console.log('Inicializando cuenta de administrador por primera vez...');
          
          // Crear el usuario administrador en el sistema
          const { error: signUpError } = await supabase.auth.signUp({
            email: loginEmail.trim(),
            password: loginPassword,
            options: {
              data: {
                display_name: 'Administrador Vinto',
                role: 'admin'
              }
            }
          });

          if (signUpError) throw signUpError;

          // Intentar iniciar sesión nuevamente tras el registro automático
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: loginEmail.trim(),
            password: loginPassword
          });

          if (retryError) throw retryError;
          
          validateAdminSession(retryData.session);
          return;
        }

        // Si es otro error o la contraseña no coincide con la maestra, mostrar error
        throw error;
      }

      validateAdminSession(data.session);
    } catch (err) {
      console.error('Error en autenticación:', err);
      setAuthError(err.message === 'Invalid login credentials' 
        ? 'Contraseña de administrador incorrecta.' 
        : err.message || 'Error al conectar con el servidor de autenticación.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    try {
      setCheckingAuth(true);
      await supabase.auth.signOut();
      setSession(null);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Pantalla de carga inicial mientras valida la sesión
  if (checkingAuth) {
    return (
      <div className="auth-overlay">
        <div style={{ textAlignment: 'center', color: 'var(--text-primary)' }}>
          <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--primary)' }} />
          <p style={{ fontFamily: 'var(--font-title)', fontWeight: 500 }}>Cargando Panel de Administración...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar el diálogo de login obligatorio
  if (!session) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-header">
            <img src="/logo.png" alt="Liga de Fútbol Vinto" className="auth-logo" />
            <h1 className="auth-title">Liga de Fútbol Vinto</h1>
            <p className="auth-subtitle">Panel Central de Administración</p>
          </div>

          {authError && (
            <div className="alert alert-error">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Usuario Administrador</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  className="form-input has-icon"
                  placeholder="admin@ligadefutbolvinto.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={authLoading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Key size={18} />
                </span>
                <input
                  type="password"
                  className="form-input has-icon"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={authLoading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={authLoading}
              style={{ marginTop: '1.5rem' }}
            >
              {authLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Iniciando Sesión...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Ingresar al Panel
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Panel de administración principal (visible solo tras autenticación exitosa)
  return (
    <div className="app-container">
      {/* Barra de Navegación Premium */}
      <nav className="navbar">
        <div className="nav-brand">
          <img src="/logo.png" alt="Logo Liga Vinto" className="nav-logo" />
          <div className="nav-title">
            LIGA DE FÚTBOL <span>VINTO</span>
          </div>
        </div>

        <div className="nav-user">
          <span className="nav-user-info">
            Administrador Central
          </span>
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', width: 'auto', gap: '0.35rem' }}
          >
            <LogOut size={14} />
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="main-content">
        {/* Cabecera del Panel */}
        <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
            <Trophy size={32} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
              Gestión de Cuentas de Delegados
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Crea y supervisa las cuentas de acceso de los delegados para la gestión vigente de la liga.
            </p>
          </div>
        </div>

        {/* Rejilla de Tarjetas de Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Delegados</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
              <UserCheck size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: '#34d399' }}>{stats.activos}</span>
              <span className="stat-label">Cuentas Activas</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
              <UserX size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: '#f87171' }}>{stats.inactivos}</span>
              <span className="stat-label">Cuentas Inactivas</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: '#fbbf24', fontSize: '1.4rem' }}>{stats.cobertura}</span>
              <span className="stat-label">Cobertura de Equipos</span>
            </div>
          </div>
        </div>

        {/* Contenido Central: Formulario y Listado */}
        <div className="dashboard-grid">
          {/* Formulario de Creación */}
          <DelegateForm onDelegateCreated={handleDataChange} />

          {/* Tabla de Delegados */}
          <DelegateList refreshTrigger={refreshTrigger} onStatusChanged={handleDataChange} />
        </div>
      </main>

      {/* Pie de Página */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} Liga Deportiva de Fútbol Vinto. Todos los derechos reservados.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          Módulo de Administración de Delegados | Desarrollo y Operaciones
        </p>
      </footer>
    </div>
  );
}
