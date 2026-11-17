/** Pantalla "Nueva Tanda" (ruta "/nueva-tanda"): configuración, participantes y turnos. */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { PantallaTeclado, ScrollTeclado } from '../components/TecladoSeguro';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { BotonCircular } from '../components/BotonCircular';
import { CampoFecha } from '../components/CampoFecha';
import { CampoMonto } from '../components/CampoMonto';
import { CampoTelefono } from '../components/CampoTelefono';
import { CampoTexto } from '../components/CampoTexto';
import { Contador } from '../components/Contador';
import { FilaParticipante } from '../components/FilaParticipante';
import { Icono } from '../components/Icono';
import { Segmentos } from '../components/Segmentos';
import { SelectorFrecuencia } from '../components/SelectorFrecuencia';
import { SelectorUsuarios } from '../components/SelectorUsuarios';
import { useSesion } from '../context/SesionContext';
import {
  aNumero, calcularProyeccion, crearTanda, listarOpcionesParticipantes, MAX_PARTICIPANTES, MIN_PARTICIPANTES,
  sortear, validarParticipante, type OpcionParticipante, type ParticipanteForm,
} from '../controllers/tandaController';
import { reprogramar } from '../controllers/notificacionController';
import type { RecargoTipo } from '../models/tandaModel';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { hoyISO, sumarPeriodos, type Frecuencia } from '../utils/fechas';
import { formatearLempiras, mesAnio } from '../utils/formato';

type Modo = 'sorteo' | 'manual';

