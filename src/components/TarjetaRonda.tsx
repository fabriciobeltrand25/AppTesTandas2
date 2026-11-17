/** Tarjeta de una ronda en el calendario (cerrada, en curso o pendiente). */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RondaVista } from '../controllers/rondaController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { fechaDMA, formatearLempiras } from '../utils/formato';
import { Boton } from './Boton';
import { BarraProgreso } from './BarraProgreso';
import { Icono } from './Icono';

export function TarjetaRonda({
  ronda,
  total,
  onPress,
}: {
  ronda: RondaVista;
  total: number;
  onPress: () => void;
}) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const c = tema.colores;
  const numero = String(ronda.numero).padStart(2, '0');
  const nombre = ronda.esMia ? `${ronda.beneficiarioNombre} (Tú)` : ronda.beneficiarioNombre;

  if (ronda.estado === 'en_curso') {
    const atrasada = ronda.dias < 0;
    return (
      <Pressable onPress={onPress} style={[styles.tarjeta, styles.tarjetaCurso, tema.sombras.nivel2]}>
        <View style={styles.filaSuperior}>
          <View style={[styles.circulo, styles.circuloCurso]}>
            <Icono name="sync" size={20} color="#ffffff" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.meta}>RONDA {numero}  •  {fechaDMA(ronda.fecha)}</Text>
            <Text style={styles.nombreGrande} numberOfLines={2}>{nombre}</Text>
          </View>
          <View style={styles.chipCurso}>
            <Icono name="ellipse" size={7} color={c.sobreSecundarioContenedor} />
            <Text style={styles.chipCursoTexto}>EN CURSO</Text>
          </View>
        </View>

        <View style={styles.cajaProgreso}>
          <View style={styles.filaProgreso}>
            <Text style={styles.progresoEtiqueta}>Progreso de recolección</Text>
            <Text style={styles.progresoValor}>
              {formatearLempiras(ronda.recolectado)} / {formatearLempiras(ronda.monto)} ({ronda.porcentaje}%)
            </Text>
          </View>
          <BarraProgreso porcentaje={ronda.porcentaje} />
          <View style={styles.filaProgreso}>
            <Text style={styles.progresoNota}>
              {ronda.pagados} de {total} participantes han pagado
            </Text>
            <View style={styles.plazo}>
              <Icono name="time-outline" size={14} color={atrasada ? c.error : c.terciario} />
              <Text style={[styles.plazoTexto, atrasada && { color: c.error }]}>{ronda.textoPlazo}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pieCurso}>
          <View>
            <Text style={styles.montoGrande}>{formatearLempiras(ronda.monto)}</Text>
            <Text style={styles.montoNota}>monto total</Text>
          </View>
          <Boton
            titulo="Ver cuotas"
            iconoIzquierda="cash-outline"
            onPress={onPress}
            estilo={styles.botonCuotas}
          />
        </View>
      </Pressable>
    );
  }

  const cerrada = ronda.estado === 'cerrada';
  return (
    <Pressable onPress={onPress} style={[styles.tarjeta, tema.sombras.nivel1]}>
      <View style={styles.filaSuperior}>
        <View style={[styles.circulo, cerrada ? styles.circuloCerrada : styles.circuloPendiente]}>
          {cerrada ? (
            <Icono name="checkmark" size={22} color="#ffffff" />
          ) : (
            <Text style={styles.circuloNumero}>{numero}</Text>
          )}
        </View>
        <View style={styles.flex}>
          <Text style={styles.meta}>RONDA {numero}  •  {fechaDMA(ronda.fecha)}</Text>
          <Text style={styles.nombre} numberOfLines={2}>{nombre}</Text>
        </View>
        <Text style={styles.monto}>{formatearLempiras(cerrada ? ronda.recolectado : ronda.monto)}</Text>
      </View>

      <View style={styles.separador} />

      <View style={styles.pie}>
        {cerrada ? (
          <>
            <View style={styles.chipsPie}>
              <View style={styles.chipCerrada}>
                <Icono name="checkmark-circle-outline" size={14} color={c.pagadoTexto} />
                <Text style={styles.chipCerradaTexto}>Entregado y cerrado</Text>
              </View>
              {ronda.pagados < total && (
                <View style={styles.chipSinPagar}>
                  <Icono name="alert-circle-outline" size={14} color={c.pendienteTexto} />
                  <Text style={styles.chipSinPagarTexto}>
                    {total - ronda.pagados} sin pagar
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.pieDerecha}>Recibo #{String(ronda.id).padStart(4, '0')}</Text>
          </>
        ) : (
          <>
            <View style={styles.chipPendiente}>
              <Icono name="hourglass-outline" size={13} color={c.textoSecundario} />
              <Text style={styles.chipPendienteTexto}>Pendiente</Text>
            </View>
            <Text style={styles.pieDerecha}>{ronda.textoPlazo}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  tarjeta: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  tarjetaCurso: { borderColor: tema.colores.primario, borderWidth: 2, gap: 14 },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  circulo: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  circuloCerrada: { backgroundColor: tema.colores.relleno },
  circuloPendiente: { backgroundColor: tema.colores.superficieAlta },
  circuloCurso: { backgroundColor: tema.colores.relleno, borderRadius: 12 },
  circuloNumero: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.textoSecundario },
  meta: { ...tema.tipografia.etiquetaSm, letterSpacing: 0.5, color: tema.colores.textoSecundario },
  nombre: { ...tema.tipografia.encabezadoSm, color: tema.colores.texto },
  nombreGrande: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.texto },
  monto: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.texto },
  separador: { height: 1, backgroundColor: tema.colores.superficieMedia, marginVertical: 12 },
  pie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pieDerecha: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  chipsPie: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, flexShrink: 1 },
  chipSinPagar: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: tema.radio.pildora, backgroundColor: tema.colores.pendienteFondo,
    borderWidth: 1, borderColor: tema.colores.pendienteBorde,
  },
  chipSinPagarTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.pendienteTexto },
  chipCerrada: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: tema.radio.pildora, backgroundColor: tema.colores.pagadoFondo,
    borderWidth: 1, borderColor: tema.colores.pagadoBorde,
  },
  chipCerradaTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.pagadoTexto },
  chipPendiente: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: tema.radio.pildora, backgroundColor: tema.colores.superficieMedia,
  },
  chipPendienteTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
  chipCurso: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: tema.radio.pildora, backgroundColor: tema.colores.secundarioContenedor,
  },
  chipCursoTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.sobreSecundarioContenedor },
  cajaProgreso: {
    padding: 12, borderRadius: tema.radio.tarjeta, gap: 8,
    backgroundColor: tema.colores.superficieBaja, borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  filaProgreso: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  progresoEtiqueta: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  progresoValor: { ...tema.tipografia.etiqueta, color: tema.colores.primario, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  progresoNota: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, flex: 1 },
  plazo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plazoTexto: { ...tema.tipografia.etiqueta, color: tema.colores.terciario },
  pieCurso: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  montoGrande: { fontSize: 24, fontWeight: '800', color: tema.colores.texto },
  montoNota: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  botonCuotas: { minHeight: 46, paddingHorizontal: 18 },
});
