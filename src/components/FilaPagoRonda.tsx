/** Fila de un participante dentro del detalle de ronda (pagó / pendiente / atrasado). */
import { StyleSheet, Text, View } from 'react-native';
import type { PagoVista } from '../controllers/rondaController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { fechaCorta, formatearLempiras, iniciales } from '../utils/formato';
import { Boton } from './Boton';
import { Icono } from './Icono';
import { InsigniaEstado } from './InsigniaEstado';

interface Props {
  pago: PagoVista;
  cuota: number;
  numeroRonda: number;
  /** Muestra los botones de acción (solo en la ronda en curso) */
  accionable: boolean;
  onRegistrar: () => void;
  onRecordar: () => void;
  /** true cuando la ronda ya se cerró: el botón dice "Pago tardío" */
  tardio?: boolean;
  /** Abre la foto del comprobante (solo si el pago tiene) */
  onVerComprobante?: () => void;
}

export function FilaPagoRonda({
  pago, cuota, numeroRonda, accionable, onRegistrar, onRecordar, onVerComprobante, tardio = false,
}: Props) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const c = tema.colores;
  return (
    <View style={[styles.tarjeta, tema.sombras.nivel1]}>
      <View style={styles.fila}>
        <View>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{iniciales(pago.nombre)}</Text>
          </View>
          <View style={styles.turno}>
            <Text style={styles.turnoTexto}>{String(pago.turno).padStart(2, '0')}</Text>
          </View>
        </View>

        <View style={styles.flex}>
          <View style={styles.filaNombre}>
            <Text style={styles.nombre} numberOfLines={1}>{pago.nombre}</Text>
            {pago.esMio && (
              <View style={styles.chipTu}>
                <Text style={styles.chipTuTexto}>Tú</Text>
              </View>
            )}
          </View>
          {pago.pagado ? (
            <View style={styles.detalle}>
              <Icono name="checkmark-circle-outline" size={14} color={c.pagadoTexto} />
              <Text style={[styles.detalleTexto, { color: c.pagadoTexto }]}>
                Pagó {formatearLempiras(pago.monto ?? cuota)}
                {pago.fechaPago ? ` • ${fechaCorta(pago.fechaPago)}` : ''}
                {pago.metodo ? ` • ${pago.metodo}` : ''}
                {pago.recargo > 0 ? ` • Recargo ${formatearLempiras(pago.recargo)}` : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.detalle}>
              <Icono name="time-outline" size={14} color={pago.estado === 'atrasado' ? c.atrasadoTexto : c.pendienteTexto} />
              <Text
                style={[
                  styles.detalleTexto,
                  { color: pago.estado === 'atrasado' ? c.atrasadoTexto : c.pendienteTexto },
                ]}
              >
                Debe {formatearLempiras(cuota)}
                {pago.recargoPendiente > 0 ? ` + ${formatearLempiras(pago.recargoPendiente)} de recargo` : ''} • Cuota #{numeroRonda}
              </Text>
            </View>
          )}
        </View>

        <InsigniaEstado
          estado={pago.estado === 'pagado' ? 'pagado' : pago.estado}
          texto={pago.estado === 'pagado' ? 'Pagado' : pago.estado === 'atrasado' ? 'Atrasado' : 'Pendiente'}
        />
      </View>

      {pago.pagado && pago.tieneComprobante && onVerComprobante && (
        <View style={styles.botones}>
          <Boton
            titulo="Ver comprobante"
            iconoIzquierda="image-outline"
            variante="secundario"
            onPress={onVerComprobante}
            estilo={styles.boton}
          />
        </View>
      )}

      {!pago.pagado && accionable && (
        <View style={styles.botones}>
          <Boton
            titulo={tardio ? 'Pago tardío' : 'Registrar pago'}
            iconoIzquierda="receipt-outline"
            variante="secundario"
            onPress={onRegistrar}
            estilo={styles.boton}
          />
          <Boton
            titulo="Recordar"
            iconoIzquierda="chatbubble-ellipses-outline"
            onPress={onRecordar}
            estilo={styles.boton}
          />
        </View>
      )}
    </View>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  tarjeta: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.bordeSuave, gap: 12,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: tema.colores.superficieAlta,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.texto },
  turno: {
    position: 'absolute', top: -4, left: -4, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 4,
    backgroundColor: tema.colores.superficieMedia, borderWidth: 2, borderColor: tema.colores.superficie,
    justifyContent: 'center', alignItems: 'center',
  },
  turnoTexto: { ...tema.tipografia.etiquetaSm, fontSize: 9, color: tema.colores.textoSecundario },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: { ...tema.tipografia.encabezadoSm, color: tema.colores.texto, flexShrink: 1 },
  chipTu: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: tema.radio.pildora, backgroundColor: tema.colores.secundarioContenedor },
  chipTuTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.sobreSecundarioContenedor },
  detalle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  detalleTexto: { ...tema.tipografia.etiqueta, flexShrink: 1 },
  botones: {
    flexDirection: 'row', gap: 10, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: tema.colores.superficieMedia,
  },
  boton: { flex: 1, minHeight: 46, paddingHorizontal: 8 },
});