export default function NuevaTandaScreen() {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { usuario } = useSesion();

  const [nombre, setNombre] = useState('');
  const [cuota, setCuota] = useState('');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('quincenal');
  const [fechaInicio, setFechaInicio] = useState(hoyISO());
  const [cantidad, setCantidad] = useState(5);

  const [participantes, setParticipantes] = useState<ParticipanteForm[]>(() =>
    usuario ? [{ nombre: usuario.nombre, telefono: usuario.telefono, usuarioId: usuario.id }] : []
  );
  const [modo, setModo] = useState<Modo>('sorteo');
  const [sorteado, setSorteado] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [errorNuevo, setErrorNuevo] = useState('');

  // Recargo por atraso (opcional)
  const [recargoTipo, setRecargoTipo] = useState<RecargoTipo>('ninguno');
  const [recargoValor, setRecargoValor] = useState('');

  // ComboBox: usuarios registrados + contactos de tus tandas anteriores (incluye los datos de ejemplo)
  const [opciones, setOpciones] = useState<OpcionParticipante[]>([]);
  const [listaAbierta, setListaAbierta] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (usuario) listarOpcionesParticipantes(usuario).then(setOpciones).catch(() => setOpciones([]));
  }, [usuario]);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    []
  );

  const abrirLista = () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setListaAbierta(true);
  };
  // Pequeña espera para que el toque sobre un usuario se registre antes de cerrar la lista
  const cerrarListaConEspera = () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setListaAbierta(false), 250);
  };

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const proyeccion = useMemo(
    () => calcularProyeccion(aNumero(cuota), frecuencia, cantidad, fechaInicio),
    [cuota, frecuencia, cantidad, fechaInicio]
  );

  if (!usuario) return null;

  const completa = participantes.length >= cantidad;
  const mostrarTurno = modo === 'manual' || sorteado;
  const porcentajeCupos = Math.round((participantes.length / cantidad) * 100);

  const agregar = () => {
    const err = validarParticipante(nuevoNombre, nuevoTelefono, participantes);
    if (err) return setErrorNuevo(err);
    setParticipantes([...participantes, { nombre: nuevoNombre.trim(), telefono: nuevoTelefono }]);
    setNuevoNombre('');
    setNuevoTelefono('');
    setErrorNuevo('');
    setSorteado(false);
    setErrores((e) => ({ ...e, participantes: '' }));
  };

  /** Agrega directamente a un usuario registrado (rellena nombre y teléfono desde su cuenta). */
  const agregarOpcion = (o: OpcionParticipante) => {
    if (participantes.length >= cantidad) {
      setErrorNuevo('Ya completaste los cupos. Aumenta el número de participantes para agregar más.');
      setListaAbierta(false);
      return;
    }
    // Nunca la misma persona dos veces: ni por teléfono ni por cuenta
    if (participantes.some((p) => p.telefono === o.telefono || (o.usuarioId !== null && p.usuarioId === o.usuarioId))) {
      setErrorNuevo('Esa persona ya está en la tanda.');
      setListaAbierta(false);
      return;
    }
    setParticipantes([...participantes, { nombre: o.nombre, telefono: o.telefono, usuarioId: o.usuarioId }]);
    setNuevoNombre('');
    setNuevoTelefono('');
    setErrorNuevo('');
    setSorteado(false);
    setListaAbierta(false);
    setErrores((e) => ({ ...e, participantes: '' }));
  };

  const quitar = (indice: number) => {
    setParticipantes(participantes.filter((_, i) => i !== indice));
    setSorteado(false);
  };

  const mover = (indice: number, delta: -1 | 1) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= participantes.length) return;
    const copia = [...participantes];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    setParticipantes(copia);
  };

  const sortearAhora = () => {
    setParticipantes(sortear(participantes));
    setSorteado(true);
  };

  const cambiarModo = (m: Modo) => {
    setModo(m);
    if (m === 'manual') setSorteado(false);
  };

  const cancelar = () => {
    const hayCambios = nombre || cuota || participantes.length > 1;
    if (!hayCambios) return router.back();
    Alert.alert('¿Descartar la tanda?', 'Perderás los datos que ingresaste.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const guardar = async () => {
    setGuardando(true);
    setErrores({});
    try {
      // En modo sorteo, si aún no se sorteó, se sortea justo antes de crear.
      const ordenFinal = modo === 'sorteo' && !sorteado ? sortear(participantes) : participantes;
      const r = await crearTanda(usuario, {
        nombre, cuota, frecuencia, fechaInicio, cantidad, participantes: ordenFinal,
        recargoTipo, recargoValor,
      });
      if (r.ok) {
        reprogramar(usuario);
        Alert.alert('¡Tanda creada!', 'El calendario de rondas ya fue generado.', [
          { text: 'Ver mis tandas', onPress: () => router.replace('/mis-tandas' as never) },
        ]);
      } else {
        setErrores(r.errores);
        const aviso = r.errores.general || r.errores.frecuencia;
        if (aviso) Alert.alert('No se pudo crear la tanda', aviso);
        if (r.errores.participantes) scrollRef.current?.scrollToEnd({ animated: true });
        else scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    } catch {
      Alert.alert('Error', 'No se pudo crear la tanda. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.raiz} edges={['top', 'bottom']}>
      {/* Encabezado */}
      <View style={styles.encabezado}>
        <Pressable onPress={cancelar} style={styles.cancelar} hitSlop={8}>
          <Icono name="arrow-back" size={22} color={tema.colores.texto} />
          <Text style={styles.cancelarTexto}>Cancelar</Text>
        </Pressable>
        <View style={styles.tituloCaja}>
          <Text style={styles.titulo}>Nueva Tanda</Text>
          <Text style={styles.paso}>CONFIGURACIÓN</Text>
        </View>
        <BotonCircular icono="help-circle-outline" etiqueta="Ayuda" />
      </View>

      <PantallaTeclado>
        <ScrollTeclado ref={scrollRef} contentContainerStyle={styles.contenido}>
          {/* Banner */}
          <View style={styles.banner}>
            <View style={styles.bannerIcono}>
              <Icono name="wallet-outline" size={22} color={tema.colores.primario} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.bannerTitulo}>Cuchubal Solidario</Text>
              <Text style={styles.bannerTexto}>
                Ahorro rotativo comunitario, regulado y transparente con moneda en Lempiras (L).
              </Text>
            </View>
          </View>

          {/* Definición del grupo */}
          <View style={[styles.tarjeta, tema.sombras.nivel1]}>
            <View style={styles.tarjetaTitulo}>
              <Icono name="options-outline" size={22} color={tema.colores.primario} />
              <Text style={styles.tarjetaTexto}>Definición del Grupo</Text>
            </View>

            <CampoTexto
              etiqueta="Nombre de la Tanda / Cuchubal"
              nota="Obligatorio"
              placeholder="Cuchubal Navideño 2026"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="sentences"
              maxLength={40}
              error={errores.nombre}
              derecha={<Icono name="create-outline" size={20} color={tema.colores.placeholder} />}
            />
            <CampoMonto
              etiqueta="Monto de la cuota por persona"
              valor={cuota}
              onCambio={setCuota}
              error={errores.cuota}
            />
            <SelectorFrecuencia valor={frecuencia} onCambio={setFrecuencia} />
            <CampoFecha
              etiqueta="Fecha de inicio (primera ronda)"
              valor={fechaInicio}
              onCambio={setFechaInicio}
              minimo={hoyISO()}
              error={errores.fecha}
            />
            <Contador
              etiqueta="Número de participantes (turnos)"
              nota={`Mín. ${MIN_PARTICIPANTES} • Máx. ${MAX_PARTICIPANTES}`}
              valor={cantidad}
              onCambio={setCantidad}
              min={Math.max(MIN_PARTICIPANTES, participantes.length)}
              max={MAX_PARTICIPANTES}
              error={errores.cantidad}
            />
          </View>

          {/* Recargo por atraso */}
          <View style={[styles.tarjeta, tema.sombras.nivel1]}>
            <View style={styles.tarjetaTitulo}>
              <Icono name="alarm-outline" size={22} color={tema.colores.primario} />
              <Text style={styles.tarjetaTexto}>Recargo por atraso</Text>
              <Text style={styles.opcional}>Opcional</Text>
            </View>
            <Segmentos
              opciones={[
                { clave: 'ninguno', texto: 'Sin recargo' },
                { clave: 'fijo', texto: 'Monto fijo' },
                { clave: 'porcentaje', texto: 'Porcentaje' },
              ]}
              activa={recargoTipo}
              onCambio={(t) => {
                setRecargoTipo(t);
                setRecargoValor('');
                setErrores((e) => ({ ...e, recargo: '' }));
              }}
            />
            {recargoTipo !== 'ninguno' && (
              <View style={styles.recargoCampo}>
                <CampoMonto
                  etiqueta={recargoTipo === 'fijo' ? 'Recargo por cuota atrasada' : 'Porcentaje sobre la cuota'}
                  valor={recargoValor}
                  onCambio={setRecargoValor}
                  prefijo={recargoTipo === 'fijo' ? 'L' : ''}
                  sufijo={recargoTipo === 'fijo' ? 'HNL' : '%'}
                  placeholder={recargoTipo === 'fijo' ? '50' : '5'}
                  error={errores.recargo}
                />
              </View>
            )}
            <Text style={styles.recargoNota}>
              {recargoTipo === 'ninguno'
                ? 'No se cobrará nada extra a quien pague tarde.'
                : 'Se cobra una vez por cada cuota que se pague después de la fecha de la ronda. Va aparte de la bolsa del beneficiario y el organizador puede perdonarlo al registrar el pago.'}
            </Text>
          </View>

          {/* Resumen proyectado */}
          <View style={styles.resumen}>
            <View style={styles.resumenCabecera}>
              <View style={styles.resumenTitulo}>
                <Icono name="ellipse" size={8} color={tema.colores.primario} />
                <Text style={styles.resumenEtiqueta}>RESUMEN PROYECTADO DE LA TANDA</Text>
              </View>
              <View style={styles.chipVerde}>
                <Text style={styles.chipVerdeTexto}>{proyeccion.rondas} Rondas</Text>
              </View>
            </View>
            <View style={styles.resumenFila}>
              <View style={styles.resumenCaja}>
                <Text style={styles.resumenCajaEtiqueta}>Bolsa total por ronda</Text>
                <Text style={styles.resumenMonto}>{formatearLempiras(proyeccion.bolsa)}</Text>
                <Text style={styles.resumenNota}>Recibe cada ganador</Text>
              </View>
              <View style={styles.resumenCaja}>
                <Text style={styles.resumenCajaEtiqueta}>Duración estimada</Text>
                <Text style={styles.resumenDuracion}>{proyeccion.duracion}</Text>
                <Text style={styles.resumenNota}>Finaliza: {mesAnio(proyeccion.finaliza)}</Text>
              </View>
            </View>
          </View>

          {/* Participantes y turnos */}
          <View style={[styles.tarjeta, tema.sombras.nivel1]}>
            <View style={styles.participantesCabecera}>
              <View style={styles.flex}>
                <View style={styles.tarjetaTitulo}>
                  <Icono name="people-outline" size={22} color={tema.colores.primario} />
                  <Text style={styles.tarjetaTexto}>Participantes y Turnos</Text>
                </View>
                <Text style={styles.registrados}>
                  {participantes.length} de {cantidad} registrados
                </Text>
              </View>
              <View style={styles.chipVerde}>
                <Text style={styles.chipVerdeTexto}>{porcentajeCupos}% cupos</Text>
              </View>
            </View>

            {/* Sorteo / manual */}
            <View style={styles.modos}>
              <ModoBoton
                activo={modo === 'sorteo'}
                icono="shuffle"
                texto="Sorteo automático"
                onPress={() => cambiarModo('sorteo')}
              />
              <ModoBoton
                activo={modo === 'manual'}
                icono="reorder-three"
                texto="Asignar manualmente"
                onPress={() => cambiarModo('manual')}
              />
            </View>

            {modo === 'sorteo' && (
              <View style={styles.sorteoFila}>
                <Text style={styles.sorteoTexto}>
                  {sorteado
                    ? 'Turnos sorteados. Puedes volver a sortear.'
                    : 'Los turnos se sortearán al crear la tanda.'}
                </Text>
                <Boton
                  titulo={sorteado ? 'Sortear otra vez' : 'Sortear ahora'}
                  iconoIzquierda="shuffle"
                  variante="secundario"
                  onPress={sortearAhora}
                  deshabilitado={participantes.length < 2}
                  estilo={styles.botonSorteo}
                />
              </View>
            )}
            {modo === 'manual' && (
              <Text style={styles.sorteoTexto}>Usa las flechas para ordenar quién cobra primero.</Text>
            )}

            <View style={styles.lista}>
              {participantes.map((p, i) => (
                <FilaParticipante
                  key={p.telefono}
                  indice={i}
                  nombre={p.nombre}
                  telefono={p.telefono}
                  esAdmin={p.usuarioId === usuario.id}
                  mostrarTurno={mostrarTurno}
                  fecha={mostrarTurno ? sumarPeriodos(fechaInicio, frecuencia, i) : undefined}
                  reordenable={modo === 'manual' && participantes.length > 1}
                  puedeSubir={i > 0}
                  puedeBajar={i < participantes.length - 1}
                  onSubir={() => mover(i, -1)}
                  onBajar={() => mover(i, 1)}
                  onQuitar={() => quitar(i)}
                />
              ))}
            </View>

            {/* Agregar participante */}
            {!completa ? (
              <View style={styles.agregar}>
                <Text style={styles.agregarTitulo}>Agregar participante</Text>
                <Text style={styles.agregarAyuda}>
                  Toca un campo para elegir de las personas guardadas (usuarios registrados y contactos de tus tandas), o escribe los datos de alguien nuevo. El mismo teléfono no puede repetirse en una tanda.
                </Text>
                <CampoTexto
                  etiqueta="Nombre"
                  icono="person-outline"
                  placeholder="Elena Ramos"
                  value={nuevoNombre}
                  onChangeText={(t) => {
                    setNuevoNombre(t);
                    abrirLista();
                  }}
                  onFocus={abrirLista}
                  onBlur={cerrarListaConEspera}
                  autoCapitalize="words"
                />
                <CampoTelefono
                  etiqueta="Teléfono"
                  valor={nuevoTelefono}
                  onCambio={(t) => {
                    setNuevoTelefono(t);
                    abrirLista();
                  }}
                  onEnfocar={abrirLista}
                  onDesenfocar={cerrarListaConEspera}
                  error={errorNuevo || undefined}
                />
                {listaAbierta && (
                  <SelectorUsuarios
                    opciones={opciones}
                    yaAgregados={participantes.map((p) => p.telefono)}
                    cuentasAgregadas={participantes.map((p) => p.usuarioId).filter((id): id is number => typeof id === 'number')}
                    filtro={nuevoNombre.trim() || nuevoTelefono}
                    onElegir={agregarOpcion}
                    onCerrar={() => setListaAbierta(false)}
                  />
                )}
                <Boton
                  titulo="Agregar a la tanda"
                  iconoIzquierda="person-add-outline"
                  variante="secundario"
                  onPress={agregar}
                />
              </View>
            ) : (
              <View style={styles.completo}>
                <Icono name="checkmark-circle" size={20} color={tema.colores.primario} />
                <Text style={styles.completoTexto}>Cupos completos</Text>
              </View>
            )}

            {errores.participantes ? <Text style={styles.errorLista}>{errores.participantes}</Text> : null}
          </View>
        </ScrollTeclado>

        <View style={styles.pie}>
          <Boton
            titulo="Crear y Generar Calendario"
            iconoDerecha="arrow-forward"
            onPress={guardar}
            cargando={guardando}
          />
        </View>
      </PantallaTeclado>
    </SafeAreaView>
  );
}

// ── Piezas locales ──

function ModoBoton({
  activo, icono, texto, onPress,
}: {
  activo: boolean;
  icono: 'shuffle' | 'reorder-three';
  texto: string;
  onPress: () => void;
}) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <Pressable onPress={onPress} style={[styles.modo, activo && styles.modoActivo]} accessibilityRole="radio">
      <Icono name={icono} size={18} color={activo ? tema.colores.primario : tema.colores.textoSecundario} />
      <Text style={[styles.modoTexto, activo && styles.modoTextoActivo]} numberOfLines={1}>{texto}</Text>
    </Pressable>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  encabezado: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: tema.espacio.md, paddingVertical: 10,
    backgroundColor: tema.colores.superficie, borderBottomWidth: 1, borderBottomColor: tema.colores.superficieMedia,
  },
  cancelar: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 90 },
  cancelarTexto: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto },
  tituloCaja: { alignItems: 'center' },
  titulo: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.texto },
  paso: { ...tema.tipografia.etiquetaSm, letterSpacing: 1, color: tema.colores.primario },
  contenido: { padding: tema.espacio.md, gap: tema.espacio.md },
  banner: {
    flexDirection: 'row', gap: 12, padding: tema.espacio.md, borderRadius: tema.radio.tarjeta,
    backgroundColor: tema.colores.superficieBaja, borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  bannerIcono: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: tema.colores.brilloVerde,
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitulo: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.texto },
  bannerTexto: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: 2 },
  tarjeta: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  tarjetaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: tema.espacio.md },
  tarjetaTexto: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.texto },
  resumen: {
    padding: tema.espacio.md, borderRadius: tema.radio.tarjeta, gap: 12,
    backgroundColor: tema.colores.fondoVerde, borderWidth: 1, borderColor: tema.colores.pagadoBorde,
  },
  resumenCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  resumenTitulo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  resumenEtiqueta: { ...tema.tipografia.etiquetaSm, letterSpacing: 0.5, color: tema.colores.textoSecundario, flexShrink: 1 },
  chipVerde: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: tema.radio.pildora, backgroundColor: tema.colores.secundarioContenedor,
  },
  chipVerdeTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.sobreSecundarioContenedor },
  resumenFila: { flexDirection: 'row', gap: 12 },
  resumenCaja: { flex: 1, padding: 12, borderRadius: tema.radio.tarjeta, backgroundColor: tema.colores.superficie },
  resumenCajaEtiqueta: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
  resumenMonto: { fontSize: 24, fontWeight: '800', color: tema.colores.primario, marginTop: 4 },
  resumenDuracion: { fontSize: 22, fontWeight: '800', color: tema.colores.texto, marginTop: 4 },
  resumenNota: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: 2 },
  participantesCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  registrados: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: -8, marginBottom: 12 },
  modos: {
    flexDirection: 'row', padding: 4, borderRadius: tema.radio.input, gap: 4,
    backgroundColor: tema.colores.superficieMedia, marginBottom: 10,
  },
  modo: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, borderRadius: tema.radio.md, paddingHorizontal: 6,
  },
  modoActivo: { backgroundColor: tema.colores.superficie },
  modoTexto: { ...tema.tipografia.etiqueta, color: tema.colores.textoSecundario },
  modoTextoActivo: { color: tema.colores.primario, fontWeight: '800' },
  sorteoFila: { gap: 8, marginBottom: 12 },
  sorteoTexto: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginBottom: 10 },
  botonSorteo: { minHeight: 44 },
  lista: { gap: 10 },
  agregar: {
    marginTop: tema.espacio.md, paddingTop: tema.espacio.md,
    borderTopWidth: 1, borderTopColor: tema.colores.superficieMedia,
  },
  agregarAyuda: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginBottom: 10 },
  opcional: { ...tema.tipografia.cuerpoSm, color: tema.colores.placeholder, marginLeft: 'auto' },
  recargoCampo: { marginTop: tema.espacio.md },
  recargoNota: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: 4 },
  agregarTitulo: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto, marginBottom: 10 },
  completo: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: tema.espacio.md },
  completoTexto: { ...tema.tipografia.etiquetaLg, color: tema.colores.primario },
  errorLista: { ...tema.tipografia.etiqueta, color: tema.colores.error, marginTop: 10, textAlign: 'center' },
  pie: {
    padding: tema.espacio.md, backgroundColor: tema.colores.superficie,
    borderTopWidth: 1, borderTopColor: tema.colores.superficieMedia,
  },
});
