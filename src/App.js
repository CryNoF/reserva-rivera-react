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
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Pagination,
  CircularProgress
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { createTheme, ThemeProvider, responsiveFontSizes } from '@mui/material/styles';
import { blue, green, red, pink } from '@mui/material/colors';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import moment from 'moment-timezone';
import 'moment/locale/es';
import dayjs from 'dayjs';

const API_URL = 'https://reserva-rivera-node.vercel.app';

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
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [reservaAConfirmar, setReservaAConfirmar] = useState(null);
  const [pastReservasPage, setPastReservasPage] = useState(1);
  const [pastReservasPerPage] = useState(7);
  const [loadingReservas, setLoadingReservas] = useState(true);
  const [loadingPastReservas, setLoadingPastReservas] = useState(true);
  const [selectedUser, setSelectedUser] = useState(100);

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
    if (!token) return;
    
    setLoadingReservas(true);
    try {
      const response = await axios.get(`${API_URL}/reservas`, {
        headers: { 
          'Authorization': token
        }
      });
      console.log('Respuesta reservas:', response); // Para debug
      setReservas(response.data);
      return response.data;
    } catch (error) {
      console.error('Error completo al obtener reservas:', error.response || error);
      setErrorMessage('Error al cargar las reservas. Por favor, recarga la página.');
      setSnackbarOpen(true);
      setReservas([]);
      throw error;
    } finally {
      setLoadingReservas(false);
    }
  };

  const obtenerUsuarios = async (token) => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API_URL}/usuarios`, {
        headers: { 
          'Authorization': token
        }
      });
      console.log('Respuesta usuarios:', response); // Para debug
      setUsuarios(response.data.usuarios);
      return response.data.usuarios;
    } catch (error) {
      console.error('Error completo al obtener usuarios:', error.response || error);
      setErrorMessage('Error al cargar los usuarios. Por favor, recarga la página.');
      setSnackbarOpen(true);
      setUsuarios([]);
      throw error;
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
    if (!token) return false;
    
    try {
      const response = await axios.post(`${API_URL}/auth/verify-token`, 
        { token }, // El token va en el body
        {
          headers: { 
            'Authorization': token  // Y también en el header
          }
        }
      );
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
          const esValido = await verificarToken(tokenAlmacenado);
          if (esValido) {
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
      setLoadingPastReservas(false);
    }
  }, [reservas, usuarios]);

  useEffect(() => {
    if (token) {
      obtenerDatos(token);
    }
  }, [selectedUser, token, obtenerDatos]);

  const mapearReservasConUsuarios = (reservas, usuarios) => {
    return reservas.map(reserva => {
      const usuario = usuarios.find(u => u.id === reserva.id_reservador);
      return {
        ...reserva,
        nombreUsuario: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario no encontrado'
      };
    });
  };

  const crearReserva = async (nuevaReserva = null) => {
    try {
      let reservaACrear;
      if (nuevaReserva) {
        reservaACrear = {
          ...nuevaReserva,
          id_reservador: selectedUser // Usar el usuario seleccionado
        };
      } else {
        const fechaReserva = moment(fechaSeleccionada)
          .tz('America/Santiago')
          .set({
            hour: parseInt(hora.split(':')[0]),
            minute: parseInt(hora.split(':')[1]),
            second: 0
          });
    
        reservaACrear = {
          cancha: parseInt(cancha),
          fecha: fechaReserva.format('YYYY-MM-DD HH:mm:00'),
          id_reservador: selectedUser, // Usar el usuario seleccionado
          recurrente: 0,
          fecha_ingreso_reserva: moment().tz('America/Santiago').format('YYYY-MM-DD HH:mm:00')
        };
      }
  
      // Modificar la comparación para usar la misma zona horaria
      const horaOcupada = reservasConUsuarios.some(reserva => {
        const fechaReservaExistente = moment(reserva.fecha).tz('America/Santiago');
        const fechaNuevaReserva = moment(reservaACrear.fecha).tz('America/Santiago');
        
        // Usar la misma zona horaria para todas las comparaciones
        return (
          fechaReservaExistente.isSame(fechaNuevaReserva, 'day') &&
          fechaReservaExistente.hour() === fechaNuevaReserva.hour() &&
          reserva.cancha === reservaACrear.cancha
        );
      });
  
      if (horaOcupada) {
        setErrorMessage('La cancha ya está ocupada a esta hora.');
        setSuccessMessage('');
        setSnackbarOpen(true);
        return;
      }
  
      const response = await axios.post(`${API_URL}/reservas`, reservaACrear, {
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
    aireLibre: reservasPorFecha.filter(reserva => reserva.cancha === 1),
    lefun: reservasPorFecha.filter(reserva => reserva.cancha === 2)
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleOpenConfirmDialog = (hora, tipoCancha) => {
    const fechaReserva = moment(fechaSeleccionada)
      .set({
        hour: hora,
        minute: 0,
        second: 0
      })
      .tz('America/Santiago');
  
    setReservaAConfirmar({
      cancha: tipoCancha === 'techada' ? 0 : 1,
      fecha: fechaReserva.format('YYYY-MM-DD HH:mm:00'),
      id_reservador: selectedUser, // Usar el usuario seleccionado
      recurrente: 0,
      fecha_ingreso_reserva: moment().tz('America/Santiago').format('YYYY-MM-DD HH:mm:00')
    });
    setOpenConfirmDialog(true);
  };
  
  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setReservaAConfirmar(null);
  };
  
  const handleConfirmReserva = async () => {
    if (reservaAConfirmar) {
      await crearReserva(reservaAConfirmar);
      handleCloseConfirmDialog();
    }
  };

  const handleUserChange = async (e) => {
    setSelectedUser(e.target.value);
    if (token) {
      await obtenerDatos(token);
    }
  };

  const pastReservas = reservasConUsuarios.filter(reserva => (
    reserva.id_reservador === selectedUser && moment(reserva.fecha).isBefore(moment(), 'day')
  ));
  

  const indexOfLastPastReserva = pastReservasPage * pastReservasPerPage;
  const indexOfFirstPastReserva = indexOfLastPastReserva - pastReservasPerPage;
  const currentPastReservas = pastReservas.slice(indexOfFirstPastReserva, indexOfLastPastReserva);

  const handlePastReservasPageChange = (event, page) => {
    setPastReservasPage(page);
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
            Reservas Ribera Tennis Club
          </Typography>
          <FormControl sx={{ minWidth: 200, mr: 2 }}>
            <InputLabel>Usuario</InputLabel>
            <Select
              value={selectedUser}
              label="Usuario"
              onChange={handleUserChange}
              size="small"
            >
              {usuarios
                .sort((a, b) => 
                  `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`)
                )
                .map((usuario) => (
                  <MenuItem key={usuario.id} value={usuario.id}>
                    {`${usuario.nombre} ${usuario.apellido}`}
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
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
              <Button variant="contained" color="primary" onClick={() => crearReserva()} fullWidth>
                Reservar
              </Button>
            </Box>
          </Paper>

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Horarios de Reservas 
            <span style={{ float: 'right' }}>
              {moment(fechaSeleccionada).format('dddd DD-MM-YYYY').charAt(0).toUpperCase() + moment(fechaSeleccionada).format('dddd DD-MM-YYYY').slice(1)}
            </span>
          </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ fontWeight: 'bold' }}>Hora</TableCell>
                    <TableCell style={{ fontWeight: 'bold' }}>Cancha Techada</TableCell>
                    <TableCell style={{ fontWeight: 'bold' }}>Cancha Aire Libre</TableCell>
                    <TableCell style={{ fontWeight: 'bold' }}>Cancha Lefun</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingReservas ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...Array(16)].map((_, i) => {
                      const hour = i + 7;
                      const reservaTechada = horasOcupadas.techada.find(r => moment(r.fecha).hour() === hour);
                      const reservaAireLibre = horasOcupadas.aireLibre.find(r => moment(r.fecha).hour() === hour);
                      const reservaLefun = horasOcupadas.lefun.find(r => moment(r.fecha).hour() === hour);
                      
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
                                  {reservaTechada.id_reservador === selectedUser && ( // Cambiado de 100 a selectedUser
                                    <IconButton 
                                      size="small" 
                                      onClick={() => eliminarReserva(reservaTechada.id)}
                                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </>
                              ) : (
                                <>
                                  Libre
                                  <IconButton 
                                    size="large" 
                                    onClick={() => handleOpenConfirmDialog(hour, 'techada')}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                                  >
                                    <AddIcon fontSize="large" />
                                  </IconButton>
                                </>
                              )}
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
                                  {reservaAireLibre.id_reservador === selectedUser && ( // Cambiado de 100 a selectedUser
                                    <IconButton 
                                      size="small" 
                                      onClick={() => eliminarReserva(reservaAireLibre.id)}
                                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </>
                              ) : (
                                <>
                                  Libre
                                  <IconButton 
                                    size="large" 
                                    onClick={() => handleOpenConfirmDialog(hour, 'aireLibre')}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                                  >
                                    <AddIcon fontSize="large" />
                                  </IconButton>
                                </>
                              )}
                            </TableCell>
                            <TableCell style={{ 
                              backgroundColor: reservaLefun 
                                ? (darkMode ? pink[700] : '#d02037') 
                                : (darkMode ? '#CCFF00' : '#6fc749'),
                              color: darkMode && !reservaLefun ? '#000' : '#fff',
                              position: 'relative'
                            }}>
                              {reservaLefun ? (
                                <>
                                  <div>Ocupada</div>
                                  <div style={{ fontSize: '0.8em' }}>{reservaLefun.nombreUsuario}</div>
                                  {reservaLefun.id_reservador === selectedUser && ( // Cambiado de 100 a selectedUser
                                    <IconButton 
                                      size="small" 
                                      onClick={() => eliminarReserva(reservaLefun.id)}
                                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </>
                              ) : (
                                <>
                                  Libre
                                  <IconButton 
                                    size="large" 
                                    onClick={() => handleOpenConfirmDialog(hour, 'aireLibre')}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                                  >
                                    <AddIcon fontSize="large" />
                                  </IconButton>
                                </>
                              )}
                            </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Reservas Anteriores del Usuario
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ fontWeight: 'bold' }}>Fecha</TableCell>
                    <TableCell style={{ fontWeight: 'bold' }}>Hora</TableCell>
                    <TableCell style={{ fontWeight: 'bold' }}>Cancha</TableCell>
                    <TableCell style={{ fontWeight: 'bold' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingPastReservas ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentPastReservas.map(reserva => {
                      const reservaDate = moment(reserva.fecha);
                      const currentDate = moment();
                      
                      // Obtener el inicio de la semana actual (lunes)
                      const startOfWeek = currentDate.clone().startOf('isoWeek');
                      
                      // Verificar si la reserva está en la semana actual
                      const isInCurrentWeek = reservaDate.isSameOrAfter(startOfWeek) && reservaDate.isBefore(currentDate);

                      const dayOfWeek = reservaDate.day();
                      const hour = reservaDate.hour();

                      const isHighlightedTime = 
                        (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 18 && hour < 23) ||
                        (dayOfWeek === 6 && hour >= 8 && hour < 14);

                      const shouldHighlight = isInCurrentWeek && isHighlightedTime;

                      const cellStyle = shouldHighlight
                        ? { backgroundColor: darkMode ? pink[700] : '#d02037', color: '#fff' }
                        : {};

                      return (
                        <TableRow key={reserva.id}>
                        <TableCell style={cellStyle}>
                          {reservaDate.format('DD-MM-YYYY')}
                        </TableCell>
                        <TableCell style={cellStyle}>
                          {reservaDate.format('HH:mm')}
                        </TableCell>
                        <TableCell style={cellStyle}>{reserva.cancha === 0 ? 'Techada' : 'Aire Libre'}</TableCell>
                        <TableCell align="left" style={cellStyle}>
                          <IconButton 
                            size="small" 
                            onClick={() => eliminarReserva(reserva.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(pastReservas.length / pastReservasPerPage)}
                page={pastReservasPage}
                onChange={handlePastReservasPageChange}
              />
            </Box>
          </Paper>
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            message={errorMessage || successMessage}
          />

          <Dialog
            open={openConfirmDialog}
            onClose={handleCloseConfirmDialog}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">{"Confirmar Reserva"}</DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                ¿Está seguro que desea reservar esta hora?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseConfirmDialog} color="primary">
                Cancelar
              </Button>
              <Button onClick={handleConfirmReserva} color="primary" autoFocus>
                Confirmar
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;