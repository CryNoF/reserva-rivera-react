import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Snackbar,
  IconButton,
  CssBaseline
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { createTheme, ThemeProvider, responsiveFontSizes } from '@mui/material/styles';
import { blue, green, red, pink } from '@mui/material/colors';
import DeleteIcon from '@mui/icons-material/Delete';
import moment from 'moment-timezone';
import dayjs from 'dayjs';

const API_URL = 'http://localhost:3000';

const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [token, setToken] = useState('');
  const [reservas, setReservas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [reservasConUsuarios, setReservasConUsuarios] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [hora, setHora] = useState('07:00');
  const [cancha, setCancha] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  let lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: blue[500],
      },
      secondary: {
        main: green[500],
      },
      error: {
        main: red[500],
      },
      background: {
        default: '#f7f9fc',
        paper: '#fff',
      },
    },
  });

  let darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: blue[300],
      },
      secondary: {
        main: green[300],
      },
      error: {
        main: red[300],
      },
      background: {
        default: '#1a2635',
        paper: '#233044',
      },
      text: {
        primary: '#ffffff',
        secondary: '#b0bec5',
      },
    },
  });

  // Hacer los temas responsivos
  lightTheme = responsiveFontSizes(lightTheme);
  darkTheme = responsiveFontSizes(darkTheme);

  const theme = darkMode ? darkTheme : lightTheme;
  const obtenerReservas = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/reservas`, {
        headers: { 'Authorization': token }
      });
      setReservas(response.data);
    } catch (error) {
      console.error('Error al obtener reservas:', error);
      setReservas([]);
    }
  };

  const obtenerUsuarios = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/usuarios`, {
        headers: { 'Authorization': token }
      });
      setUsuarios(response.data.usuarios);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      setUsuarios([]);
    }
  };

  const obtenerDatos = useCallback(async (token) => {
    await obtenerReservas(token);
    await obtenerUsuarios(token);
  }, []);

  const obtenerToken = async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {});
      return response.data.token;
    } catch (error) {
      console.error('Error al obtener token:', error);
      throw error;
    }
  };

  const realizarLogin = useCallback(async () => {
    try {
      const tokenObtenido = await obtenerToken();
      setToken(tokenObtenido);
      localStorage.setItem('token', tokenObtenido);
      await obtenerDatos(tokenObtenido);
    } catch (error) {
      console.error('Error al realizar login:', error);
    }
  }, [obtenerDatos]);

  const verificarToken = async (token) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-token`, { token }, {
        headers: { 'Authorization': token }
      });
      return response.data.valido;
    } catch (error) {
      console.error('Error al verificar token:', error);
      return false;
    }
  };

  useEffect(() => {
    const inicializarApp = async () => {
      try {
        const tokenAlmacenado = localStorage.getItem('token');
        if (tokenAlmacenado) {
          if (await verificarToken(tokenAlmacenado)) {
            setToken(tokenAlmacenado);
            await obtenerDatos(tokenAlmacenado);
          } else {
            await realizarLogin();
          }
        } else {
          await realizarLogin();
        }
      } catch (error) {
        console.error('Error al inicializar la app:', error);
      }
    };
    inicializarApp();
  }, [obtenerDatos, realizarLogin]);

  useEffect(() => {
    if (reservas.length > 0 && usuarios.length > 0) {
      const reservasMapeadas = mapearReservasConUsuarios(reservas, usuarios);
      setReservasConUsuarios(reservasMapeadas);
    }
  }, [reservas, usuarios]);

  const mapearReservasConUsuarios = (reservas, usuarios) => {
    return reservas.map(reserva => {
      const usuario = usuarios.find(u => u.id === reserva.id_reservador);
      return {
        ...reserva,
        nombreUsuario: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario no encontrado'
      };
    });
  };

  const crearReserva = async () => {
    try {
      const fechaReserva = moment(fechaSeleccionada)
        .set({
          hour: parseInt(hora.split(':')[0]),
          minute: parseInt(hora.split(':')[1]),
          second: 0
        })
        .tz('America/Santiago');
  
      const nuevaReserva = {
        cancha: parseInt(cancha),
        fecha: fechaReserva.format('YYYY-MM-DD HH:mm:00'),
        id_reservador: 100,
        recurrente: 0,
        fecha_ingreso_reserva: moment().tz('America/Santiago').format('YYYY-MM-DD HH:mm:00')
      };
  
      const horaOcupada = reservasConUsuarios.some(reserva => {
        const fechaReservaExistente = moment(reserva.fecha).tz('America/Santiago');
        return (
          fechaReservaExistente.isSame(fechaReserva, 'day') &&
          fechaReservaExistente.hour() === fechaReserva.hour() &&
          reserva.cancha === nuevaReserva.cancha
        );
      });
  
      if (horaOcupada) {
        setErrorMessage('La cancha ya está ocupada a esta hora.');
        setSuccessMessage('');
        setSnackbarOpen(true);
        return;
      }
  
      const response = await axios.post(`${API_URL}/reservas`, nuevaReserva, {
        headers: { 'Authorization': token }
      });
  
      const reservaCreada = response.data;
      const usuarioActual = usuarios.find(u => u.id === reservaCreada.id_reservador);
      const nuevaReservaConUsuario = {
        ...reservaCreada,
        nombreUsuario: usuarioActual ? `${usuarioActual.nombre} ${usuarioActual.apellido}` : 'Usuario no encontrado'
      };
  
      setReservasConUsuarios(prevReservas => [...prevReservas, nuevaReservaConUsuario]);
      
      setSuccessMessage('Reserva creada con éxito.');
      setErrorMessage('');
      setSnackbarOpen(true);
      await obtenerDatos(localStorage.getItem('token'));
    } catch (error) {
      console.error('Error al crear reserva:', error);
      setErrorMessage('Error al crear la reserva. Por favor, intente de nuevo.');
      setSnackbarOpen(true);
    }
  };

  const eliminarReserva = async (idReserva) => {
    try {
      await axios.delete(`${API_URL}/reservas/${idReserva}`, {
        headers: { 'Authorization': token }
      });
      
      setReservasConUsuarios(prevReservas => prevReservas.filter(reserva => reserva.id !== idReserva));
      setSuccessMessage('Reserva eliminada con éxito.');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error al eliminar reserva:', error);
      setErrorMessage('Error al eliminar la reserva. Por favor, intente de nuevo.');
      setSnackbarOpen(true);
    }
  };

  const reservasPorFecha = reservasConUsuarios.filter(reserva => {
    const fechaReserva = moment(reserva.fecha).tz('America/Santiago');
    return fechaReserva.isSame(fechaSeleccionada, 'day');
  });

  const horasOcupadas = {
    techada: reservasPorFecha.filter(reserva => reserva.cancha === 0),
    aireLibre: reservasPorFecha.filter(reserva => reserva.cancha === 1)
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        bgcolor: 'background.default', 
        minHeight: '100vh', 
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Container maxWidth="md" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ my: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom noWrap sx={{ flexGrow: 1, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}>
              Reservas Rivera Tennis Club
            </Typography>
            <IconButton sx={{ ml: 1 }} onClick={toggleDarkMode} color="inherit">
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Box>
          
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Crear Reserva
            </Typography>
            <Box component="form" noValidate autoComplete="off">
              <FormControl fullWidth sx={{ mb: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Fecha de reserva"
                    value={dayjs(fechaSeleccionada)}
                    onChange={(newValue) => setFechaSeleccionada(newValue.toDate())}
                    minDate={dayjs()}
                    maxDate={dayjs().add(7, 'day')}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Hora</InputLabel>
                <Select
                  value={hora}
                  label="Hora"
                  onChange={(e) => setHora(e.target.value)}
                >
                  {[...Array(16)].map((_, i) => {
                    const hour = i + 7;
                    return <MenuItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>{`${hour}:00`}</MenuItem>;
                  })}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Cancha</InputLabel>
                <Select
                  value={cancha}
                  label="Cancha"
                  onChange={(e) => setCancha(e.target.value)}
                >
                  <MenuItem value={0}>Cancha Techada</MenuItem>
                  <MenuItem value={1}>Cancha Aire Libre</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" color="primary" onClick={crearReserva} fullWidth>
                Reservar
              </Button>
            </Box>
          </Paper>

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Horarios de Reservas
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ fontWeight: 'bold' }}>Hora</TableCell>
                    <TableCell style={{ fontWeight: 'bold' }}>Cancha Techada</TableCell>
                    <TableCell style={{ fontWeight: 'bold' }}>Cancha Aire Libre</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...Array(16)].map((_, i) => {
                    const hour = i + 7;
                    const reservaTechada = horasOcupadas.techada.find(r => moment(r.fecha).hour() === hour);
                    const reservaAireLibre = horasOcupadas.aireLibre.find(r => moment(r.fecha).hour() === hour);
                    
                    return (
                      <TableRow key={hour}>
                        <TableCell style={{ fontWeight: 'bold' }}>{`${hour.toString().padStart(2, '0')}:00`}</TableCell>
                        <TableCell style={{ 
                          backgroundColor: reservaTechada 
                            ? (darkMode ? pink[700] : '#d02037') 
                            : (darkMode ? '#CCFF00' : '#6fc749'),
                          color: darkMode && !reservaTechada ? '#000' : '#fff',
                          position: 'relative'
                        }}>
                          {reservaTechada ? (
                            <>
                              <div>Ocupada</div>
                              <div style={{ fontSize: '0.8em' }}>{reservaTechada.nombreUsuario}</div>
                              {reservaTechada.id_reservador === 100 && (
                                <IconButton 
                                  size="small" 
                                  onClick={() => eliminarReserva(reservaTechada.id)}
                                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </>
                          ) : 'Libre'}
                        </TableCell>
                        <TableCell style={{ 
                          backgroundColor: reservaAireLibre 
                            ? (darkMode ? pink[700] : '#d02037') 
                            : (darkMode ? '#CCFF00' : '#6fc749'),
                          color: darkMode && !reservaAireLibre ? '#000' : '#fff',
                          position: 'relative'
                        }}>
                          {reservaAireLibre ? (
                            <>
                              <div>Ocupada</div>
                              <div style={{ fontSize: '0.8em' }}>{reservaAireLibre.nombreUsuario}</div>
                              {reservaAireLibre.id_reservador === 100 && (
                                <IconButton 
                                  size="small" 
                                  onClick={() => eliminarReserva(reservaAireLibre.id)}
                                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </>
                          ) : 'Libre'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </TableContainer>
            </Paper>
  
            <Snackbar
              open={snackbarOpen}
              autoHideDuration={6000}
              onClose={handleCloseSnackbar}
              message={errorMessage || successMessage}
            />
          </Container>
        </Box>
      </ThemeProvider>
    );
  };
  
  export default App;